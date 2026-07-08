import { type FieldValue, type Timestamp } from "firebase/firestore";

export type FirestoreTimestamp = Timestamp | FieldValue | Date | null;

// ─── User Profile ──────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  organizationId?: string;
  role: "admin" | "engineer" | "viewer";
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ─── Organization ──────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  industry: Industry;
  plan: "starter" | "professional" | "enterprise";
  memberIds: string[];
  adminIds: string[];
  settings: OrganizationSettings;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface OrganizationSettings {
  aiProvider?: "openai" | "claude" | "gemini" | "local" | "mock";
  privateDeployment: boolean;
  maxDocuments: number;
  maxStorage: number; // GB
}

// ─── Project ───────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  organizationId?: string;
  industry: Industry;
  status: "active" | "archived" | "completed";
  documentCount: number;
  tags: string[];
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ─── Document ──────────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  name: string;
  originalName: string;
  description?: string;
  fileType: "pdf" | "docx" | "xlsx" | "dwg" | "other";
  fileSize: number; // bytes
  downloadURL: string;
  storagePath: string;
  status: DocumentStatus;
  projectId?: string;
  uploadedBy: string;
  organizationId?: string;
  tags: string[];
  metadata?: DocumentMetadata;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export type DocumentStatus = "uploaded" | "processing" | "completed" | "reviewed" | "error";

export interface DocumentMetadata {
  pageCount?: number;
  revision?: string;
  discipline?: string;
  documentNumber?: string;
  title?: string;
}

// ─── Review ────────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  title: string;
  documentId: string;
  documentName: string;
  userId: string;
  organizationId?: string;
  projectId?: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  aiProvider: "openai" | "claude" | "gemini" | "local" | "mock";
  messages: ReviewMessage[];
  summary?: string;
  findings?: ReviewFinding[];
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface ReviewMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: FirestoreTimestamp;
}

export interface ReviewFinding {
  id: string;
  type: "risk" | "compliance" | "action" | "info";
  severity: "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  page?: number;
  section?: string;
}

// ─── Settings ──────────────────────────────────────────────────────────────────

export interface Settings {
  id: string;
  userId: string;
  theme: "light" | "dark" | "system";
  notifications: NotificationSettings;
  aiPreferences: AIPreferences;
  updatedAt: FirestoreTimestamp;
}

export interface NotificationSettings {
  email: boolean;
  reviewComplete: boolean;
  documentProcessed: boolean;
  weeklyReport: boolean;
}

export interface AIPreferences {
  defaultProvider: "openai" | "claude" | "gemini" | "local" | "mock";
  defaultModel?: string;
  temperature?: number;
  maxTokens?: number;
}

// ─── Industry ──────────────────────────────────────────────────────────────────

export type Industry =
  | "oil_gas"
  | "petrochemical"
  | "refinery"
  | "power"
  | "infrastructure"
  | "heavy_fabrication"
  | "pipeline"
  | "shutdown"
  | "other";

export const INDUSTRY_LABELS: Record<Industry, string> = {
  oil_gas: "Oil & Gas",
  petrochemical: "Petrochemical",
  refinery: "Refinery",
  power: "Power",
  infrastructure: "Infrastructure",
  heavy_fabrication: "Heavy Fabrication",
  pipeline: "Pipeline",
  shutdown: "Shutdown Projects",
  other: "Other",
};
