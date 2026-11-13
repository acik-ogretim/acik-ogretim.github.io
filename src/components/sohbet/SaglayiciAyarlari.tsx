// Provider, model and key form shared by the site settings panel and the chat. Saves on change; the
// "yz-ayarlari" window event tells open chats and the explanation menu to re-read the settings.
import { Check, Eye, EyeOff, ExternalLink, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useId, useState } from "react";
import {
  PROVIDERS,
  allModels,
  fetchLiveModels,
  testKey,
  loadKey,
  loadSettings,
  providerInfo,
  saveKey,
  saveSettings,
  type ChatSettings,
  type ProviderId,
} from "../../lib/chat/providers";

export const SETTINGS_EVENT = "yz-ayarlari";

export default function SaglayiciAyarlari() {
  const id = useId();
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<ReadonlyArray<string>>([]);
  const [status, setStatus] = useState<{ kind: "busy" | "ok" | "error"; text: string } | null>(null);

  useEffect(() => setSettings(loadSettings()), []);
  const provider = settings?.provider ?? "gemini";
  useEffect(() => {
    if (!settings) return;
    setKey(loadKey(provider));
    setStatus(null);
    allModels(provider).then(setModels).catch(() => setModels([]));
  }, [provider, settings === null]);

  if (!settings) return null; // browser-only values; nothing to show in the prerendered HTML
  const info = providerInfo(provider);
  const model = settings.models[provider] || info.defaultModel;

  const update = (next: ChatSettings) => {
    setSettings(next);
    saveSettings(next);
    dispatchEvent(new CustomEvent(SETTINGS_EVENT));
  };

  const runTest = async () => {
    setStatus({ kind: "busy", text: "Deneniyor" });
    try {
      await testKey(provider, model, key.trim());
      setStatus({ kind: "ok", text: `Anahtar çalışıyor (${model})` });
    } catch (e) {
      setStatus({ kind: "error", text: explain(e) });
    }
  };
  const refreshModels = async () => {
    setStatus({ kind: "busy", text: "Modeller alınıyor" });
    try {
      const live = await fetchLiveModels(provider, key.trim());
      setModels(await allModels(provider));
      setStatus({ kind: "ok", text: `${live.length} model bulundu` });
    } catch (e) {
      setStatus({ kind: "error", text: explain(e) });
    }
  };

  return (
    <div className="flex flex-col gap-3 text-sm">
      <label className="flex flex-col gap-1" htmlFor={`${id}-p`}>
        <span className="text-xs font-medium" style={{ color: "var(--text-color-muted)" }}>Sağlayıcı</span>
        <select
          id={`${id}-p`}
          value={provider}
          onChange={(e) => update({ ...settings, provider: e.target.value as ProviderId })}
          className="sohbet-input"
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1" htmlFor={`${id}-m`}>
        <span className="text-xs font-medium" style={{ color: "var(--text-color-muted)" }}>Model</span>
        {models.length && models.length <= 80 ? (
          <select
            id={`${id}-m`}
            value={model}
            onChange={(e) => update({ ...settings, models: { ...settings.models, [provider]: e.target.value } })}
            className="sohbet-input"
          >
            {!models.includes(model) && <option value={model}>{model}</option>}
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        ) : (
          <input
            id={`${id}-m`}
            list={`${id}-ml`}
            value={model}
            onChange={(e) => update({ ...settings, models: { ...settings.models, [provider]: e.target.value.trim() } })}
            className="sohbet-input"
            autoComplete="off"
            spellCheck={false}
          />
        )}
        {models.length > 80 && (
          <datalist id={`${id}-ml`}>
            {models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        )}
      </label>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-k`} className="text-xs font-medium" style={{ color: "var(--text-color-muted)" }}>Anahtar</label>
        <div className="relative">
          <input
            id={`${id}-k`}
            type={showKey ? "text" : "password"}
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              saveKey(provider, e.target.value);
              dispatchEvent(new CustomEvent(SETTINGS_EVENT));
            }}
            placeholder={info.keyHint}
            className="sohbet-input w-full"
            style={{ paddingRight: "3rem" }}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            aria-label={showKey ? "Anahtarı gizle" : "Anahtarı göster"}
            title={showKey ? "Anahtarı gizle" : "Anahtarı göster"}
            className="absolute right-0 top-0 inline-flex size-11 items-center justify-center"
            style={{ color: "var(--text-color-muted)" }}
          >
            {showKey ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button type="button" disabled={!key.trim() || status?.kind === "busy"} onClick={runTest} className="yz-btn">
            <Check className="size-4 shrink-0" aria-hidden /> Anahtarı dene
          </button>
          <button type="button" disabled={!key.trim() || status?.kind === "busy"} onClick={refreshModels} className="yz-btn">
            <RefreshCw className="size-4 shrink-0" aria-hidden /> Modelleri yenile
          </button>
        </div>
        {status && (
          <p role="status" className="flex items-center gap-2 text-xs mt-1" style={{ color: status.kind === "error" ? "var(--incorrect-border)" : status.kind === "ok" ? "var(--correct-border)" : "var(--text-color-muted)" }}>
            {status.kind === "busy" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : status.kind === "ok" ? <Check className="size-4" aria-hidden /> : <TriangleAlert className="size-4" aria-hidden />}
            {status.text}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 text-xs" style={{ color: "var(--text-color-muted)" }}>
          <span>Yalnız bu tarayıcıda kalır.</span>
          <a href={info.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline min-h-11">
            Anahtar al <ExternalLink className="size-3" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
}

function explain(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/401|403|api key|invalid|unauthori|permission/i.test(m)) return "Anahtar kabul edilmedi.";
  if (/404|not found|model/i.test(m)) return "Bu model bu anahtarla kullanılamıyor. Başka model seç.";
  if (/429|quota|rate/i.test(m)) return "Kullanım sınırı doldu.";
  if (/failed to fetch|network/i.test(m)) return "Sağlayıcıya ulaşılamadı.";
  return "Olmadı. Anahtarı ve modeli kontrol et.";
}
