import AuthForm from "@/components/AuthForm";
import { GAME_NAME, SERVICE_NAME } from "@/config/game";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            {SERVICE_NAME}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Координация команд игры «{GAME_NAME}»
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <AuthForm />
        </div>
        <p className="mt-4 text-center text-xs text-stone-400">
          Планируйте визиты по городам и находите команды для коллабораций.
        </p>
      </div>
    </div>
  );
}
