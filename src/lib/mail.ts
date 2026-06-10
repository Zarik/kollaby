import nodemailer, { type Transporter } from "nodemailer";
import { GAME_NAME, SERVICE_NAME, partOfDayLabel, isPartOfDay } from "@/config/game";
import { formatVisitDate } from "@/lib/date";

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
  const slot = `${input.city}, ${formatVisitDate(input.visitDate)}${part}`;
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

export interface ProposalAnswerEmailInput {
  toEmail: string; // email инициатора (кому шлём)
  toName: string; // название команды-инициатора
  answerNumber: string; // номер ответившей команды
  answerName: string; // название ответившей команды
  status: "accepted" | "declined";
  city: string;
  visitDate: string;
  partOfDay: string | null;
  // контакты ответившей команды — только если приняли и есть согласие
  answerEmail: string | null;
  answerPhone: string | null;
  answerTelegram: string | null; // username без @
  answerMax: string | null;
}

/** Письмо инициатору: его предложение коллаборации приняли или отклонили. */
export async function sendProposalAnswerEmail(
  input: ProposalAnswerEmailInput,
): Promise<void> {
  const accepted = input.status === "accepted";
  const part =
    input.partOfDay && isPartOfDay(input.partOfDay)
      ? `, ${partOfDayLabel(input.partOfDay)}`
      : "";
  const slot = `${input.city}, ${formatVisitDate(input.visitDate)}${part}`;
  const verb = accepted ? "приняла" : "отклонила";
  const subject = `«${SERVICE_NAME}»: команда №${input.answerNumber} ${verb} ваше предложение`;

  const tgUrl = input.answerTelegram ? `https://t.me/${input.answerTelegram}` : null;
  const contactLines: string[] = [];
  if (accepted) {
    if (input.answerEmail) contactLines.push(`email: ${input.answerEmail}`);
    if (input.answerPhone) contactLines.push(`телефон: ${input.answerPhone}`);
    if (tgUrl) contactLines.push(`Telegram: ${tgUrl}`);
    if (input.answerMax) contactLines.push(`MAX: ${input.answerMax}`);
  }
  const contactsBlock =
    accepted && contactLines.length
      ? `\nКонтакты команды для связи:\n${contactLines.join("\n")}`
      : accepted
        ? "\nКонтакты команды скрыты — свяжитесь через сервис."
        : "";

  const text = [
    `Здравствуйте, команда «${input.toName}»!`,
    "",
    `Команда №${input.answerNumber} «${input.answerName}» ${verb} ваше предложение коллаборации в игре «${GAME_NAME}».`,
    `Место и время: ${slot}.`,
    accepted ? "\nДоговоритесь о деталях встречи." : "",
    contactsBlock,
    "",
    `— ${SERVICE_NAME}`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  const telDigits = input.answerPhone?.replace(/[^\d+]/g, "") ?? "";
  const contactHtmlParts: string[] = [];
  if (accepted) {
    if (input.answerEmail)
      contactHtmlParts.push(`email: <a href="mailto:${input.answerEmail}">${input.answerEmail}</a>`);
    if (input.answerPhone)
      contactHtmlParts.push(`телефон: <a href="tel:${telDigits}">${input.answerPhone}</a>`);
    if (tgUrl) contactHtmlParts.push(`Telegram: <a href="${tgUrl}">@${input.answerTelegram}</a>`);
    if (input.answerMax) contactHtmlParts.push(`MAX: <a href="${input.answerMax}">${input.answerMax}</a>`);
  }
  const contactsHtml =
    accepted && contactHtmlParts.length
      ? `<p>Контакты команды для связи:<br>${contactHtmlParts.join("<br>")}</p>`
      : accepted
        ? "<p>Контакты команды скрыты — свяжитесь через сервис.</p>"
        : "";

  const html = `
    <p>Здравствуйте, команда «${input.toName}»!</p>
    <p>Команда №${input.answerNumber} «${input.answerName}» <b>${verb}</b> ваше предложение коллаборации в игре «${GAME_NAME}».</p>
    <p>Место и время: <b>${slot}</b>.</p>
    ${accepted ? "<p>Договоритесь о деталях встречи.</p>" : ""}
    ${contactsHtml}
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

export interface WelcomeEmailInput {
  toEmail: string;
  number: string;
  name: string;
  password: string;
}

/** Письмо-подтверждение регистрации: реквизиты для входа (номер + пароль). */
export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<void> {
  const subject = `«${SERVICE_NAME}»: регистрация команды №${input.number}`;
  const appUrl = process.env.APP_URL ?? "";

  const text = [
    `Здравствуйте, команда «${input.name}»!`,
    "",
    `Вы зарегистрировались в сервисе «${SERVICE_NAME}» для игры «${GAME_NAME}».`,
    "",
    "Реквизиты для входа:",
    `Номер команды (логин): ${input.number}`,
    `Пароль: ${input.password}`,
    "",
    "Сохраните это письмо. Пароль можно сменить в профиле команды.",
    appUrl ? `\nВойти: ${appUrl}` : "",
    "",
    `— ${SERVICE_NAME}`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `
    <p>Здравствуйте, команда «${esc(input.name)}»!</p>
    <p>Вы зарегистрировались в сервисе «${SERVICE_NAME}» для игры «${GAME_NAME}».</p>
    <p><b>Реквизиты для входа:</b><br>
      Номер команды (логин): <b>${esc(input.number)}</b><br>
      Пароль: <b>${esc(input.password)}</b></p>
    <p>Сохраните это письмо. Пароль можно сменить в профиле команды.</p>
    ${appUrl ? `<p><a href="${appUrl}">Войти в сервис</a></p>` : ""}
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
