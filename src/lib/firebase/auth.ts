import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  linkWithRedirect,
  getAdditionalUserInfo,
  signInAnonymously,
  linkWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
  type UserCredential,
} from "firebase/auth";
import { auth } from "./config";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export function isMobileDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isTouch = (navigator.maxTouchPoints || 0) > 0;
  return mobileRegex.test(ua) || (isTouch && window.innerWidth <= 768);
}

export function getFriendlyAuthErrorMessage(err: unknown): string {
  if (!err) return "Authentication failed. Please try again.";
  const authErr = err as { code?: string; message?: string };
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";

  switch (authErr.code) {
    case "auth/unauthorized-domain":
      return `Domain "${hostname}" is not authorized for OAuth in Firebase. Please add "${hostname}" to Authorized Domains in Firebase Console (Authentication > Settings > Authorized domains).`;
    case "auth/popup-blocked":
      return "The sign-in pop-up was blocked by your browser. Please allow popups or try again.";
    case "auth/popup-closed-by-user":
      return "The sign-in window was closed before completion. Please try again.";
    case "auth/cancelled-popup-request":
      return "Sign-in request was cancelled. Please try again.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    case "auth/operation-not-allowed":
      return "Google Sign-In is not enabled in Firebase Console. Please enable it under Authentication > Sign-in providers.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Invalid email or password.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    default:
      if (typeof authErr.message === "string" && authErr.message) {
        return authErr.message;
      }
      return "Sign in failed. Please try again.";
  }
}

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

export async function signInWithGoogle(): Promise<UserCredential | void> {
  // On mobile browsers (like Chrome on Android or Safari on iOS), signInWithPopup is
  // frequently blocked or breaks tab communication. Use signInWithRedirect for reliability.
  if (isMobileDevice()) {
    return signInWithRedirect(auth, googleProvider);
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const profileName = getAdditionalUserInfo(result)?.profile?.name;
    if (!result.user.displayName && typeof profileName === "string" && profileName.trim()) {
      await updateProfile(result.user, { displayName: profileName.trim() });
    }
    return result;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    // Fallback to redirect if popup is blocked by the browser
    if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
      return signInWithRedirect(auth, googleProvider);
    }
    throw err;
  }
}

export async function ensureAnonymousSession() {
  return auth.currentUser ?? (await signInAnonymously(auth)).user;
}

export async function linkCurrentUserWithGoogle(): Promise<User | void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Start a drawing session before linking Google.");
  if (!user.isAnonymous) return user;

  if (isMobileDevice()) {
    await linkWithRedirect(user, googleProvider);
    return;
  }

  try {
    return (await linkWithPopup(user, googleProvider)).user;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
      await linkWithRedirect(user, googleProvider);
      return;
    }
    throw err;
  }
}

export async function signOut() {
  return firebaseSignOut(auth);
}

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export type { User };
