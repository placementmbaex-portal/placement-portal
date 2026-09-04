import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // CV and JD uploads go through server actions and are capped at 2MB
      // client- and server-side; the default 1MB action body limit would
      // otherwise reject them before that check even runs.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
