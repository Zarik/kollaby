/**
 * Локальный тест sendProposalAnswerEmail.
 * Запуск из корня проекта:
 *   npx tsx scripts/test-answer-email.ts [accepted|declined]
 *
 * Если SMTP не настроен — письмо логируется в консоль (нормально для dev).
 * Если SMTP настроен — реально отправит на toEmail.
 */

import { config } from "node:process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { sendProposalAnswerEmail } from "../src/lib/mail";

// Загружаем .env.local вручную (tsx не грузит его автоматически)
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
}
loadEnv();

const status = process.argv[2] === "declined" ? "declined" : "accepted";

const input = {
  toEmail: process.env.TEST_EMAIL ?? "test-initiator@example.com",
  toName: "Пепелац без гравицапы",
  answerNumber: "138",
  answerName: "КОКО",
  status: status as "accepted" | "declined",
  city: "Кава",
  visitDate: "2026-06-28",
  partOfDay: "day",
  answerEmail: "koko@example.com",
  answerPhone: "+7 900 000-00-00",
  answerTelegram: "koko_team",
  answerMax: null,
};

async function main() {
  console.log(`\n=== Тест sendProposalAnswerEmail (status: ${status}) ===`);
  console.log("toEmail:", input.toEmail);
  console.log("SMTP_HOST:", process.env.SMTP_HOST ?? "(не задан — письмо в консоль)");
  console.log("");

  try {
    await sendProposalAnswerEmail(input);
    console.log("✅ Завершилась без ошибок.");
  } catch (err) {
    console.error("❌ Ошибка при отправке:", err);
    process.exit(1);
  }
}

main();
