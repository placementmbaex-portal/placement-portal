import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MBAEx Placements",
    short_name: "MBAEx",
    description: "IIM Calcutta MBAEx placement portal",
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAF8",
    theme_color: "#014488",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
