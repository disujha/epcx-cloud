import { getFunctions, httpsCallable } from "firebase/functions";
import app from "@/lib/firebase/config";

export type BillingStatus = "FREE" | "TRIALING" | "ACTIVE" | "PAYMENT_PENDING" | "PAYMENT_FAILED" | "PAST_DUE" | "CANCELLED" | "EXPIRED";
export type PlanId = "free" | "field" | "project" | "company";
export type Entitlements = {
  id: PlanId; name: string; amount: number; currency: "INR"; billingPeriod: "month"; active: boolean;
  projectLimit: number; memberLimit: number; drawingLimit: number; dprLimit: number; tbtLimit: number;
  photoLimit: number; workItemLimit: number; ocrLimit: number; exportLimit: number; historyDays: number;
  sharingEnabled: boolean; externalSharingEnabled: boolean; advancedReportsEnabled: boolean;
};
export type Usage = Partial<Record<"projects" | "members" | "drawings" | "dpr" | "tbt" | "photos" | "workItems" | "ocr" | "exports", number>>;
export type BillingOverview = {
  plans: Entitlements[]; currentPlan: Entitlements;
  subscription: { planId: PlanId; status: BillingStatus; pendingPlanId?: PlanId; currentPeriodStart?: number | null; currentPeriodEnd?: number | null };
  usage: Usage; history: Array<{ id: string; planId: PlanId; amount: number; currency: string; status: string; receipt?: string; createdAt?: { seconds: number } }>;
};
export type CheckoutSession = { subscriptionId: string; keyId: string; name: string; description: string; prefill: { email: string } };

const functions = getFunctions(app, "us-central1");
export async function getBillingOverview(projectId?: string) {
  const call = httpsCallable<{ projectId?: string }, BillingOverview>(functions, "getBillingOverview");
  return (await call(projectId ? { projectId } : {})).data;
}
export async function getPublicBillingPlans() {
  const call = httpsCallable<void, { plans: Entitlements[] }>(functions, "getPublicBillingPlans");
  return (await call()).data.plans;
}
export async function createBillingSubscription(planId: PlanId, projectId?: string) {
  const call = httpsCallable<{ planId: PlanId; projectId?: string }, CheckoutSession>(functions, "createBillingSubscription");
  return (await call({ planId, ...(projectId ? { projectId } : {}) })).data;
}
export async function confirmBillingSubscription(input: { subscriptionId: string; paymentId: string; signature: string }) {
  const call = httpsCallable<typeof input, { status: BillingStatus }>(functions, "confirmBillingSubscription");
  return (await call(input)).data;
}

let checkoutScript: Promise<void> | undefined;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (!checkoutScript) checkoutScript = new Promise((resolve, reject) => {
    const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.async = true;
    script.onload = () => resolve(); script.onerror = () => reject(new Error("Checkout could not load.")); document.body.appendChild(script);
  });
  return checkoutScript;
}
export async function openPlanCheckout(session: CheckoutSession, onVerified: () => Promise<void>, onFailure: (message: string) => void) {
  await loadCheckout();
  return new Promise<void>((resolve) => {
    const checkout = new window.Razorpay!({
      key: session.keyId, subscription_id: session.subscriptionId, name: session.name,
      description: session.description, prefill: session.prefill,
      handler: async (response) => {
        try {
          await confirmBillingSubscription({ subscriptionId: response.razorpay_subscription_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature });
          await onVerified();
        } catch { onFailure("Payment confirmation is pending. Your existing plan remains available while EPCX checks the payment."); await onVerified().catch(() => undefined); }
        resolve();
      },
      modal: { ondismiss: () => resolve() },
    });
    checkout.on("payment.failed", () => { onFailure("Payment wasn't completed. Your EPCX plan has not changed."); resolve(); });
    checkout.open();
  });
}

declare global {
  interface Window { Razorpay?: new (options: { key: string; subscription_id: string; name: string; description: string; prefill: { email: string }; handler: (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => void; modal: { ondismiss: () => void } }) => { open: () => void; on: (event: string, listener: () => void) => void } }
}
