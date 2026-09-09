import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The logo version is intentional: it gives browsers a new optimized image
    // URL whenever the source file is replaced, without permitting arbitrary
    // local-image query strings.
    localPatterns: [
      {
        pathname: "/images/ng-studio.png",
        search: "?v=20260909-2",
      },
    ],
  },
};

export default nextConfig;
