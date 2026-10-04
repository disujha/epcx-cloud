import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  getAdditionalUserInfo,
  signInAnonymously,
  linkWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "./config";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  return result;
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const profileName = getAdditionalUserInfo(result)?.profile?.name;
  if (!result.user.displayName && typeof profileName === "string" && profileName.trim()) {
    await updateProfile(result.user, { displayName: profileName.trim() });
  }
  return result;
}

export async function ensureAnonymousSession() {
  return auth.currentUser ?? (await signInAnonymously(auth)).user;
}

export async function linkCurrentUserWithGoogle() {
  const user = auth.currentUser;
  if (!user) throw new Error("Start a drawing session before linking Google.");
  if (!user.isAnonymous) return user;
  return (await linkWithPopup(user, googleProvider)).user;
}

export async function signOut() {
  return firebaseSignOut(auth);
}

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export type { User };
