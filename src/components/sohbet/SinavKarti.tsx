// Interactive mini quiz shown in the chat for the mini_sinav tool. Answers go into the site's own answer
// record, so the course page's wrong-answer filter sees them.
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { recordAnswer, type ChatQuestion } from "../../lib/chat/tools";

export default function SinavKarti({ ders, sorular }: { ders: string; sorular: ChatQuestion[] }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<Record<string, string>>({});
  if (!sorular.length) return <p className="text-sm" style={{ color: "var(--text-color-muted)" }}>Bu seçimle soru bulunamadı.</p>;
  const q = sorular[i]!;
  const chosen = picked[q.id];
  const done = Object.keys(picked).length;
  const correct = sorular.filter((s) => picked[s.id] === s.answer).length;

  const choose = (key: string) => {
    if (chosen) return;
    setPicked((p) => ({ ...p, [q.id]: key }));
    recordAnswer(ders, q, key === q.answer);
  };

  return (
    <section className="rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: "var(--border-color)", background: "var(--card-bg)" }} aria-label="Mini sınav">
      <header className="flex items-center justify-between text-xs" style={{ color: "var(--text-color-muted)" }}>
        <span>Ünite {q.unit} · Soru {q.no}</span>
        <span className="tabular-nums">{i + 1} / {sorular.length}</span>
      </header>
      <p className="text-base leading-relaxed">{q.text}</p>
      <ul className="flex flex-col gap-2">
        {Object.entries(q.options).map(([key, text]) => {
          const isAnswer = key === q.answer;
          const state = !chosen ? "idle" : isAnswer ? "correct" : key === chosen ? "wrong" : "idle";
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => choose(key)}
                disabled={Boolean(chosen)}
                aria-pressed={key === chosen}
                className="w-full text-left flex items-start gap-3 rounded-lg border px-3 py-2.5 min-h-11 text-sm disabled:cursor-default"
                style={{
                  borderColor: state === "correct" ? "var(--correct-border)" : state === "wrong" ? "var(--incorrect-border)" : "var(--border-color)",
                  background: state === "correct" ? "var(--correct-bg)" : state === "wrong" ? "var(--incorrect-bg)" : "transparent",
                }}
              >
                <span className="font-semibold shrink-0 w-4">{key}</span>
                <span className="flex-1">{text}</span>
                {state === "correct" && <Check className="size-4 shrink-0 mt-0.5" aria-label="Doğru" />}
                {state === "wrong" && <X className="size-4 shrink-0 mt-0.5" aria-label="Yanlış" />}
              </button>
            </li>
          );
        })}
      </ul>
      {chosen && q.explanation && (
        <p className="text-sm leading-relaxed rounded-lg px-3 py-2" style={{ background: "var(--button-bg)" }}>
          {q.explanation}
        </p>
      )}
      <footer className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setI(i - 1)} disabled={i === 0} aria-label="Önceki soru" title="Önceki soru" className="inline-flex size-11 items-center justify-center rounded-full disabled:opacity-30">
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <span className="text-xs tabular-nums" style={{ color: "var(--text-color-muted)" }} aria-live="polite">
          {done ? `${correct} doğru, ${done - correct} yanlış` : "Bir şık seç"}
        </span>
        <button type="button" onClick={() => setI(i + 1)} disabled={i === sorular.length - 1} aria-label="Sonraki soru" title="Sonraki soru" className="inline-flex size-11 items-center justify-center rounded-full disabled:opacity-30">
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </footer>
    </section>
  );
}
