"use client";

import { useEffect, useState, type FormEvent } from "react";
import { jsonFetch } from "@/lib/client";
import TeamPhoto from "@/components/TeamPhoto";

interface TeamData {
  number: string;
  name: string;
  email: string;
  phone: string;
  telegram: string;
  maxLink: string;
  contactsConsent: boolean;
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";
const card = "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm";

export default function TeamProfile() {
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [telegram, setTelegram] = useState("");
  const [maxLink, setMaxLink] = useState("");
  const [consent, setConsent] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    jsonFetch<{ team: TeamData }>("/api/team")
      .then(({ team }) => {
        setNumber(team.number);
        setName(team.name);
        setEmail(team.email);
        setPhone(team.phone);
        setTelegram(team.telegram);
        setMaxLink(team.maxLink);
        setConsent(team.contactsConsent);
        setLoaded(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Ошибка"));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    setSaving(true);
    try {
      await jsonFetch("/api/team", {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          telegram: telegram.trim(),
          maxLink: maxLink.trim(),
          consent,
          currentPassword: newPassword ? currentPassword : undefined,
          newPassword: newPassword || undefined,
        }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setOk("Сохранено.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded && !error) {
    return <p className="text-sm text-stone-400">Загрузка…</p>;
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <section className={card}>
        <h1 className="mb-1 text-lg font-semibold text-stone-900">Команда</h1>
        <p className="mb-3 text-sm text-stone-500">
          Номер команды (логин): <b>№{number}</b> — его изменить нельзя.
        </p>
        <TeamPhoto
          number={number}
          className="mb-4 w-full max-w-sm rounded-lg border border-stone-200"
        />

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Название команды
            </label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Email</label>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Телефон</label>
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} required />
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
          <label className="flex items-start gap-2 text-sm text-stone-600">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>Показывать контакты команды другим участникам.</span>
          </label>
          {!consent && (
            <p className="text-xs text-amber-600">
              Без согласия другие команды не увидят ваши email и телефон — это
              затруднит договорённость о коллаборации.
            </p>
          )}
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-3 text-base font-semibold text-stone-900">
          Смена пароля <span className="font-normal text-stone-400">(необязательно)</span>
        </h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Текущий пароль</label>
            <input
              type="password"
              className={inputClass}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Новый пароль</label>
            <input
              type="password"
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="не короче 6 символов"
              autoComplete="new-password"
            />
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {ok && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {ok}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? "Сохранение…" : "Сохранить"}
      </button>
    </form>
  );
}
