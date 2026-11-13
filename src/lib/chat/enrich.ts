// Explanation enrichment for the three-dot menu: same BYOK providers as the chat, one non-streaming call per action.
import { chat } from "@tanstack/ai";
import { renderHtml } from "@tanstack/markdown";
import { createAdapter, loadKey, loadSettings, modelFor } from "./providers";
import { WRITING_RULES } from "./yazim-kurallari";

export type EnrichAction = "regenerate" | "longer" | "shorter" | "mnemonic" | "options" | "example";

const INSTRUCTION: Record<EnrichAction, string> = {
  regenerate: "Açıklamayı yeniden yaz: konunun özünü ve akılda kalması gereken anahtar kavramları içeren kısa bir paragraf.",
  longer: "Açıklamayı genişlet: kavramı, nedenini ve bir örneği ekleyerek iki üç paragrafta anlat.",
  shorter: "Açıklamayı tek kısa paragrafa indir; yalnız ana fikir kalsın.",
  mnemonic: "Doğru cevabı hatırlamaya yarayan yaratıcı bir hafıza ipucu yaz (kısaltma, benzetme ya da kısa bir sahne). Kısa tut.",
  options: "Her şıkkı tek tek ele al: doğru şıkkın neden doğru, diğerlerinin neden yanlış olduğunu birer cümleyle yaz. Liste kullan.",
  example: "Kavramı günlük hayattan somut bir örnekle anlat; örneğin soruyla bağını açıkça göster.",
};

export class NoKeyError extends Error {}

export interface EnrichContext {
  question: string;
  answer: string;
  explanation: string;
}

/** Returns safe HTML: the model writes Markdown, raw HTML in it is escaped by the renderer. */
export async function enrich(action: EnrichAction, ctx: EnrichContext, signal?: AbortSignal): Promise<string> {
  const settings = loadSettings();
  const key = loadKey(settings.provider);
  if (!key) throw new NoKeyError();
  const adapter = await createAdapter(settings.provider, modelFor(settings), key);
  const abortController = new AbortController();
  signal?.addEventListener("abort", () => abortController.abort());
  const { text } = await chat({
    adapter,
    stream: false,
    threadId: `aciklama-${crypto.randomUUID()}`,
    abortController,
    systemPrompts: [
      "Açık öğretim öğrencileri için soru açıklamaları yazıyorsun. Yalnız istenen metni yaz, Markdown kullan, giriş ya da kapanış cümlesi ekleme. Doğru şıkkın harfini ayrıca söyleme, öğrenci zaten görüyor; nedenine odaklan.",
      WRITING_RULES,
    ],
    messages: [
      {
        role: "user",
        content: `Soru: ${ctx.question}\n\nDoğru cevap: ${ctx.answer}\n\nMevcut açıklama: ${ctx.explanation}\n\nİstek: ${INSTRUCTION[action]}`,
      },
    ],
  });
  return renderHtml(text.trim());
}

export const isEnrichAction = (a: string): a is EnrichAction => a in INSTRUCTION;
