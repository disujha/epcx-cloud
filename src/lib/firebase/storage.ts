import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  getMetadata,
  getBlob,
  listAll,
  deleteObject,
  type StorageReference,
} from "firebase/storage";
import { auth, storage } from "./config";

export interface UploadProgress {
  progress: number;
  downloadURL?: string;
  error?: Error;
}

export interface StoredDocument {
  name: string;
  fullPath: string;
  size: number;
  createdAt: string;
  contentType: string;
}

export async function listUserDocuments(uid: string): Promise<StoredDocument[]> {
  async function listFolder(folder: StorageReference): Promise<StoredDocument[]> {
    const result = await listAll(folder);
    const files = await Promise.all(result.items.map(async (item) => {
      const metadata = await getMetadata(item);
      return {
        name: metadata.customMetadata?.originalName ?? item.name,
        fullPath: item.fullPath,
        size: metadata.size,
        createdAt: metadata.timeCreated,
        contentType: metadata.contentType ?? "application/octet-stream",
      };
    }));
    const nested = await Promise.all(result.prefixes.map(listFolder));
    return [...files, ...nested.flat()];
  }

  return listFolder(ref(storage, `documents/${uid}`));
}

export async function downloadDocument(path: string): Promise<File> {
  const storageRef = ref(storage, path);
  const [blob, metadata] = await Promise.all([getBlob(storageRef), getMetadata(storageRef)]);
  const name = metadata.customMetadata?.originalName ?? storageRef.name;
  return new File([blob], name, { type: metadata.contentType ?? "application/octet-stream", lastModified: metadata.updated ? Date.parse(metadata.updated) : Date.now() });
}

export async function uploadDocument(
  file: File,
  uid: string,
  projectId: string | null,
  onProgress: (progress: UploadProgress) => void,
  options?: { contentType?: string; folder?: string; objectName?: string }
): Promise<string> {
  await auth.authStateReady();
  const activeUser = auth.currentUser;
  if (!activeUser || activeUser.uid !== uid) {
    throw Object.assign(new Error("The active Firebase user does not match the drawing owner."), { code: "auth/user-mismatch" });
  }
  await activeUser.getIdToken();

  const contentType = options?.contentType ?? file.type ?? "application/octet-stream";
  if (process.env.NODE_ENV === "development") {
    console.info("[EPCX Firebase upload]", {
      projectId: storage.app.options.projectId,
      storageBucket: storage.app.options.storageBucket,
      uid,
      authProvider: activeUser.isAnonymous ? "anonymous" : activeUser.providerData.map((provider) => provider.providerId),
      path: options?.folder
        ? `documents/${uid}/${options.folder}/${options.objectName ?? file.name}`
        : projectId
          ? `documents/${uid}/${projectId}/${file.name}`
          : `documents/${uid}/${file.name}`,
      contentType,
      sizeBytes: file.size,
    });
  }

  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const safeObjectName = options?.objectName?.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = options?.folder
      ? `documents/${uid}/${options.folder}/${safeObjectName ?? `${timestamp}_${safeName}`}`
      : projectId
        ? `documents/${uid}/${projectId}/${timestamp}_${safeName}`
        : `documents/${uid}/${timestamp}_${safeName}`;

    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType,
      customMetadata: {
        uploadedBy: uid,
        originalName: file.name,
      },
    });

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress({ progress });
      },
      (error) => {
        onProgress({ progress: 0, error });
        reject(error);
      },
      () => {
        void getDownloadURL(uploadTask.snapshot.ref)
          .then((downloadURL) => {
            onProgress({ progress: 100, downloadURL });
            resolve(downloadURL);
          })
          .catch((error: Error) => reject(error));
      }
    );
  });
}

export async function deleteDocument(path: string) {
  const storageRef = ref(storage, path);
  return deleteObject(storageRef);
}

export function getStorageRef(path: string): StorageReference {
  return ref(storage, path);
}
