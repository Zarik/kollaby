"use client";

import { useState } from "react";

const baseInputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 pr-10 text-stone-900 " +
  "placeholder-stone-400 focus:border-indigo-500 focus:outline-none focus:ring-2 " +
  "focus:ring-indigo-500/20 transition-colors";

/** Поле пароля с переключателем видимости («глазик»). */
export default function PasswordInput({
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  autoFocus,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className={className ?? baseInputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Скрыть пароль" : "Показать пароль"}
        title={show ? "Скрыть пароль" : "Показать пароль"}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-stone-400 hover:text-stone-600"
        tabIndex={-1}
      >
        {show ? (
          // глаз перечёркнут
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" x2="22" y1="2" y2="22" />
          </svg>
        ) : (
          // открытый глаз
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
