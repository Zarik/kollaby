import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 — нативный модуль, его нельзя бандлить серверным сборщиком
  serverExternalPackages: ["better-sqlite3"],
  // Standalone-сборка для деплоя: создаёт .next/standalone/server.js
  output: "standalone",
};

export default nextConfig;
