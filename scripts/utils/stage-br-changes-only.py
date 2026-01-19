#!/usr/bin/env python3
"""
Stage only hunks where the ONLY difference is <br/> formatting changes.
For example: "<br />" -> "<br/>" or " <br/>" -> "<br/>"
"""
import subprocess
import re
import os

def stage_br_only_changes():
    try:
        diff_output = subprocess.check_output(['git', 'diff', '-U0', '--no-color']).decode('utf-8', errors='ignore')
    except subprocess.CalledProcessError:
        print("Git diff komutu başarısız oldu.")
        return

    if not diff_output:
        print("Unstaged değişiklik bulunamadı.")
        return

    file_diff_blocks = re.split(r'^diff --git ', diff_output, flags=re.MULTILINE)[1:]

    hunks_to_stage = []
    # Pattern to normalize <br> variants: <br>, <br/>, <br />, <br  />, etc.
    br_pattern = re.compile(r'<br\s*/?\s*>', re.IGNORECASE)

    for file_diff in file_diff_blocks:
        filename_match = re.match(r'a/(.*?)\s+b/', file_diff)
        if not filename_match:
            continue
        filename = filename_match.group(1)

        hunk_parts = re.split(r'^(@@ .*? @@)', file_diff, flags=re.MULTILINE)
        if len(hunk_parts) < 2:
            continue
        file_header = hunk_parts[0]

        for i in range(1, len(hunk_parts), 2):
            if i + 1 >= len(hunk_parts):
                continue
            hunk_header = hunk_parts[i]
            hunk_body = hunk_parts[i + 1]

            body_lines = hunk_body.splitlines()
            removed = "".join([l[1:] for l in body_lines if l.startswith('-')])
            added = "".join([l[1:] for l in body_lines if l.startswith('+')])

            if not removed and not added:
                continue

            # Normalize by replacing all <br> variants with a canonical form
            def normalize_br(text):
                return br_pattern.sub('<br/>', text)

            normalized_removed = normalize_br(removed)
            normalized_added = normalize_br(added)

            # Also check for whitespace before <br/>
            # e.g., " <br/>" -> "<br/>" (trailing space before br)
            def normalize_space_around_br(text):
                # Remove space before <br/>
                text = re.sub(r'\s+<br/>', '<br/>', text)
                # Remove space after <br/>
                text = re.sub(r'<br/>\s+', '<br/>', text)
                return text

            clean_removed = normalize_space_around_br(normalized_removed)
            clean_added = normalize_space_around_br(normalized_added)

            if clean_removed == clean_added:
                # This hunk ONLY contains <br/> formatting changes
                patch = f"diff --git a/{filename} b/{filename}\n{file_header}{hunk_header}\n{hunk_body}\n"
                hunks_to_stage.append((filename, patch))

    if not hunks_to_stage:
        print("Sadece <br/> değişikliği içeren bir değişiklik bloku bulunamadı.")
        return

    print(f"{len(hunks_to_stage)} adet sadece <br/> değişikliği içeren blok saptandı. Stage'e alınıyor...")

    success_count = 0
    fail_count = 0
    temp_patch = "temp_br_only.patch"

    for filename, patch in hunks_to_stage:
        with open(temp_patch, "w") as f:
            f.write(patch)

        try:
            subprocess.check_call(
                ['git', 'apply', '--cached', '--recount', '--whitespace=nowarn', temp_patch],
                stderr=subprocess.DEVNULL
            )
            success_count += 1
        except subprocess.CalledProcessError:
            fail_count += 1
            continue

    if os.path.exists(temp_patch):
        os.remove(temp_patch)

    print(f"✅ Başarıyla {success_count} adet blok stage'e alındı.")
    if fail_count > 0:
        print(f"⚠️ {fail_count} adet blok stage'e alınamadı (çakışma veya format hatası).")

if __name__ == "__main__":
    stage_br_only_changes()
