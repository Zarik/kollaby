import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 — нативный модуль, его нельзя бандлить серверным сборщиком
  serverExternalPackages: ["better-sqlite3"],
  // Standalone-сборка для деплоя: создаёт .next/standalone/server.js
  output: "standalone",
  // Проверку типов гоняют CI (.github/workflows/ci.yml) и локальный
  // npm run typecheck. На проде (2 ГБ RAM) этап "Running TypeScript"
  // не влезает в память и next build падает по OOM — поэтому здесь
  // он выключен. Линт в next build 16 не входит, отдельно npm run lint.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
