// BYOK providers for the course chat: the user's own key goes straight from the browser to the provider.
// Adapter modules load on demand so the course pages do not pay for them.
import type { AnyTextAdapter } from "@tanstack/ai";

export type ProviderId = "gemini" | "openai" | "anthropic" | "openrouter";

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  defaultModel: string;
  keyHint: string;
  keyUrl: string;
}

export const PROVIDERS: ReadonlyArray<ProviderInfo> = [
  { id: "gemini", label: "Google Gemini", defaultModel: "gemini-4-argon", keyHint: "AIza...", keyUrl: "https://aistudio.google.com/apikey" },
  { id: "openai", label: "OpenAI", defaultModel: "gpt-6-sol", keyHint: "sk-...", keyUrl: "https://platform.openai.com/api-keys" },
  { id: "anthropic", label: "Anthropic", defaultModel: "claude-sonnet-5-5", keyHint: "sk-ant-...", keyUrl: "https://console.anthropic.com/settings/keys" },
  { id: "openrouter", label: "OpenRouter", defaultModel: "google/gemini-4-argon", keyHint: "sk-or-...", keyUrl: "https://openrouter.ai/keys" },
];

export function providerInfo(id: ProviderId): ProviderInfo {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0]!;
}

/** Model ids come from the installed adapter packages, never typed from memory. */
export async function listModels(id: ProviderId): Promise<ReadonlyArray<string>> {
  switch (id) {
    case "gemini":
      return (await import("@tanstack/ai-gemini")).GEMINI_MODELS;
    case "openai":
      return (await import("@tanstack/ai-openai")).OPENAI_CHAT_MODELS;
    case "anthropic":
      return (await import("@tanstack/ai-anthropic")).ANTHROPIC_MODELS;
    case "openrouter": {
      const { OPENROUTER_CHAT_MODELS } = await import("@tanstack/ai-openrouter/model-meta");
      return OPENROUTER_CHAT_MODELS.filter((m) => !m.includes(":")); // ":batch", ":free" variants are the same model
    }
  }
}

export async function createAdapter(id: ProviderId, model: string, apiKey: string): Promise<AnyTextAdapter> {
  // The SDKs refuse to run in a browser unless told; here that is the point (bring your own key).
  switch (id) {
    case "gemini": {
      const m = await import("@tanstack/ai-gemini");
      return m.createGeminiChat(model as (typeof m.GEMINI_MODELS)[number], apiKey);
    }
    case "openai": {
      const m = await import("@tanstack/ai-openai");
      return m.createOpenaiChat(model as (typeof m.OPENAI_CHAT_MODELS)[number], apiKey, { dangerouslyAllowBrowser: true });
    }
    case "anthropic": {
      const m = await import("@tanstack/ai-anthropic");
      return m.createAnthropicChat(model as (typeof m.ANTHROPIC_MODELS)[number], apiKey, { dangerouslyAllowBrowser: true });
    }
    case "openrouter": {
      const m = await import("@tanstack/ai-openrouter");
      return m.createOpenRouterText(model as Parameters<typeof m.createOpenRouterText>[0], apiKey);
    }
  }
}

// --- settings kept in this browser only ---

export interface ChatSettings {
  provider: ProviderId;
  models: Partial<Record<ProviderId, string>>;
}

const SETTINGS_KEY = "sohbet-ayarlari";
const keyName = (id: ProviderId) => (id === "gemini" ? "gemini-api-key" : `${id}-api-key`); // gemini shares the explanation menu's key

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* storage blocked: the key lives only for this page */
  }
}

export function loadSettings(): ChatSettings {
  try {
    const raw = JSON.parse(read(SETTINGS_KEY) ?? "{}");
    const provider = PROVIDERS.some((p) => p.id === raw.provider) ? (raw.provider as ProviderId) : "gemini";
    return { provider, models: typeof raw.models === "object" && raw.models ? raw.models : {} };
  } catch {
    return { provider: "gemini", models: {} };
  }
}
export const saveSettings = (s: ChatSettings) => write(SETTINGS_KEY, JSON.stringify(s));
export const loadKey = (id: ProviderId) => read(keyName(id)) ?? "";
export const saveKey = (id: ProviderId, key: string) => write(keyName(id), key.trim() || null);
export const modelFor = (s: ChatSettings) => s.models[s.provider] || providerInfo(s.provider).defaultModel;

// --- key test and live model list ---

/** Sends one tiny request with the given key and model; throws the provider's error if it fails. */
export async function testKey(id: ProviderId, model: string, apiKey: string): Promise<void> {
  const { chat } = await import("@tanstack/ai");
  const adapter = await createAdapter(id, model, apiKey);
  await chat({
    adapter,
    stream: false,
    threadId: `anahtar-${crypto.randomUUID()}`,
    messages: [{ role: "user", content: "Yalnız 'tamam' yaz." }],
  });
}

const LIVE_KEY = (id: ProviderId) => `yz-modeller-${id}`;

/** Models the provider says this key can use right now. The key goes in a header, never in the URL. */
export async function fetchLiveModels(id: ProviderId, apiKey: string): Promise<string[]> {
  const get = async (url: string, headers: Record<string, string>) => {
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  };
  let names: string[] = [];
  if (id === "gemini") {
    const j = await get("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", { "x-goog-api-key": apiKey });
    names = (j.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m: { name: string }) => m.name.replace(/^models\//, ""));
  } else if (id === "openai") {
    const j = await get("https://api.openai.com/v1/models", { Authorization: `Bearer ${apiKey}` });
    names = (j.data ?? []).map((m: { id: string }) => m.id).filter((n: string) => /^(gpt|o\d|chatgpt)/.test(n));
  } else if (id === "anthropic") {
    const j = await get("https://api.anthropic.com/v1/models?limit=1000", {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    });
    names = (j.data ?? []).map((m: { id: string }) => m.id);
  } else {
    const j = await get("https://openrouter.ai/api/v1/models", { Authorization: `Bearer ${apiKey}` });
    names = (j.data ?? []).map((m: { id: string }) => m.id);
  }
  names = [...new Set(names)].sort();
  write(LIVE_KEY(id), JSON.stringify(names));
  return names;
}

/** Package list plus the last live list fetched for this provider, newest package entries first. */
export async function allModels(id: ProviderId): Promise<string[]> {
  let live: string[] = [];
  try {
    live = JSON.parse(read(LIVE_KEY(id)) ?? "[]");
  } catch {
    live = [];
  }
  const known = await listModels(id);
  return [...new Set([...known, ...live])];
}
