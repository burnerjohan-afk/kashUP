import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Éviter le warning "multiple lockfiles" en monorepo
  turbopack: { root: process.cwd() },
};

export default nextConfig;
