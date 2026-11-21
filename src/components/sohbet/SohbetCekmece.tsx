// "Derse sor" button and chat drawer on the course page. The chat code loads only when the drawer first opens.
import { Drawer } from "@base-ui/react/drawer";
import { LoaderCircle, MessageCircle } from "lucide-react";
import { Suspense, lazy, useEffect, useState } from "react";

const ChatPanel = lazy(() => import("./Sohbet").then((m) => ({ default: m.ChatPanel })));

function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}

export default function SohbetCekmece({ courseKey, tetikSinifi = "btn-secondary" }: { courseKey: string; tetikSinifi?: string }) {
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false); // keep the chat mounted after the first open so a reply keeps streaming
  const wide = useWide();
  const [draft, setDraft] = useState<{ text: string; n: number }>();
  const [keyAsk, setKeyAsk] = useState(0);
  // The explanation menu talks to the drawer through window events (it is plain script, not React).
  useEffect(() => {
    const show = () => {
      setOpened(true);
      setOpen(true);
    };
    const ask = (e: Event) => {
      setDraft((d) => ({ text: (e as CustomEvent<{ text: string }>).detail.text, n: (d?.n ?? 0) + 1 }));
      show();
    };
    const needKey = () => {
      setKeyAsk((n) => n + 1);
      show();
    };
    addEventListener("sohbet:sor", ask);
    addEventListener("sohbet:anahtar", needKey);
    return () => {
      removeEventListener("sohbet:sor", ask);
      removeEventListener("sohbet:anahtar", needKey);
    };
  }, []);
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setOpened(true);
      }}
      swipeDirection={wide ? "right" : "down"}
    >
      <Drawer.Trigger id="sohbet-ac" className={tetikSinifi}>
        <MessageCircle className="size-[18px]" aria-hidden />
        Derse sor
      </Drawer.Trigger>
      <Drawer.Portal keepMounted={opened}>
        <Drawer.Backdrop className="katman-perde" />
        <Drawer.Viewport className="katman-konum sohbet-gorunum" data-yer="sag">
          <Drawer.Popup className="katman-yuzey sohbet-popup">
            <Drawer.Title className="sr-only">Ders asistanı</Drawer.Title>
            <Drawer.Content className="flex-1 min-w-0 min-h-0">
              {opened && (
                <Suspense
                  fallback={
                    <div className="h-full grid place-items-center">
                      <LoaderCircle className="size-6 animate-spin" aria-label="Yükleniyor" />
                    </div>
                  }
                >
                  <ChatPanel courseKey={courseKey} onClose={() => setOpen(false)} draft={draft} keyAsk={keyAsk} />
                </Suspense>
              )}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
