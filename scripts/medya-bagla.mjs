// Connect already published video ids. Never uploads or regenerates media.
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
export const videoId = (url) =>
  /(?:youtu\.be\/|v=)([\w-]{11})(?:$|[?&#])/.exec(url ?? "")?.[1] ?? null;
export function mergeVideo(media, video) {
  const id = videoId(video.url);
  if (!id) throw new Error(`Geçersiz YouTube bağlantısı: ${video.url}`);
  const existing = media.find((x) => x.tur === "youtube" && x.kaynak === id);
  return existing
    ? media
    : [
        ...media,
        {
          id: `youtube-${id}`,
          tur: "youtube",
          cesit: /uzun/i.test(video.baslik)
            ? "uzun-anlatim"
            : /soru/i.test(video.baslik)
              ? "soru-cozum"
              : "kisa-ozet",
          baslik: video.baslik,
          kaynak: id,
        },
      ];
}
export function connect(root, production, content) {
  const path = join(root, "src/data/youtube-videolar.json");
  const source = JSON.parse(readFileSync(path, "utf8"));
  const ids = JSON.parse(
    readFileSync(
      join(production, "data/ata-aof/yayin/youtube/grafik-idler.json"),
      "utf8",
    ),
  );
  const links = readFileSync(
    join(production, "data/ata-aof/yayin/youtube/baglantilar.md"),
    "utf8",
  );
  const normalize = (s) =>
    s
      .normalize("NFC")
      .toLocaleLowerCase("tr")
      .replace(/[^\p{L}\p{N}]/gu, "");
  const names = new Map();
  for (const f of readdirSync(join(root, "data/courses/ataturk-aof")))
    for (const c of JSON.parse(
      readFileSync(join(root, "data/courses/ataturk-aof", f), "utf8"),
    ))
      names.set(normalize(c.name), c);
  for (const match of links.matchAll(
    /^- ([^:\n]+): (https:\/\/youtu\.be\/[\w-]{11})/gm,
  )) {
    const c = names.get(normalize(match[1]));
    if (c) ids[c.id] = videoId(match[2]);
  }
  for (const [slug, id] of Object.entries(ids)) {
    const key = `ataturk-aof/${slug}`;
    const list = source.dersler[key] ?? [];
    if (!list.some((v) => videoId(v.url) === id))
      list.push({
        baslik: `${[...names.values()].find((c) => c.id === slug)?.name ?? slug} Vize Özeti`,
        url: `https://youtu.be/${id}`,
      });
    source.dersler[key] = list;
  }
  if (existsSync(join(content, "dersler")))
    for (const code of readdirSync(join(content, "dersler"))) {
      const p = join(content, "dersler", code, "youtube/paket.json");
      if (!existsSync(p)) continue;
      const pkg = JSON.parse(readFileSync(p, "utf8"));
      if (!/^[\w-]{11}$/.test(pkg.video_id ?? "")) continue;
      const key = `anadolu-aof/${pkg.slug}`;
      source.dersler[key] ??= [];
      if (!source.dersler[key].some((v) => videoId(v.url) === pkg.video_id))
        source.dersler[key].push({
          baslik: pkg.title,
          url: `https://youtu.be/${pkg.video_id}`,
        });
    }
  writeFileSync(path, JSON.stringify(source, null, 2) + "\n");
  let count = 0;
  for (const [key, videos] of Object.entries(source.dersler)) {
    const [uni, ders] = key.split("/");
    const fileKey = uni === "ataturk-aof" ? ders : `${uni}--${ders}`;
    const contractPath = join(
      root,
      "data/calisma-odasi-medya",
      `${fileKey}.json`,
    );
    const contract = existsSync(contractPath)
      ? JSON.parse(readFileSync(contractPath, "utf8"))
      : { v: 1, uni, ders, medyalar: [] };
    for (const video of videos)
      contract.medyalar = mergeVideo(contract.medyalar, video);
    mkdirSync(join(root, "data/calisma-odasi-medya"), { recursive: true });
    writeFileSync(contractPath, JSON.stringify(contract, null, 1) + "\n");
    const roomPath = join(root, "src/data/calisma-odasi", `${fileKey}.json`);
    if (existsSync(roomPath)) {
      const room = JSON.parse(readFileSync(roomPath, "utf8"));
      for (const video of videos) {
        const id = videoId(video.url);
        if (
          !room.medyalar.some((m) => m.tur === "youtube" && m.kaynak === id)
        ) {
          const media = contract.medyalar.find((m) => m.kaynak === id);
          room.medyalar.push({
            ...media,
            sure: null,
            satirlar: [],
            konuAraliklari: {},
          });
        }
      }
      writeFileSync(roomPath, JSON.stringify(room) + "\n");
    }
    count++;
  }
  console.log(
    `${count} dersin yayımlanmış videosu sözleşmeye ve soru sayfasına bağlandı; yeni yükleme yok.`,
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const root = resolve(import.meta.dirname, "..");
  connect(
    root,
    resolve(root, "../auzeff-tui"),
    resolve(root, "../anadolu-aof-icerik"),
  );
}
