#!/usr/bin/env bash
# Builds topic files for selected courses and stages them for commit.
# CI has no access to the private ders-kitaplari repo, so the topic files of the
# courses we publish are committed (public/konu/ stays gitignored for everything else).
# Usage: scripts/konu-yayinla.sh [course,course,...]   (default: ATA Sosyoloji 1st term)
set -euo pipefail
cd "$(dirname "$0")/.."
DERSLER=${1:-hukukun-temel-kavramlari,sosyolojiye-giris,psikoloji,istatistige-giris,turk-kulturu-ve-medeniyeti-tarihi,temel-bilgi-teknolojileri-i}
KONU_DERSLERI="$DERSLER" node scripts/konu-parcala.mjs
IFS=',' read -ra liste <<< "$DERSLER"
for ders in "${liste[@]}"; do
  for uni in public/konu/*/; do
    [ -d "$uni$ders" ] && git add -f "$uni$ders"
  done
done
git status --short public/konu | wc -l | xargs echo "staged topic files:"
