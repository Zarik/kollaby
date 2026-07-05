"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { jsonFetch } from "@/lib/client";
import PasswordInput from "@/components/PasswordInput";

/** Форма нового пароля по токену из письма сброса. */
export default function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== passwordConfirm) {
      setError("Пароли не совпадают");
      return;
    }
    setLoading(true);
    try {
      await jsonFetch("/api/auth/reset", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      // Сервер сразу залогинил — идём в сервис.
      router.push("/plan");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-stone-600">
          В ссылке нет токена сброса. Откройте ссылку из письма целиком или
          запросите сброс пароля ещё раз.
        </p>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          ← На страницу входа
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">
          Новый пароль
        </label>
        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder="не короче 6 символов"
          required
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">
          Повторите пароль
        </label>
        <PasswordInput
          value={passwordConfirm}
          onChange={setPasswordConfirm}
          placeholder="ещё раз тот же пароль"
          required
          autoComplete="new-password"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white
                   hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50
                   disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Подождите…" : "Сохранить и войти"}
      </button>
    </form>
  );
}
