#!/usr/bin/env python3
"""Bileşenlerdeki sabit Tailwind renk sınıflarını tema rollerine çevirir (DESIGN.md, tema 17).

Rol sınıfları global.css içindeki @theme inline bloğundan gelir: page, card, control, raised,
line, line-strong, ink, ink-muted, accent, on-accent, accent-ink, accent-soft, ok, bad, warn (+ -soft),
glass, scrim. Kullanım: python3 scripts/tema_siniflari.py [--yaz] [dosya ...]
"""
import re, sys, pathlib

NEUTRAL = "slate|gray|zinc|neutral|stone"
ACCENT = "teal|cyan|sky|blue|indigo|violet|purple|fuchsia"
OK = "green|emerald|lime"
BAD = "red|rose|pink"
WARN = "amber|yellow|orange"
ALL = f"{NEUTRAL}|{ACCENT}|{OK}|{BAD}|{WARN}|white|black"
UTIL = "text|bg|border|ring|from|to|via|fill|stroke|divide|outline|shadow|accent|decoration|placeholder|caret"
TOK = re.compile(
    rf"(?<![\w/\[-])(?P<pre>(?:[a-z0-9-]+:)*)(?P<u>{UTIL})-(?P<side>[xytrblse]-)?(?P<c>{ALL})(?:-(?P<sh>\d{{2,3}}))?(?:/(?P<op>\d+))?(?![\w-])"
)
SOLID = re.compile(rf"(?<![\w:-])bg-(?:{ACCENT}|{OK}|{BAD}|{WARN})-(?:4|5|6|7)00(?![\w/-])|(?<![\w:-])bg-accent(?![\w/-])")
STR = re.compile(r'"[^"\n]*"|\'[^\'\n]*\'|`[^`]*`')


def fam(c):
    for name, grp in (("n", NEUTRAL), ("a", ACCENT), ("ok", OK), ("bad", BAD), ("warn", WARN)):
        if re.fullmatch(grp, c):
            return name
    return c  # white / black


def map_token(m, solid):
    pre, u, side, c, sh, op = m["pre"], m["u"], m["side"] or "", m["c"], m["sh"], m["op"]
    sh = int(sh) if sh else None
    op = int(op) if op else None
    if op == 0 and u == "bg":
        return pre + "bg-transparent"
    f = fam(c)
    if "dark:" in pre:
        return ""  # roller temayı kendisi izler
    if u in ("from", "to", "via"):
        return ""
    if u == "shadow":
        return "" if f not in ("black", "n") else m.group(0)
    if u == "placeholder":
        return pre + "placeholder-ink-muted"
    if u == "caret":
        return pre + "caret-accent"
    if u == "decoration":
        return pre + ("decoration-accent" if f == "a" else "decoration-line")
    if u in ("fill", "stroke"):
        role = {"a": "accent", "ok": "ok", "bad": "bad", "warn": "warn"}.get(f, "current")
        return pre + f"{u}-{role}"
    if u == "accent":
        return pre + "accent-accent"
    if f in ("ok", "bad", "warn"):
        if u == "text":
            return pre + f"text-{f}"
        if u == "bg":
            soft = op is not None or (sh is not None and (sh <= 200 or sh >= 800))
            return pre + (f"bg-{f}-soft" if soft else f"bg-{f}")
        return pre + f"{u}-{side}{f}" + (f"/{op}" if op and op < 50 and u == "border" else "")
    if f == "a":
        if u == "text":
            return pre + "text-accent-ink"
        if u == "bg":
            if op is not None and op <= 30:
                return pre + "bg-accent-soft"
            if sh is not None and (sh <= 200 or sh >= 800):
                return pre + "bg-accent-soft"
            return pre + "bg-accent" + (f"/{op}" if op else "")
        if u == "border":
            return pre + f"border-{side}accent" + ("/40" if op and op < 50 else "")
        return pre + f"{u}-accent" + (f"/{op}" if op else "")
    # nötr, beyaz, siyah
    if u == "text":
        if f == "white" or (f == "n" and sh is not None and sh <= 300):
            return pre + ("text-on-accent" if solid else "text-ink")
        if f == "black" or (f == "n" and sh is not None and sh >= 700):
            return pre + ("text-on-accent" if solid else "text-ink")
        return pre + "text-ink-muted"
    if u == "bg":
        if f == "black":
            return pre + ("bg-scrim" if op else "bg-page")
        if f == "white":
            return pre + ("bg-control" if op else "bg-card")
        if sh >= 900:
            return pre + "bg-page" + (f"/{op}" if op and op >= 50 else "")
        if sh == 800:
            return pre + ("bg-control" if op and op < 70 else "bg-card")
        if sh in (600, 700):
            return pre + ("bg-control" if op and op < 50 else "bg-raised")
        if sh in (400, 500):
            return pre + "bg-ink-muted"
        if sh in (200, 300):
            return pre + "bg-raised"
        return pre + "bg-control"
    if u in ("border", "divide", "ring", "outline"):
        strong = f == "n" and sh in (400, 500)
        return pre + f"{u}-{side}" + ("line-strong" if strong else "line")
    return m.group(0)


def convert_string(s):
    solid = bool(SOLID.search(s))
    had_grad = bool(re.search(rf"(?<![\w-])(?:[a-z-]+:)*(?:from|to|via)-(?:{ALL})", s))
    out = TOK.sub(lambda m: map_token(m, solid), s)
    if out == s:
        return s
    if had_grad:
        out = re.sub(r"(?<![\w-])bg-(?:gradient|linear)-to-[a-z]+", "bg-card", out)
    # yinelenen sınıfları ve fazla boşlukları ayıkla
    q = out[0]
    inner = out[1:-1]
    if "\n" not in inner and "${" not in inner:
        seen, parts = set(), []
        for p in inner.split(" "):
            if p and p in seen and re.match(r"(?:[a-z0-9-]+:)*(?:text|bg|border|divide|ring)-", p):
                continue
            seen.add(p)
            parts.append(p)
        lead = " " if inner.startswith(" ") else ""
        tail = " " if inner.endswith(" ") else ""
        if len(parts) != len([p for p in inner.split(" ") if p]) or "  " in inner:
            inner = lead + " ".join(x for x in parts if x) + tail
    return q + inner + q


def main():
    yaz = "--yaz" in sys.argv
    files = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not files:
        files = [str(p) for p in pathlib.Path("src").rglob("*") if p.suffix in (".astro", ".tsx", ".ts")]
    toplam = 0
    for fp in files:
        t = pathlib.Path(fp).read_text()
        n = t
        n = STR.sub(lambda m: convert_string(m.group(0)), n)
        # Astro/JSX sınıf ifadeleri tırnak dışında da olabilir: class:list, {...}
        if n != t:
            d = sum(1 for _ in TOK.finditer(t)) - sum(1 for _ in TOK.finditer(n))
            toplam += d
            print(f"{fp}: {d}")
            if yaz:
                pathlib.Path(fp).write_text(n)
    print("toplam", toplam, "(yazıldı)" if yaz else "(deneme)")


if __name__ == "__main__":
    main()
