import { Suspense } from "react";
import ResetForm from "@/components/ResetForm";
import { GAME_NAME, SERVICE_NAME } from "@/config/game";

export const metadata = {
  title: `Сброс пароля · ${SERVICE_NAME}`,
};

/** Страница установки нового пароля по ссылке из письма (?token=...). */
export default function ResetPage() {
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
          <h2 className="mb-4 text-lg font-semibold text-stone-900">Новый пароль</h2>
          <Suspense>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
