import type { Metadata } from "next";
import { inter, interTight } from "@/lib/fonts";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://epcx.cloud"),
  title: {
    default: "EPCX.cloud — AI Decision Intelligence for EPC Contractors",
    template: "%s | EPCX.cloud",
  },
  description:
    "Helping engineering teams make faster, safer and more informed decisions using AI. Review documents, compare specifications, identify risks and automate engineering workflows.",
  keywords: [
    "EPC AI",
    "engineering AI",
    "document review",
    "specification comparison",
    "engineering decision intelligence",
    "EPC contractor software",
    "engineering document management",
    "AI for oil and gas",
    "petrochemical AI",
    "refinery software",
  ],
  authors: [{ name: "EPCX.cloud" }],
  creator: "EPCX.cloud",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://epcx.cloud",
    siteName: "EPCX.cloud",
    title: "EPCX.cloud — AI Decision Intelligence for EPC Contractors",
    description:
      "Helping engineering teams make faster, safer and more informed decisions using AI.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "EPCX.cloud — Engineering AI Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EPCX.cloud — AI Decision Intelligence for EPC Contractors",
    description:
      "Helping engineering teams make faster, safer and more informed decisions using AI.",
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
      className={`${inter.variable} ${interTight.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
