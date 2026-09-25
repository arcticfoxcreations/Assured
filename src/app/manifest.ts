import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: publicEnv.appName,
    short_name: publicEnv.appName,
    description: "Your safety assurance.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f7f3",
    theme_color: "#527461",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
