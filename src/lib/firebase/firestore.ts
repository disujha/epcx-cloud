import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "./config";
import type {
  UserProfile,
  Project,
  Document as EPCDocument,
  Review,
  Organization,
} from "@/types/firebase";

// ─── Generic Helpers ──────────────────────────────────────────────────────────

export async function getDocument<T>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  const ref = doc(db, collectionName, docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T;
}

export async function getDocuments<T>(
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const ref = collection(db, collectionName);
  const q = query(ref, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  return getDocument<UserProfile>("users", uid);
}

export async function createUserProfile(
  uid: string,
  data: Omit<UserProfile, "id" | "createdAt" | "updatedAt">
) {
  return updateDoc(doc(db, "users", uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).catch(() =>
    addDoc(collection(db, "users"), {
      ...data,
      uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
}

export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
) {
  return updateDoc(doc(db, "users", uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function getUserProjects(uid: string): Promise<Project[]> {
  return getDocuments<Project>(
    "projects",
    where("ownerId", "==", uid),
    orderBy("createdAt", "desc")
  );
}

export async function createProject(data: Omit<Project, "id" | "createdAt" | "updatedAt">) {
  return addDoc(collection(db, "projects"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateProject(projectId: string, data: Partial<Project>) {
  return updateDoc(doc(db, "projects", projectId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProject(projectId: string) {
  return deleteDoc(doc(db, "projects", projectId));
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function getUserDocuments(uid: string): Promise<EPCDocument[]> {
  return getDocuments<EPCDocument>(
    "documents",
    where("uploadedBy", "==", uid),
    orderBy("createdAt", "desc"),
    limit(50)
  );
}

export async function getProjectDocuments(projectId: string): Promise<EPCDocument[]> {
  return getDocuments<EPCDocument>(
    "documents",
    where("projectId", "==", projectId),
    orderBy("createdAt", "desc")
  );
}

export async function createDocument(
  data: Omit<EPCDocument, "id" | "createdAt" | "updatedAt">
) {
  return addDoc(collection(db, "documents"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateDocumentStatus(
  docId: string,
  status: EPCDocument["status"]
) {
  return updateDoc(doc(db, "documents", docId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function getUserReviews(uid: string): Promise<Review[]> {
  return getDocuments<Review>(
    "reviews",
    where("userId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(20)
  );
}

export async function createReview(data: Omit<Review, "id" | "createdAt" | "updatedAt">) {
  return addDoc(collection(db, "reviews"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateReview(reviewId: string, data: Partial<Review>) {
  return updateDoc(doc(db, "reviews", reviewId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export { serverTimestamp, where, orderBy, limit };
