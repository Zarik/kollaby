import { type ReactNode } from "react";

/** Контакты команды — все кликабельные: email (mailto), телефон (tel), Telegram (t.me), MAX. */

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

const linkClass = "text-indigo-600 hover:underline";

export default function Contacts({
  email,
  phone,
  telegram,
  maxLink,
  className,
}: {
  email?: string | null;
  phone?: string | null;
  telegram?: string | null;
  maxLink?: string | null;
  className?: string;
}) {
  const items: ReactNode[] = [];
  if (email)
    items.push(
      <a key="email" href={`mailto:${email}`} className={linkClass}>
        {email}
      </a>,
    );
  if (phone)
    items.push(
      <a key="phone" href={telHref(phone)} className={linkClass}>
        {phone}
      </a>,
    );
  if (telegram)
    items.push(
      <a
        key="tg"
        href={`https://t.me/${telegram}`}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        @{telegram}
      </a>,
    );
  if (maxLink)
    items.push(
      <a
        key="max"
        href={maxLink}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        MAX
      </a>,
    );

  if (items.length === 0) return null;

  return (
    <span className={className}>
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && " · "}
          {it}
        </span>
      ))}
    </span>
  );
}
