#!/bin/sh
# Media gate for code repos (Zeki, 23 Nov 2026): "bizim script ve kod depolarımıza hep video ses resimler ekleniyor;
# bunlar ayrı depolarda ve kategorize edilmiş olmalı; direkt site vb. kullanıyorsa ancak o zaman kalmalı".
#
# Stops a commit that adds audio, video, images or PDFs to a code repo, unless the path is one the app or site
# serves directly. Allowed paths come from `.medya-izinli` in the repo root (one shell glob per line, # comments);
# without that file only the usual served folders pass: public/, */public/, assets/ and src/assets/.
# Production media goes to the media repos (WildGenie/ders-medya and kin, see docs/ops/medya-depolari.md).
#
# Usage: sh scripts/medya-kapisi.sh [file ...]   (no arguments: the staged files)
# Other repos can call it the same way from their own hooks.
set -u
UZANTI='\.(mp3|wav|m4a|ogg|opus|aac|flac|mp4|mov|webm|mkv|avi|png|jpe?g|webp|gif|avif|psd|tiff?|pdf)$'

kok=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
izin="$kok/.medya-izinli"

if [ "$#" -gt 0 ]; then
  liste=$(printf '%s\n' "$@")
else
  liste=$(git diff --cached --name-only --diff-filter=A)
fi

izinli() {
  yol=$1
  if [ -f "$izin" ]; then
    while IFS= read -r desen || [ -n "$desen" ]; do
      case $desen in ''|'#'*) continue ;; esac
      # shellcheck disable=SC2254
      case $yol in $desen) return 0 ;; esac
    done < "$izin"
    return 1
  fi
  case $yol in public/*|*/public/*|assets/*|src/assets/*) return 0 ;; esac
  return 1
}

hata=0
printf '%s\n' "$liste" | grep -iE "$UZANTI" | while IFS= read -r f; do
  [ -n "$f" ] || continue
  if ! izinli "$f"; then
    echo "medya-kapisi: $f bir kod deposuna giriyor. Uygulama doğrudan kullanmıyorsa medya deposuna koy (docs/ops/medya-depolari.md); kullanıyorsa yolunu .medya-izinli dosyasına ekle." >&2
    echo x
  fi
done | grep -q x && hata=1
exit $hata
