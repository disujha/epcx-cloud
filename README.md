# EPCX.cloud

> **AI Decision Intelligence for EPC Contractors**  
> Helping engineering teams make faster, safer and more informed decisions using AI.

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
| AI Layer | Provider-agnostic adapter (mock, OpenAI, Claude, Gemini, local) |
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
│   ├── ai/               # Provider-agnostic AI adapter
│   │   ├── types.ts      # Shared interfaces
│   │   ├── mock-provider.ts  # Demo AI (no API key needed)
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

Security rules are in:
- `firestore.rules` — Firestore access rules
- `storage.rules` — Storage upload/download rules
- `firestore.indexes.json` — Composite indexes

To deploy rules:
```bash
npx -y firebase-tools@latest use epcxsite
npx -y firebase-tools@latest deploy --only firestore:rules,storage
```

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
