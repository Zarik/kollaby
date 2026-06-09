"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { jsonFetch } from "@/lib/client";
import PasswordInput from "@/components/PasswordInput";

type Mode = "login" | "register";

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 " +
  "placeholder-stone-400 focus:border-indigo-500 focus:outline-none focus:ring-2 " +
  "focus:ring-indigo-500/20 transition-colors";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // поля
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [telegram, setTelegram] = useState("");
  const [maxLink, setMaxLink] = useState("");
  const [consent, setConsent] = useState(false);
  const [rules, setRules] = useState(false);

  function redirectTarget(): string {
    if (typeof window === "undefined") return "/plan";
    return new URLSearchParams(window.location.search).get("next") || "/plan";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "register" && password !== passwordConfirm) {
      setError("Пароли не совпадают");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await jsonFetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ number: number.trim(), password }),
        });
      } else {
        await jsonFetch("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            number: number.trim(),
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            telegram: telegram.trim(),
            maxLink: maxLink.trim(),
            password,
            consent,
            rules,
          }),
        });
      }
      router.push(redirectTarget());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-5 flex rounded-lg bg-stone-100 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => { setMode("login"); setError(""); }}
          className={`flex-1 rounded-md px-3 py-2 transition-colors ${
            mode === "login" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
          }`}
        >
          Вход
        </button>
        <button
          type="button"
          onClick={() => { setMode("register"); setError(""); }}
          className={`flex-1 rounded-md px-3 py-2 transition-colors ${
            mode === "register" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
          }`}
        >
          Регистрация
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">
            Номер команды
          </label>
          <input
            className={inputClass}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="например, 42"
            autoFocus
            required
          />
        </div>

        {mode === "register" && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Название команды
              </label>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Бегущие по граблям"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Email</label>
              <input
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="team@example.ru"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Телефон</label>
              <input
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 900 000-00-00"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Telegram <span className="font-normal text-stone-400">(необязательно)</span>
              </label>
              <input
                className={inputClass}
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="@account"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                MAX <span className="font-normal text-stone-400">(необязательно)</span>
              </label>
              <input
                className={inputClass}
                value={maxLink}
                onChange={(e) => setMaxLink(e.target.value)}
                placeholder="https://max.ru/u/…"
              />
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Пароль</label>
          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder={mode === "register" ? "не короче 6 символов" : ""}
            required
            autoComplete={mode === "register" ? "new-password" : "current-password"}
          />
        </div>

        {mode === "register" && (
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
        )}

        {mode === "register" && (
          <div className="space-y-2 pt-1">
            <label className="flex items-start gap-2 text-sm text-stone-600">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500"
                checked={rules}
                onChange={(e) => setRules(e.target.checked)}
              />
              <span>Я ознакомился(ась) с правилами игры и сервиса.</span>
            </label>
            <label className="flex items-start gap-2 text-sm text-stone-600">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                Согласен(на) показывать контакты команды (email, телефон, Telegram,
                MAX) другим участникам для договорённости о коллаборации.
              </span>
            </label>
          </div>
        )}

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
          {loading
            ? "Подождите…"
            : mode === "login"
              ? "Войти"
              : "Зарегистрироваться"}
        </button>
      </form>
    </div>
  );
}
