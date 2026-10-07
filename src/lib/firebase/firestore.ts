import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  arrayUnion,
  setDoc,
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
  ProjectRole,
  ProjectInvitation,
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

export async function saveProfessionalProfile(uid: string, data: Partial<UserProfile> & { email: string; displayName: string }) {
  const exists = await getDoc(doc(db, "users", uid));
  return setDoc(doc(db, "users", uid), {
    uid,
    ...data,
    updatedAt: serverTimestamp(),
    ...(!exists.exists() ? { createdAt: serverTimestamp() } : {}),
  }, { merge: true });
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function getUserProjects(uid: string): Promise<Project[]> {
  const ref = collection(db, "projects");
  const [owned, member] = await Promise.all([
    getDocs(query(ref, where("ownerId", "==", uid))),
    getDocs(query(ref, where("memberIds", "array-contains", uid))),
  ]);
  const unique = new Map<string, Project>();
  for (const snap of [...owned.docs, ...member.docs]) unique.set(snap.id, { id: snap.id, ...snap.data() } as Project);
  return [...unique.values()].sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
}

export async function createProject(data: { name: string; ownerId: string } & Partial<Omit<Project, "id" | "name" | "ownerId" | "createdAt" | "updatedAt">>) {
  const ref = doc(collection(db, "projects"));
  await setDoc(ref, {
    ...data,
    memberIds: [data.ownerId],
    members: { [data.ownerId]: "project_admin" },
    status: data.status ?? "active",
    documentCount: 0,
    tags: [],
    industry: "other",
    createdBy: data.ownerId,
    updatedBy: data.ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref;
}

export async function createOrganization(input: { name: string; companyDetails?: string; logoURL?: string; uid: string }) {
  const ref = doc(collection(db, "organizations"));
  await setDoc(ref, {
    name: input.name.trim(), companyDetails: input.companyDetails ?? "", logoURL: input.logoURL ?? "",
    memberIds: [input.uid], adminIds: [input.uid], plan: "starter", industry: "other",
    settings: { privateDeployment: false, maxDocuments: 1000, maxStorage: 10 },
    createdBy: input.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return ref;
}

export async function createProjectInvitation(input: { project: Project; email: string; role: ProjectRole; invitedBy: string; organizationName?: string }) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const ref = doc(collection(db, "projectInvitations"));
  await setDoc(ref, {
    projectId: input.project.id, projectName: input.project.name,
    organizationId: input.project.organizationId ?? "", organizationName: input.organizationName ?? "",
    email: normalizedEmail, role: input.role, invitedBy: input.invitedBy,
    status: "pending", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getPendingProjectInvitations(email: string): Promise<ProjectInvitation[]> {
  return getDocuments<ProjectInvitation>("projectInvitations", where("email", "==", email.trim().toLowerCase()), where("status", "==", "pending"));
}

export async function acceptProjectInvitation(invitation: ProjectInvitation, uid: string) {
  const batch = (await import("firebase/firestore")).writeBatch(db);
  batch.update(doc(db, "projects", invitation.projectId), {
    memberIds: arrayUnion(uid), [`members.${uid}`]: invitation.role,
    updatedAt: serverTimestamp(), updatedBy: uid, acceptedInvitationId: invitation.id,
  });
  batch.update(doc(db, "projectInvitations", invitation.id), { status: "accepted", acceptedBy: uid, updatedAt: serverTimestamp() });
  await batch.commit();
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
    createdBy: data.uploadedBy,
    updatedBy: data.uploadedBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateDocumentStatus(
  docId: string,
  status: EPCDocument["status"],
  updatedBy?: string
) {
  return updateDoc(doc(db, "documents", docId), {
    status,
    ...(updatedBy ? { updatedBy } : {}),
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
    createdBy: data.userId,
    updatedBy: data.userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateReview(reviewId: string, data: Partial<Review>, updatedBy?: string) {
  return updateDoc(doc(db, "reviews", reviewId), {
    ...data,
    ...(updatedBy ? { updatedBy } : {}),
    updatedAt: serverTimestamp(),
  });
}

export { serverTimestamp, where, orderBy, limit };
