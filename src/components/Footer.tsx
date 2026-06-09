import pkg from "../../package.json";

/**
 * Футер сайта: версия + дата деплоя слева, Telegram-контакт справа.
 * BUILD_DATE прописывается в shared/.env при каждом деплое (deploy.sh).
 */
export default function Footer() {
  const version = `v${pkg.version}`;
  const buildDate = process.env.BUILD_DATE;

  return (
    <footer className="border-t border-stone-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-4xl items-center justify-between text-xs text-stone-400">
        <span>
          {version}
          {buildDate ? ` · ${buildDate}` : ""}
        </span>
        <a
          href="https://t.me/Zarik12345"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-stone-600"
        >
          @Zarik12345
        </a>
      </div>
    </footer>
  );
}
