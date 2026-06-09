import nodemailer, { type Transporter } from "nodemailer";
import { GAME_NAME, SERVICE_NAME, partOfDayLabel, isPartOfDay } from "@/config/game";

/**
 * Отправка email через SMTP (nodemailer). Если SMTP не настроен в .env —
 * письмо не падает, а логируется в консоль (dev-режим работает без почты).
 */

let cached: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (cached !== undefined) return cached;

  const host = process.env.SMTP_HOST;
  if (!host) {
    cached = null;
    return null;
  }

  cached = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  return cached;
}

function fromAddress(): string {
  return (
    process.env.SMTP_FROM ?? `${SERVICE_NAME} <no-reply@localhost>`
  );
}

export interface ProposalEmailInput {
  toEmail: string;
  toName: string;
  fromNumber: string;
  fromName: string;
  fromEmail: string | null;
  fromPhone: string | null;
  fromTelegram: string | null; // username без @
  fromMax: string | null; // полная ссылка max.ru
  city: string;
  visitDate: string;
  partOfDay: string | null;
  message: string | null;
}

/** Письмо команде-адресату: вам предложили коллаборацию. */
export async function sendProposalEmail(input: ProposalEmailInput): Promise<void> {
  const part =
    input.partOfDay && isPartOfDay(input.partOfDay)
      ? `, ${partOfDayLabel(input.partOfDay)}`
      : "";
  const slot = `${input.city}, ${input.visitDate}${part}`;
  const subject = `«${SERVICE_NAME}»: команда №${input.fromNumber} предлагает коллаборацию`;

  const tgUrl = input.fromTelegram ? `https://t.me/${input.fromTelegram}` : null;
  const contactLines: string[] = [];
  if (input.fromEmail) contactLines.push(`email: ${input.fromEmail}`);
  if (input.fromPhone) contactLines.push(`телефон: ${input.fromPhone}`);
  if (tgUrl) contactLines.push(`Telegram: ${tgUrl}`);
  if (input.fromMax) contactLines.push(`MAX: ${input.fromMax}`);
  const contacts = contactLines.length
    ? `Контакты команды для связи:\n${contactLines.join("\n")}`
    : "Контакты команды скрыты — ответьте через сервис.";

  const appUrl = process.env.APP_URL ?? "";

  const text = [
    `Здравствуйте, команда «${input.toName}»!`,
    "",
    `Команда №${input.fromNumber} «${input.fromName}» предлагает вам коллаборацию в игре «${GAME_NAME}».`,
    `Место и время: ${slot}.`,
    input.message ? `\nСообщение: ${input.message}` : "",
    "",
    contacts,
    appUrl ? `\nОткрыть сервис: ${appUrl}/plan` : "",
    "",
    `— ${SERVICE_NAME}`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  // HTML-версия с кликабельными контактами (tel: / mailto:)
  const telDigits = input.fromPhone?.replace(/[^\d+]/g, "") ?? "";
  const contactHtmlParts: string[] = [];
  if (input.fromEmail)
    contactHtmlParts.push(`email: <a href="mailto:${input.fromEmail}">${input.fromEmail}</a>`);
  if (input.fromPhone)
    contactHtmlParts.push(`телефон: <a href="tel:${telDigits}">${input.fromPhone}</a>`);
  if (tgUrl)
    contactHtmlParts.push(`Telegram: <a href="${tgUrl}">@${input.fromTelegram}</a>`);
  if (input.fromMax)
    contactHtmlParts.push(`MAX: <a href="${input.fromMax}">${input.fromMax}</a>`);
  const contactsHtml = contactHtmlParts.length
    ? `Контакты команды для связи:<br>${contactHtmlParts.join("<br>")}`
    : "Контакты команды скрыты — ответьте через сервис.";

  const html = `
    <p>Здравствуйте, команда «${input.toName}»!</p>
    <p>Команда №${input.fromNumber} «${input.fromName}» предлагает вам коллаборацию в игре «${GAME_NAME}».</p>
    <p>Место и время: <b>${slot}</b>.</p>
    ${input.message ? `<p>Сообщение: ${input.message}</p>` : ""}
    <p>${contactsHtml}</p>
    ${appUrl ? `<p><a href="${appUrl}/plan">Открыть сервис</a></p>` : ""}
    <p>— ${SERVICE_NAME}</p>
  `.trim();

  const transporter = getTransporter();
  if (!transporter) {
    console.info(
      `[mail] SMTP не настроен — письмо не отправлено.\nКому: ${input.toEmail}\nТема: ${subject}\n\n${text}`,
    );
    return;
  }

  await transporter.sendMail({
    from: fromAddress(),
    to: input.toEmail,
    subject,
    text,
    html,
  });
}
