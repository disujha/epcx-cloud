# EPCX.cloud

> Practical EPC workflows for work orders and RA bill preparation and checking.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.10 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Auth | Firebase Authentication |
| Database | Firebase Firestore |
| Storage | Firebase Storage |
| Document analysis | No production AI provider is configured; BillCheck uses deterministic calculations and reconciliation |
| Deployment | Vercel (configured, not yet deployed) |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your Firebase credentials:

```bash
cp .env.local.example .env.local
```

The `.env.local` file is already pre-configured for the `epcxsite` Firebase project.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, Register pages
│   ├── (dashboard)/      # Protected dashboard pages
│   ├── (marketing)/      # Public marketing pages
│   ├── layout.tsx        # Root layout with providers
│   ├── sitemap.ts        # SEO sitemap
│   └── robots.ts         # robots.txt
├── components/
│   ├── marketing/        # All marketing page components
│   ├── dashboard/        # Dashboard UI components
│   └── providers/        # ThemeProvider, etc.
├── contexts/
│   └── AuthContext.tsx   # Firebase auth state
├── lib/
│   ├── firebase/         # Firebase config, auth, firestore, storage
│   ├── ai/               # Provider interface and an explicit mock demo provider
│   │   ├── types.ts      # Shared interfaces
│   │   ├── mock-provider.ts  # Fabricated demo responses; not production analysis
│   │   └── index.ts      # Factory — swap providers here
│   ├── fonts.ts          # Inter font config
│   └── utils.ts          # Utility functions
├── types/
│   └── firebase.ts       # TypeScript interfaces for all Firestore collections
└── middleware.ts          # Route protection (renamed to proxy.ts for Next.js 16)
```

---

## Firebase Collections

| Collection | Description |
|-----------|-------------|
| `users` | User profiles linked to Firebase Auth UID |
| `organizations` | Team/company accounts with member lists |
| `projects` | Engineering projects grouping documents |
| `documents` | Document metadata (file stored in Storage) |
| `reviews` | AI review sessions and message history |
| `settings` | Per-user preferences |

---

## BillCheck

BillCheck adds organization-scoped work orders, contract items, client line lists, RA cycles, import batches, confirmed line aliases, and a billing ledger under:

```text
organizations/{organizationId}/billcheckContracts/{contractId}
```

Organization admins can assign member access from **BillCheck → Work Orders**. Organization members can review records; admins and assigned BillCheck editors can import or update them. Imported workbooks and CSVs are stored privately under the organization in Firebase Storage. XLSX and CSV/TSV imports are limited to 10 MB and use column mapping rather than a fixed template.

The first slice supports editable work-order items, client line import, previous/opening billing, current progress, deterministic normalization and reconciliation, exception review, and Excel export. PDF extraction and AI matching are not part of this release.

Firebase deployment files live in the separate admin app. Deploy Firestore and Storage rules from `D:\Apps\epcx-cloud-admin` after reviewing the target Firebase project and current rules:

```powershell
Set-Location D:\Apps\epcx-cloud-admin
firebase deploy --only firestore:rules,storage --project epcxsite
```

The app still needs its existing Firebase client configuration before sign-in, live data access, and a complete production build can be validated.

## Connecting a Real AI Provider

The AI layer is fully provider-agnostic. To connect a real provider, edit `src/lib/ai/index.ts`:

```typescript
case "openai":
  // Install: npm install openai
  // Set env: OPENAI_API_KEY=sk-...
  return new OpenAIProvider({ model: "gpt-4o" });

case "claude":
  // Install: npm install @anthropic-ai/sdk
  // Set env: ANTHROPIC_API_KEY=sk-ant-...
  return new ClaudeProvider({ model: "claude-3-5-sonnet-20241022" });

case "gemini":
  // Install: npm install @google/generative-ai
  // Set env: GEMINI_API_KEY=...
  return new GeminiProvider({ model: "gemini-2.0-flash" });

case "local":
  // Point to Ollama or LM Studio endpoint
  return new LocalProvider({ endpoint: "http://localhost:11434" });
```

---

## Firebase Setup

The customer app uses the shared Firebase project for sign-in, Firestore, Storage, and callable Functions. The trusted Functions source, Firestore/Storage rules, indexes, and Firebase deployment configuration are maintained in `D:\Apps\epcx-cloud-admin`; the customer app calls those deployed services but does not own their deployment files.

To deploy backend changes, review the source from the admin app and run the relevant Firebase deployment command there.

---

## Deployment (Vercel)

```bash
npx vercel
```

Set the following environment variables in the Vercel dashboard:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

---

## EPC task readiness

- **RA bill preparation/checking:** available to signed-in organization users in BillCheck. It imports XLSX, CSV, and TSV files up to 10 MB, maps rows for review, then uses deterministic line matching, reconciliation, and quantity × rate calculations. It does not use Gemini or another AI provider.
- **Manual work-order setup and BOQ import:** available inside BillCheck. Document extraction into a draft scope/BOQ is not implemented.
- **TBT register, drawing material extraction, fit-up photo review, and welding photo review:** coming soon; there are no upload or analysis endpoints for these tasks.

The drawing task uses the descriptive name “Drawing extraction: material items” until EPCX confirms whether its users intend MTO/takeoff, MIV, or another output. There are no representative PDF, DOCX, or XLSX EPC sample documents in this repository, so no extraction schema or accuracy claim is based on customer documents. No production Gemini adapter is installed or configured.

---

## Account-free RA bill trials

Guest RA bill processing is intentionally disabled. The public task selector sends RA users to authenticated BillCheck, where the existing work-order, BOQ import, reconciliation, and review flow runs. BillCheck accepts XLSX, CSV, and TSV imports up to 10 MB and stores source files under the signed-in organization's private Storage path. Its calculations and reconciliation are deterministic; this workflow does not send the files to a paid AI provider.

The application does not currently include a trusted server-side job API, Firebase Admin SDK setup, anonymous quota/rate-limit store, isolated guest storage, or a scheduled Storage cleanup worker. Client cookies or local storage would not safely enforce a visitor allowance, and Firestore TTL alone would not delete Storage objects. Do not enable guest uploads until deployment includes:

1. A trusted server endpoint that validates file size and content, atomically counts accepted attempts and completed jobs, enforces per-visitor rate limits, and reuses job IDs for safe retries.
2. An isolated private guest job store and Storage prefix that cannot read or write organization records.
3. A deployed scheduled cleanup job that deletes both temporary Storage objects and guest result records after a published retention period, with failures monitored.
4. A configured server-side processing path that reuses BillCheck's deterministic import and reconciliation logic without creating official organization records until a signed-in person confirms them.

Until those controls are deployed and verified, the task selector must continue to state that guest processing is unavailable and must direct users to signed-in BillCheck. Organization import files have no automatic expiration policy or self-service cleanup flow in the app; retention must be managed through authorized Firebase operations.
