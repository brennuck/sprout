import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sprout Budget",
    short_name: "Sprout",
    description: "Give every dollar a job with envelope budgets, sinking funds, and goals.",
    id: "/dashboard",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#faf9f5",
    theme_color: "#536345",
    orientation: "portrait-primary",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/192?maskable=1", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Add expense", url: "/dashboard?add=expense", description: "Log what you just spent" },
      { name: "Plan", url: "/budgets", description: "Assign money to envelopes" },
    ],
  };
}
