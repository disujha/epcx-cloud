import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectWorkspaceProvider } from "@/contexts/ProjectWorkspaceContext";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ServiceNoticeBanner } from "@/components/marketing/ServiceNoticeBanner";
import "./globals.css";
import "./field-records.css";
import "./field-records-nav.css";
import "./field-record-manager.css";
import "./field-record-manager-overrides.css";
import "./marketing-home-refine.css";
import "./field-app-shell.css";
import "./public-home.css";
import "./field-workspace-home.css";
import "./field-work-register.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://epcx.cloud"),
  title: {
    default: "EPCX Cloud | EPC document workflows",
    template: "%s | EPCX.cloud",
  },
  description: "EPCX BillCheck helps organization members compare RA progress against work orders and review quantity checks.",
  keywords: [
    "EPC work orders",
    "RA bill checking",
    "BOQ reconciliation",
    "EPC contractor software",
    "BillCheck",
  ],
  authors: [{ name: "EPCX.cloud" }],
  creator: "EPCX.cloud",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://epcx.cloud",
    siteName: "EPCX.cloud",
    title: "EPCX Cloud | EPC document workflows",
    description: "EPCX BillCheck helps organization members compare RA progress against work orders and review quantity checks.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "EPCX Cloud EPC workflows",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EPCX Cloud | EPC document workflows",
    description: "EPCX BillCheck helps organization members compare RA progress against work orders and review quantity checks.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          <AuthProvider><ProjectWorkspaceProvider><ServiceNoticeBanner />{children}</ProjectWorkspaceProvider></AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
