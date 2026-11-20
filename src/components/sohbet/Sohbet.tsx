// Course chat page: BYOK, runs fully in the browser (static site). Layout follows suru's session view:
// message log, tool steps as quiet rows, raised composer at the bottom. Phone first.
import { Dialog } from "@base-ui/react/dialog";
import { chat, maxIterations } from "@tanstack/ai";
import { localStoragePersistence, useChat, type ConnectConnectionAdapter, type UIMessage } from "@tanstack/ai-react";
import { Markdown } from "@tanstack/markdown/react";
import { ArrowUp, AudioLines, BookOpen, ChartColumn, Check, Copy, History, KeyRound, ListChecks, LoaderCircle, Mic, MicOff, RotateCcw, Search, Square, SquarePen, Trash2, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { createAdapter, loadKey, loadSettings, modelFor, type ChatSettings } from "../../lib/chat/providers";
import SaglayiciAyarlari, { SETTINGS_EVENT } from "./SaglayiciAyarlari";
import { QUIZ_TOOL, courseTools, loadCatalog, systemPrompt, type CatalogCourse, type ChatQuestion } from "../../lib/chat/tools";
import SinavKarti from "./SinavKarti";
import { kaydet, listele, sil, threadId, yeniKimlik, type Konusma } from "../../lib/chat/gecmis";

const TOOL_LABEL: Record<string, string> = {
  ders_bul: "Ders aranıyor",
  ders_bilgisi: "Ders bilgisi okunuyor",
  soru_ara: "Sorularda aranıyor",
  soru_getir: "Soru açılıyor",
  unite_sorulari: "Ünite soruları okunuyor",
  ilerlemem: "Çözüm kaydına bakılıyor",
  unite_ozeti: "Ünite özeti okunuyor",
  mini_sinav: "Sınav hazırlanıyor",
};

/** Full-page chat (/sohbet). The course is read from ?ders=. */
export default function Sohbet() {
  return <ChatPanel />;
}

/** The chat itself; used full page and inside the course page's drawer. */
export function ChatPanel({
  courseKey: fixedCourse,
  onClose,
  draft,
  keyAsk = 0,
}: {
  courseKey?: string;
  onClose?: () => void;
  draft?: { text: string; n: number };
  keyAsk?: number;
}) {
  const [courseKey, setCourseKey] = useState<string | null>(fixedCourse ?? null);
  const [course, setCourse] = useState<CatalogCourse | null>(null);
  const [settings, setSettings] = useState<ChatSettings>(() => ({ provider: "gemini", models: {} }));
  const [hasKey, setHasKey] = useState(true);
  const [ready, setReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // "" is the course's first (pre-history) conversation; others get a generated id
  const [konusma, setKonusma] = useState<string | null>(null);
  useEffect(() => {
    if (keyAsk) setSettingsOpen(true);
  }, [keyAsk]);
  useEffect(() => {
    if (!ready) return;
    setKonusma(listele(courseKey)[0]?.id ?? "");
  }, [courseKey, ready]);

  // Browser-only state is read after mount, so the prerendered HTML stays the same for everyone.
  useEffect(() => {
    const read = () => {
      const s = loadSettings();
      setSettings(s);
      setHasKey(Boolean(loadKey(s.provider)));
    };
    read();
    addEventListener(SETTINGS_EVENT, read);
    if (!fixedCourse) setCourseKey(new URLSearchParams(location.search).get("ders"));
    setReady(true);
    return () => removeEventListener(SETTINGS_EVENT, read);
  }, [fixedCourse]);
  useEffect(() => {
    if (!courseKey) {
      setCourse(null);
      return;
    }
    loadCatalog()
      .then((all) => setCourse(all.find((c) => c.key === courseKey) ?? null))
      .catch(() => setCourse(null));
  }, [courseKey]);

  return (
    <div
      className={`sohbet flex flex-col ${onClose ? "h-full" : "h-[100dvh]"}`}
      onClickCapture={(e) => {
        // In the drawer, a source-question link points into the page behind it: close the drawer and scroll there.
        const a = (e.target as HTMLElement).closest("a");
        if (!onClose || !a || !a.hash) return;
        const url = new URL(a.href, location.href);
        if (url.pathname.replace(/\/$/, "") !== location.pathname.replace(/\/$/, "")) return;
        e.preventDefault();
        onClose();
        // wait for the drawer to finish closing: its scroll lock restores the old position on the way out
        setTimeout(() => {
          const target = document.getElementById(url.hash.slice(1));
          if (!target) return;
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          history.replaceState(null, "", url.hash);
        }, 700);
      }}
    >
      <header className="flex items-center gap-2 px-4 h-14 border-b shrink-0" style={{ borderColor: "var(--border-color)" }}>
        {!onClose && (
          <a href="/" aria-label="Ana sayfa" className="shrink-0">
            <img src="/favicon.svg" alt="" width={28} height={28} />
          </a>
        )}
        <div className="min-w-0 flex-1">
          {course && !onClose ? (
            <a href={course.url} className="block truncate text-sm font-semibold py-1" title={course.name}>
              {course.name}
            </a>
          ) : (
            <span className="block truncate text-sm font-semibold" title={course?.name}>{course ? course.name : "Ders asistanı"}</span>
          )}
          <span className="block truncate text-xs" style={{ color: "var(--text-color-muted)" }}>
            {course ? `${course.universityShort || course.university} · ${course.department}` : "Bir ders adı yazarak başla"}
          </span>
        </div>
        <HistoryDialog
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          courseKey={courseKey}
          current={konusma}
          onPick={(id) => {
            setKonusma(id);
            setHistoryOpen(false);
          }}
          onNew={() => {
            setKonusma(yeniKimlik());
            setHistoryOpen(false);
          }}
        />
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        {onClose && (
          <IconButton label="Kapat" onClick={onClose}>
            <X className="size-5" aria-hidden />
          </IconButton>
        )}
      </header>
      {ready && konusma !== null && (
        <ChatBody
          key={threadId(courseKey, konusma)}
          courseKey={courseKey}
          konusma={konusma}
          onNew={() => setKonusma(yeniKimlik())}
          course={course}
          settings={settings}
          hasKey={hasKey}
          onNeedKey={() => setSettingsOpen(true)}
          draft={draft}
        />
      )}
    </div>
  );
}

function ChatBody({
  courseKey,
  konusma,
  onNew,
  course,
  settings,
  hasKey,
  onNeedKey,
  draft,
}: {
  courseKey: string | null;
  konusma: string;
  onNew: () => void;
  course: CatalogCourse | null;
  settings: ChatSettings;
  hasKey: boolean;
  onNeedKey: () => void;
  draft?: { text: string; n: number };
}) {
  // Read through refs so a settings change applies to the next message without remounting the chat.
  const live = useRef({ settings, course });
  live.current = { settings, course };

  const connection = useMemo<ConnectConnectionAdapter>(
    () => ({
      async *connect(messages, _data, abortSignal, runContext) {
        const { settings: s, course: c } = live.current;
        const key = loadKey(s.provider);
        if (!key) throw new Error("Önce anahtarını gir.");
        const adapter = await createAdapter(s.provider, modelFor(s), key);
        const abortController = new AbortController();
        abortSignal?.addEventListener("abort", () => abortController.abort());
        yield* chat({
          adapter,
          messages,
          tools: courseTools,
          systemPrompts: [systemPrompt(c)],
          abortController,
          threadId: runContext.threadId,
          runId: runContext.runId,
          agentLoopStrategy: maxIterations(8),
        });
      },
    }),
    [],
  );

  const { messages, sendMessage, isLoading, error, stop, reload } = useChat({
    threadId: threadId(courseKey, konusma),
    connection,
    persistence: localStoragePersistence(),
  });

  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  // Live mode: listen, send when the sentence ends, read the answer aloud, listen again.
  const [canli, setCanli] = useState<"kapali" | "dinliyor" | "dusunuyor" | "konusuyor">("kapali");
  const [duyulan, setDuyulan] = useState("");
  const okunan = useRef<string | null>(messages.at(-1)?.id ?? null);
  const dinle = useCanliDinleme(
    (t) => setDuyulan(t),
    (t) => {
      setDuyulan("");
      if (t.trim()) {
        setCanli("dusunuyor");
        send(t.trim());
      } else setCanli((d) => (d === "dinliyor" ? "kapali" : d));
    },
  );
  useEffect(() => {
    if (canli === "kapali" || isLoading) return;
    const son = messages.at(-1);
    if (!son || son.role !== "assistant" || son.id === okunan.current) return;
    okunan.current = son.id;
    const metin = son.parts.map((p) => (p.type === "text" ? p.content : "")).join("\n\n").trim();
    if (!metin) return;
    setCanli("konusuyor");
    seslendir(metin, () => {
      setCanli((d) => {
        if (d === "kapali") return d;
        dinle.baslat();
        return "dinliyor";
      });
    });
  }, [isLoading, messages, canli]);
  const canliAc = () => {
    if (!hasKey) return onNeedKey();
    okunan.current = messages.at(-1)?.id ?? null;
    setCanli("dinliyor");
    dinle.baslat();
  };
  const canliKapat = () => {
    dinle.durdur();
    speechSynthesis.cancel();
    setCanli("kapali");
    setDuyulan("");
  };
  useEffect(() => () => canliKapat(), []);

  const send = (text: string) => {
    if (!hasKey) return onNeedKey();
    kaydet(courseKey, konusma, messages.length ? undefined : text);
    void sendMessage(text);
  };

  return (
    <>
      <main className="flex-1 overflow-y-auto" role="log" aria-live="polite">
        <div className="mx-auto w-full max-w-2xl px-4 py-4 flex flex-col gap-5">
          {messages.length === 0 && <Empty course={course} hasKey={hasKey} onNeedKey={onNeedKey} onPick={send} />}
          {messages.map((m, i) => (
            <Message key={m.id} message={m} last={i === messages.length - 1} busy={isLoading} onReload={() => void reload()} />
          ))}
          {isLoading && messages.at(-1)?.role === "user" && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-color-muted)" }}>
              <LoaderCircle className="size-4 animate-spin" aria-hidden /> Düşünüyor
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm rounded-lg px-3 py-2" style={{ background: "var(--incorrect-bg)" }}>
              {friendlyError(error)}
            </p>
          )}
          <div ref={end} />
        </div>
      </main>
      {canli !== "kapali" && (
        <div className="shrink-0 px-3">
          <div className="mx-auto w-full max-w-2xl flex items-center gap-3 rounded-2xl border px-3 py-2" style={{ borderColor: "var(--primary-color)", background: "var(--card-bg)" }} role="status">
            <AudioLines className={`size-5 shrink-0 ${canli === "dinliyor" ? "animate-pulse" : ""}`} style={{ color: "var(--primary-color)" }} aria-hidden />
            <span className="min-w-0 flex-1 text-sm line-clamp-2">
              {canli === "dinliyor" ? duyulan || "Dinliyorum, konuş" : canli === "dusunuyor" ? "Düşünüyor" : "Cevabı okuyor"}
            </span>
            {canli === "konusuyor" && (
              <IconButton label="Sözünü kes, beni dinle" onClick={() => { speechSynthesis.cancel(); setCanli("dinliyor"); dinle.baslat(); }}>
                <Mic className="size-5" aria-hidden />
              </IconButton>
            )}
            <IconButton label="Canlı konuşmayı bitir" onClick={canliKapat}>
              <X className="size-5" aria-hidden />
            </IconButton>
          </div>
        </div>
      )}
      <Composer onLive={canli === "kapali" && dinle.destek ? canliAc : undefined} running={isLoading} onSend={send} onStop={stop} onClear={messages.length ? onNew : undefined} draft={draft} model={modelFor(settings)} onModel={onNeedKey} />
    </>
  );
}

function Empty({ course, hasKey, onNeedKey, onPick }: { course: CatalogCourse | null; hasKey: boolean; onNeedKey: () => void; onPick: (t: string) => void }) {
  const ideas = course
    ? ["Bu dersin ünitelerini ve konularını özetle", "Bana 5 soruluk bir mini sınav yap", "Yanlış yaptığım sorulara göre neye çalışmalıyım?", "Sınavda en çok çıkan konular neler?"]
    : ["AUZEF Anne Baba Eğitimi dersinde pekiştirme nedir?", "Anadolu AÖF'te hangi dersler var?"];
  return (
    <div className="pt-10 flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{course ? "Ne sormak istersin?" : "Derslerinle ilgili sor"}</h2>
      {!hasKey && (
        <button type="button" onClick={onNeedKey} className="self-start flex items-center gap-2 rounded-lg px-3 min-h-11 text-sm font-medium" style={{ background: "var(--primary-color)", color: "var(--primary-color-text)" }}>
          <KeyRound className="size-4" aria-hidden /> Anahtarını gir
        </button>
      )}
      <ul className="flex flex-col gap-2">
        {ideas.map((t) => (
          <li key={t}>
            <button type="button" onClick={() => onPick(t)} className="w-full text-left rounded-lg border px-3 min-h-11 text-sm hover:opacity-80" style={{ borderColor: "var(--border-color)", background: "var(--card-bg)" }}>
              {t}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Message({ message, last, busy, onReload }: { message: UIMessage; last: boolean; busy: boolean; onReload: () => void }) {
  if (message.role === "user") {
    const text = message.parts.map((p) => (p.type === "text" ? p.content : "")).join("");
    return (
      <div className="self-end max-w-[85%] rounded-2xl px-4 py-2 whitespace-pre-wrap break-words" style={{ background: "var(--button-bg)" }}>
        {text}
      </div>
    );
  }
  const results = new Map<string, unknown>();
  for (const p of message.parts) {
    if (p.type !== "tool-result") continue;
    try {
      results.set(p.toolCallId, typeof p.content === "string" ? JSON.parse(p.content) : p.content);
    } catch {
      results.set(p.toolCallId, null);
    }
  }
  const text = message.parts.map((p) => (p.type === "text" ? p.content : "")).join("\n\n").trim();
  const streaming = busy && last;
  return (
    <article className="flex flex-col gap-2 min-w-0">
      {message.parts.map((p, i) => {
        if (p.type === "tool-call") {
          const out = (p.output ?? results.get(p.id)) as { ders?: string; sorular?: ChatQuestion[] } | undefined;
          if (p.name === QUIZ_TOOL && out?.sorular) return <SinavKarti key={p.id} ders={out.ders ?? ""} sorular={out.sorular} />;
          return <ToolRow key={p.id} name={p.name} input={p.input} done={results.has(p.id) || p.output !== undefined} />;
        }
        if (p.type === "text" && p.content)
          return (
            <div key={i} className="sohbet-md break-words">
              <Markdown>{p.content}</Markdown>
            </div>
          );
        return null;
      })}
      {text && !streaming && <MessageActions text={text} onReload={last ? onReload : undefined} />}
    </article>
  );
}

/** Reads text aloud with the voice and speed the site's reader uses (quiz-settings). */
function seslendir(text: string, onEnd: () => void) {
  let voiceURI = "";
  let rate = 1.2;
  try {
    const s = JSON.parse(localStorage.getItem("quiz-settings") ?? "{}");
    voiceURI = s.voiceURI ?? "";
    rate = Number(s.playbackRate) || rate;
  } catch {
    /* defaults */
  }
  const plain = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_#>`|]/g, "");
  const u = new SpeechSynthesisUtterance(plain);
  u.lang = "tr-TR";
  u.rate = rate;
  const v = speechSynthesis.getVoices().find((x) => x.voiceURI === voiceURI);
  if (v) u.voice = v;
  u.onend = u.onerror = () => onEnd();
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function MessageActions({ text, onReload }: { text: string; onReload?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => speechSynthesis?.cancel(), []);
  const speak = () => {
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    seslendir(text, () => setSpeaking(false));
    setSpeaking(true);
  };
  const small = "inline-flex size-9 items-center justify-center rounded-lg hover:opacity-80";
  return (
    <div className="flex items-center gap-1 -ml-2" style={{ color: "var(--text-color-muted)" }}>
      <button
        type="button"
        className={small}
        aria-label={copied ? "Kopyalandı" : "Kopyala"}
        title={copied ? "Kopyalandı" : "Kopyala"}
        onClick={() => {
          void navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      </button>
      {"speechSynthesis" in globalThis && (
        <button type="button" className={small} aria-label={speaking ? "Okumayı durdur" : "Sesli oku"} title={speaking ? "Okumayı durdur" : "Sesli oku"} onClick={speak}>
          {speaking ? <Square className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
        </button>
      )}
      {onReload && (
        <button type="button" className={small} aria-label="Yeniden yanıtla" title="Yeniden yanıtla" onClick={onReload}>
          <RotateCcw className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

function ToolRow({ name, input, done }: { name: string; input: unknown; done: boolean }) {
  const args = (input ?? {}) as { sorgu?: string; unite?: number; ders?: string };
  const detail = args.sorgu ?? (args.unite !== undefined ? `Ünite ${args.unite}` : "");
  const Icon = name === "ders_bul" || name === "ders_bilgisi" || name === "unite_ozeti" ? BookOpen : name === "ilerlemem" ? ChartColumn : name === QUIZ_TOOL ? ListChecks : Search;
  return (
    <div className="flex items-center gap-2 text-xs min-w-0" style={{ color: "var(--text-color-muted)" }}>
      {done ? <Check className="size-3.5 shrink-0" aria-hidden /> : <LoaderCircle className="size-3.5 shrink-0 animate-spin" aria-hidden />}
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">
        {TOOL_LABEL[name] ?? name}
        {detail ? `: ${detail}` : ""}
      </span>
    </div>
  );
}

function Composer({
  running,
  onSend,
  onStop,
  onClear,
  onLive,
  draft,
  model,
  onModel,
}: {
  running: boolean;
  onSend: (t: string) => void;
  onStop: () => void;
  onClear?: () => void;
  onLive?: () => void;
  draft?: { text: string; n: number };
  model: string;
  onModel: () => void;
}) {
  const [text, setText] = useState(draft?.text ?? "");
  const input = useRef<HTMLTextAreaElement>(null);
  const ses = useDikte((t) => setText(t));
  useEffect(() => {
    if (!draft) return;
    setText(draft.text);
    input.current?.focus();
  }, [draft]);
  const submit = () => {
    const t = text.trim();
    if (!t || running) return;
    ses.durdur();
    onSend(t);
    setText("");
  };
  return (
    <div className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <form
        className="mx-auto w-full max-w-2xl rounded-2xl border shadow-sm"
        style={{ borderColor: "var(--border-color)", background: "var(--card-bg)" }}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="sohbet-girdi" className="sr-only">Mesaj</label>
        <TextareaAutosize
          id="sohbet-girdi"
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape" && running) onStop();
          }}
          minRows={1}
          maxRows={8}
          placeholder="Sorunu yaz"
          className="block w-full resize-none bg-transparent px-4 pt-3 text-base outline-none"
        />
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-1 min-w-0">
            <IconButton label="Yeni sohbet" onClick={onClear} disabled={!onClear || running}>
              <SquarePen className="size-5" aria-hidden />
            </IconButton>
            <button type="button" onClick={onModel} title="Modeli değiştir" className="min-w-0 max-w-[11rem] truncate rounded-full px-3 min-h-9 text-xs border" style={{ borderColor: "var(--border-color)", color: "var(--text-color-muted)" }}>
              {model}
            </button>
          </div>
          <div className="flex items-center gap-1">
          {onLive && !running && (
            <IconButton label="Canlı konuş" onClick={onLive}>
              <AudioLines className="size-5" aria-hidden />
            </IconButton>
          )}
          {ses.destek && !running && (
            <IconButton label={ses.dinliyor ? "Dinlemeyi bitir" : "Sesle yaz"} onClick={() => (ses.dinliyor ? ses.durdur() : ses.baslat(text))}>
              {ses.dinliyor ? <MicOff className="size-5" style={{ color: "var(--primary-color)" }} aria-hidden /> : <Mic className="size-5" aria-hidden />}
            </IconButton>
          )}
          {running ? (
            <IconButton label="Durdur" onClick={onStop} solid>
              <Square className="size-4" aria-hidden />
            </IconButton>
          ) : (
            <IconButton label="Gönder" type="submit" disabled={!text.trim()} solid>
              <ArrowUp className="size-5" aria-hidden />
            </IconButton>
          )}
          </div>
        </div>
      </form>
    </div>
  );
}

type Tanima = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

/** Turkish dictation with the browser's speech recognition (Chrome, Edge, Safari). Text is appended to what was typed. */
function useDikte(onText: (t: string) => void) {
  const [destek, setDestek] = useState(false);
  const [dinliyor, setDinliyor] = useState(false);
  const tanima = useRef<Tanima | null>(null);
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Tanima; webkitSpeechRecognition?: new () => Tanima };
    setDestek(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => tanima.current?.stop();
  }, []);
  const baslat = (onceki: string) => {
    const w = window as unknown as { SpeechRecognition?: new () => Tanima; webkitSpeechRecognition?: new () => Tanima };
    const Sinif = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Sinif) return;
    const r = new Sinif();
    r.lang = "tr-TR";
    r.continuous = true;
    r.interimResults = true;
    const bas = onceki.trim() ? onceki.trim() + " " : "";
    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      onText(bas + t.trim());
    };
    r.onend = () => setDinliyor(false);
    r.onerror = () => setDinliyor(false);
    tanima.current = r;
    r.start();
    setDinliyor(true);
  };
  const durdur = () => {
    tanima.current?.stop();
    setDinliyor(false);
  };
  return { destek, dinliyor, baslat, durdur };
}

/** One spoken turn: interim text while speaking, final text when the sentence ends. */
function useCanliDinleme(onAra: (t: string) => void, onSon: (t: string) => void) {
  const tanima = useRef<Tanima | null>(null);
  const [destek, setDestek] = useState(false);
  const geri = useRef({ onAra, onSon });
  geri.current = { onAra, onSon };
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Tanima; webkitSpeechRecognition?: new () => Tanima };
    setDestek(Boolean((w.SpeechRecognition || w.webkitSpeechRecognition) && "speechSynthesis" in window));
  }, []);
  const baslat = () => {
    const w = window as unknown as { SpeechRecognition?: new () => Tanima; webkitSpeechRecognition?: new () => Tanima };
    const Sinif = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Sinif) return;
    tanima.current?.stop();
    const r = new Sinif();
    r.lang = "tr-TR";
    r.continuous = false;
    r.interimResults = true;
    let son = "";
    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      son = t;
      geri.current.onAra(t);
    };
    r.onend = () => {
      if (tanima.current === r) geri.current.onSon(son);
    };
    r.onerror = () => undefined;
    tanima.current = r;
    try {
      r.start();
    } catch {
      /* already started */
    }
  };
  const durdur = () => {
    const r = tanima.current;
    tanima.current = null;
    r?.stop();
  };
  return { destek, baslat, durdur };
}

function HistoryDialog({
  open,
  onOpenChange,
  courseKey,
  current,
  onPick,
  onNew,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  courseKey: string | null;
  current: string | null;
  onPick: (id: string) => void;
  onNew: () => void;
}) {
  const [liste, setListe] = useState<Konusma[]>([]);
  useEffect(() => {
    if (open) setListe(listele(courseKey));
  }, [open, courseKey]);
  const tarih = (t: number) => (t ? new Date(t).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger aria-label="Sohbet geçmişi" title="Sohbet geçmişi" className="inline-flex size-11 items-center justify-center rounded-full" style={{ color: "var(--text-color-muted)" }}>
        <History className="size-5" aria-hidden />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40 z-[200]" />
        <Dialog.Popup
          className="fixed z-[201] inset-x-0 bottom-0 max-h-[80dvh] flex flex-col rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[28rem] md:rounded-2xl"
          style={{ background: "var(--card-bg)", color: "var(--text-color)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <Dialog.Title className="text-base font-semibold">Sohbet geçmişi</Dialog.Title>
            <Dialog.Close aria-label="Kapat" className="inline-flex size-11 items-center justify-center rounded-full" style={{ color: "var(--text-color-muted)" }}>
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <button type="button" onClick={onNew} className="flex items-center gap-2 rounded-lg px-3 min-h-11 text-sm font-medium mb-2" style={{ background: "var(--primary-color)", color: "var(--primary-color-text)" }}>
            <SquarePen className="size-4" aria-hidden /> Yeni sohbet
          </button>
          {liste.length === 0 && <p className="text-sm py-3" style={{ color: "var(--text-color-muted)" }}>Henüz kayıtlı sohbet yok.</p>}
          <ul className="flex flex-col gap-1 overflow-y-auto">
            {liste.map((k) => (
              <li key={k.id || "ilk"} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onPick(k.id)}
                  aria-current={k.id === current ? "true" : undefined}
                  className="min-w-0 flex-1 text-left rounded-lg border px-3 py-2 min-h-11"
                  style={{ borderColor: k.id === current ? "var(--primary-color)" : "var(--border-color)" }}
                >
                  <span className="block truncate text-sm">{k.baslik}</span>
                  {k.guncel > 0 && <span className="block text-xs" style={{ color: "var(--text-color-muted)" }}>{tarih(k.guncel)}</span>}
                </button>
                <IconButton
                  label="Sohbeti sil"
                  onClick={() => {
                    sil(courseKey, k.id);
                    const kalan = listele(courseKey);
                    setListe(kalan);
                    if (k.id === current) onPick(kalan[0]?.id ?? "");
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                </IconButton>
              </li>
            ))}
          </ul>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function IconButton({ label, children, solid, type = "button", ...rest }: { label: string; children: React.ReactNode; solid?: boolean; type?: "button" | "submit"; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className="inline-flex size-11 items-center justify-center rounded-full disabled:opacity-40"
      style={solid ? { background: "var(--primary-color)", color: "var(--primary-color-text)" } : { color: "var(--text-color-muted)" }}
      {...rest}
    >
      {children}
    </button>
  );
}

function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger aria-label="Model ve anahtar" title="Model ve anahtar" className="inline-flex size-11 items-center justify-center rounded-full" style={{ color: "var(--text-color-muted)" }}>
        <KeyRound className="size-5" aria-hidden />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40 z-[200]" />
        <Dialog.Popup
          className="fixed z-[201] inset-x-0 bottom-0 rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[28rem] md:rounded-2xl"
          style={{ background: "var(--card-bg)", color: "var(--text-color)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <Dialog.Title className="text-base font-semibold">Model ve anahtar</Dialog.Title>
            <Dialog.Close aria-label="Kapat" className="inline-flex size-11 items-center justify-center rounded-full" style={{ color: "var(--text-color-muted)" }}>
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <SaglayiciAyarlari />
          <Dialog.Close className="mt-4 w-full rounded-lg min-h-11 font-medium" style={{ background: "var(--primary-color)", color: "var(--primary-color-text)" }}>
            Tamam
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function friendlyError(e: Error): string {
  const m = e.message || "";
  if (/401|403|api key|invalid.*key|unauthori/i.test(m)) return "Anahtar kabul edilmedi. Anahtarını kontrol et.";
  if (/429|quota|rate/i.test(m)) return "Sağlayıcının kullanım sınırı doldu. Biraz sonra yeniden dene.";
  if (/failed to fetch|network/i.test(m)) return "Sağlayıcıya ulaşılamadı. Bağlantını kontrol et.";
  return m.replace(/(sk-|AIza)[\w-]+/g, "[anahtar]"); // never echo a key back
}
