import subprocess
import re
import os

def stage_minor_changes():
    try:
        # Context -U0 to keep hunks minimal
        diff_output = subprocess.check_output(['git', 'diff', '-U0', '--no-color']).decode('utf-8', errors='ignore')
    except subprocess.CalledProcessError:
        print("Git diff komutu başarısız oldu.")
        return

    if not diff_output:
        print("Unstaged değişiklik bulunamadı.")
        return

    file_diff_blocks = re.split(r'^diff --git ', diff_output, flags=re.MULTILINE)[1:]

    hunks_to_stage = []
    br_pattern = re.compile(r'<br\s*/?>', re.IGNORECASE)
    # Signs to treat as hyphen
    dash_pattern = re.compile(r'[\u2013\u2014\u2212]')

    for file_diff in file_diff_blocks:
        filename_match = re.match(r'a/(.*?)\s+b/', file_diff)
        if not filename_match: continue
        filename = filename_match.group(1)

        hunk_parts = re.split(r'^(@@ .*? @@)', file_diff, flags=re.MULTILINE)
        if len(hunk_parts) < 2: continue
        file_header = hunk_parts[0]

        for i in range(1, len(hunk_parts), 2):
            hunk_header = hunk_parts[i]
            hunk_body = hunk_parts[i+1]

            body_lines = hunk_body.splitlines()
            removed = "".join([l[1:] for l in body_lines if l.startswith('-')])
            added = "".join([l[1:] for l in body_lines if l.startswith('+')])

            if not removed and not added: continue

            def normalize_for_comp(text):
                # 1. Ignore BR tags (treat as space)
                t = br_pattern.sub(' ', text)
                # 2. Treat all dashes/minus as standard hyphen
                t = dash_pattern.sub('-', t)
                # 3. Standardize quotes (optional, but requested earlier)
                t = t.replace('“', '"').replace('”', '"').replace('‘', "'").replace('’', "'")
                # 4. Standardize whitespace
                t = t.replace('&nbsp;', ' ').replace('\xa0', ' ')
                return " ".join(t.split())

            clean_removed = normalize_for_comp(removed)
            clean_added = normalize_for_comp(added)

            if clean_removed == clean_added:
                # Construct a strictly valid patch for THIS hunk
                patch = f"diff --git a/{filename} b/{filename}\n{file_header}{hunk_header}\n{hunk_body}\n"
                hunks_to_stage.append(patch)

    if not hunks_to_stage:
        print("Sadece <br/>, tire veya tırnak farkı olan bir değişiklik bloku bulunamadı.")
        return

    print(f"{len(hunks_to_stage)} adet önemsiz değişim bloku saptandı. Stage'e alınıyor...")

    success_count = 0
    temp_patch = "temp_minor_diff.patch"

    for patch in hunks_to_stage:
        with open(temp_patch, "w") as f:
            f.write(patch)

        try:
            # Using --cached to stage changes, --recount to fix hunk headers
            subprocess.check_call(['git', 'apply', '--cached', '--recount', '--whitespace=nowarn', temp_patch],
                                  stderr=subprocess.DEVNULL)
            success_count += 1
        except:
            continue

    if os.path.exists(temp_patch):
        os.remove(temp_patch)

    print(f"Başarıyla {success_count} adet blok stage'e alındı. 'git diff' artık bunları göstermeyecek.")

if __name__ == "__main__":
    stage_minor_changes()
