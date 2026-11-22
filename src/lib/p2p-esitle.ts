// Device-to-device sync with no account and no server of ours: two browsers that enter the same passphrase find each
// other through public Nostr relays (Trystero) and send their backups straight to each other over WebRTC.
// The relays only see a hash of the passphrase; the connection offers and the backup are encrypted with it.

import { coz, sifrele } from "./bulut-esitle";
import { tabanOku, tabanYaz, topla, yukle } from "./yedek";

async function odaKimligi(parola: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`acik-ogretim-esitleme:${parola}`));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

/** Joins the pairing room; every device that joins with the same passphrase gets this device's records and vice versa.
 * Returns a function that leaves the room. */
export async function p2pBaslat(parola: string, durum: (metin: string) => void): Promise<() => void> {
  if (parola.length < 8) throw new Error("Parola en az 8 karakter olmalı.");
  const { joinRoom } = await import("trystero");
  const room = joinRoom({ appId: "acik-ogretim-portal", password: parola, maxReceiveBytes: 20_000_000 }, await odaKimligi(parola));
  const kanal = room.makeAction<string>("kayitlar");
  kanal.onMessage(async (veri) => {
    try {
      const n = yukle(await coz(JSON.parse(veri), parola), localStorage, await tabanOku("p2p"));
      await tabanYaz("p2p", topla());
      durum(`Öteki cihazdan ${n} kayıt geldi ve birleşti.`);
    } catch (e) {
      durum(e instanceof Error ? e.message : "Gelen kayıt okunamadı.");
    }
  });
  room.onPeerJoin(async ({ peerId }) => {
    durum("Öteki cihaz bulundu, kayıtlar gönderiliyor.");
    await kanal.send(JSON.stringify(await sifrele(topla(), parola)), { target: peerId });
  });
  room.onError((e) => durum(`Bağlantı sorunu: ${e.message}`));
  durum("Öteki cihaz bekleniyor. Orada da aynı parolayla bu düğmeye bas.");
  return () => void room.leave();
}
