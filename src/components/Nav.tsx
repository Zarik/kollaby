"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SERVICE_NAME } from "@/config/game";
import { jsonFetch } from "@/lib/client";

const LINKS = [
  { href: "/plan", label: "Планирование" },
  { href: "/now", label: "Кто здесь" },
  { href: "/team", label: "Команда" },
];

export default function Nav({
  teamNumber,
  teamName,
}: {
  teamNumber: string;
  teamName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    try {
      await jsonFetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* игнорируем */
    }
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-1 sm:gap-3">
          <span className="hidden font-semibold text-stone-900 sm:inline">
            {SERVICE_NAME}
          </span>
          <nav className="flex items-center gap-1">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-stone-500 sm:inline">
            №{teamNumber} · {teamName}
          </span>
          <button
            onClick={logout}
            className="rounded-md px-2.5 py-1.5 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-700"
          >
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}
