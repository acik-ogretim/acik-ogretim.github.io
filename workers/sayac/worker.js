// Anonymous unique-visitor counter for acik-ogretim.github.io (Cloudflare Worker + D1).
// No cookies and no raw IP/user agent are stored: a visitor is a SHA-256 of (ip, user agent, day, secret salt),
// so the same person counts once per page per day and the hash cannot be linked across days.
const IZINLI = ["https://acik-ogretim.github.io", "http://localhost:4321"];

function cors(req) {
  const o = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": IZINLI.includes(o) ? o : IZINLI[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

async function sha(metin) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(metin));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function yolTemizle(p) {
  try {
    const u = new URL(p, "https://acik-ogretim.github.io");
    let y = decodeURIComponent(u.pathname).slice(0, 200);
    if (!y.endsWith("/") && !y.includes(".")) y += "/";
    return y;
  } catch {
    return "/";
  }
}

const gun = (d = new Date()) => d.toISOString().slice(0, 10);

export default {
  async fetch(req, env) {
    const h = cors(req);
    if (req.method === "OPTIONS") return new Response(null, { headers: h });
    const url = new URL(req.url);

    if (url.pathname === "/hit" && req.method === "POST") {
      let veri = {};
      try { veri = await req.json(); } catch {}
      const yol = yolTemizle(String(veri.p || "/"));
      if (yol.startsWith("/test-")) return new Response(null, { status: 204, headers: h });
      const g = gun();
      const ip = req.headers.get("CF-Connecting-IP") || "";
      const ua = req.headers.get("User-Agent") || "";
      if (/bot|crawl|spider|headless/i.test(ua)) return new Response(null, { status: 204, headers: h });
      const z = await sha(`${ip}|${ua}|${g}|${env.TUZ}`);
      await env.DB.batch([
        env.DB.prepare("INSERT OR IGNORE INTO tekil (gun, yol, z) VALUES (?1, ?2, ?3)").bind(g, yol, z),
        env.DB.prepare("INSERT OR IGNORE INTO tekil (gun, yol, z) VALUES (?1, '*', ?2)").bind(g, z),
        env.DB.prepare("INSERT INTO gosterim (gun, yol, adet) VALUES (?1, ?2, 1) ON CONFLICT(gun, yol) DO UPDATE SET adet = adet + 1").bind(g, yol),
      ]);
      return new Response(null, { status: 204, headers: h });
    }

    if (url.pathname === "/ozet") {
      const gunSay = Math.min(Math.max(parseInt(url.searchParams.get("gun") || "30", 10) || 30, 1), 365);
      const bas = gun(new Date(Date.now() - (gunSay - 1) * 864e5));
      const [gunluk, sayfalar, toplam] = await env.DB.batch([
        env.DB.prepare("SELECT gun, COUNT(*) AS tekil FROM tekil WHERE yol = '*' AND gun >= ?1 GROUP BY gun ORDER BY gun").bind(bas),
        env.DB.prepare(
          `SELECT t.yol, COUNT(DISTINCT t.z) AS tekil, (SELECT SUM(adet) FROM gosterim g WHERE g.yol = t.yol AND g.gun >= ?1) AS gosterim
           FROM tekil t WHERE t.yol != '*' AND t.gun >= ?1 GROUP BY t.yol ORDER BY tekil DESC LIMIT 200`,
        ).bind(bas),
        env.DB.prepare("SELECT COUNT(DISTINCT z) AS tekil FROM tekil WHERE yol = '*' AND gun >= ?1").bind(bas),
      ]);
      const govde = JSON.stringify({
        aralik: { bas, bit: gun(), gun: gunSay },
        tekilZiyaretGunToplami: toplam.results[0]?.tekil ?? 0,
        gunluk: gunluk.results,
        sayfalar: sayfalar.results,
      });
      return new Response(govde, { headers: { ...h, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=120" } });
    }

    return new Response("Açık Öğretim Portal sayaç", { headers: h });
  },
};
