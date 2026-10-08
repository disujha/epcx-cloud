import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EPCX Cloud | Field Execution & Project Records",
    short_name: "EPCX Cloud",
    description: "Field records for EPC and industrial construction — drawings, DPR, site photos, and reports.",
    start_url: "/start",
    display: "standalone",
    background_color: "#0f1f1a",
    theme_color: "#0e5549",
    orientation: "any",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Drawing Workbench",
        short_name: "Drawings",
        description: "Open drawing workbench and revision tracking",
        url: "/start?view=drawings",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Daily DPR",
        short_name: "DPR",
        description: "Update and monitor Daily Progress Reports",
        url: "/start?view=dpr",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Site Photos",
        short_name: "Photos",
        description: "Capture and upload site execution photos",
        url: "/start?view=photos",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Project Reports",
        short_name: "Reports",
        description: "View project registers and reports",
        url: "/start?view=reports",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
