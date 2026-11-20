// A study document the assistant wrote (belge_olustur): shown in the chat, downloadable as Markdown and printable.
import { Markdown } from "@tanstack/markdown/react";
import { Check, Copy, Download, FileText, Printer } from "lucide-react";
import { useRef, useState } from "react";

export default function BelgeKarti({ baslik, icerik }: { baslik: string; icerik: string }) {
  const govde = useRef<HTMLDivElement>(null);
  const [kopyalandi, setKopyalandi] = useState(false);
  const dosyaAdi = baslik.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60) || "belge";

  const indir = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([`# ${baslik}\n\n${icerik}\n`], { type: "text/markdown" }));
    a.download = `${dosyaAdi}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const yazdir = () => {
    const w = window.open("", "_blank");
    if (!w || !govde.current) return;
    w.document.title = baslik;
    const st = w.document.createElement("style");
    st.textContent =
      "body{font:16px/1.6 system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#111}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:.3rem .5rem}h1{font-size:1.6rem}";
    w.document.head.appendChild(st);
    const h = w.document.createElement("h1");
    h.textContent = baslik;
    w.document.body.appendChild(h);
    w.document.body.appendChild(govde.current.cloneNode(true));
    w.focus();
    w.print();
  };
  const kopyala = async () => {
    await navigator.clipboard.writeText(`# ${baslik}\n\n${icerik}`);
    setKopyalandi(true);
    setTimeout(() => setKopyalandi(false), 1500);
  };
  const dugme = "inline-flex size-11 items-center justify-center rounded-full hover:opacity-80";
  return (
    <section className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border-color)", background: "var(--card-bg)" }}>
      <header className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "var(--border-color)" }}>
        <FileText className="size-5 shrink-0" style={{ color: "var(--primary-color)" }} aria-hidden />
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold" title={baslik}>{baslik}</h3>
        <button type="button" className={dugme} onClick={kopyala} aria-label={kopyalandi ? "Kopyalandı" : "Kopyala"} title="Kopyala">
          {kopyalandi ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        </button>
        <button type="button" className={dugme} onClick={indir} aria-label="İndir" title="İndir (Markdown)">
          <Download className="size-4" aria-hidden />
        </button>
        <button type="button" className={dugme} onClick={yazdir} aria-label="Yazdır ya da PDF kaydet" title="Yazdır ya da PDF kaydet">
          <Printer className="size-4" aria-hidden />
        </button>
      </header>
      <div ref={govde} data-base-ui-swipe-ignore="y" className="sohbet-md break-words px-4 py-3 max-h-[60vh] overflow-y-auto overscroll-contain">
        <Markdown>{icerik}</Markdown>
      </div>
    </section>
  );
}
