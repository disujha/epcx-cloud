import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type StorageReference,
} from "firebase/storage";
import { storage } from "./config";

export interface UploadProgress {
  progress: number;
  downloadURL?: string;
  error?: Error;
}

export function uploadDocument(
  file: File,
  uid: string,
  projectId: string | null,
  onProgress: (progress: UploadProgress) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = projectId
      ? `documents/${uid}/${projectId}/${timestamp}_${safeName}`
      : `documents/${uid}/${timestamp}_${safeName}`;

    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
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
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        onProgress({ progress: 100, downloadURL });
        resolve(downloadURL);
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
