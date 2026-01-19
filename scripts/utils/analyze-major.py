import subprocess
import re
from collections import Counter

def analyze_major_changes():
    try:
        # Get unstaged diff
        diff_output = subprocess.check_output(['git', 'diff', '-U0', '--no-color']).decode('utf-8', errors='ignore')
    except: return

    file_diffs = re.split(r'^(diff --git .*)$', diff_output, flags=re.MULTILINE)[1:]

    # Minor normalization for exclusion
    dash_pattern = re.compile(r'[\u2013\u2014\u2212]')
    quote_map = {'“': '"', '”': '"', '‘': "'", '’': "'"}
    def is_minor(rem, add):
        # Basic normalization
        def norm(s):
            for q, r in quote_map.items(): s = s.replace(q, r)
            s = dash_pattern.sub('-', s)
            s = re.sub(r'(?:\s*<br\s*/?>\s*)+', '<BR>', s, flags=re.IGNORECASE)
            s = re.sub(r'\s+', ' ', s)
            return s.strip()
        return norm(rem) == norm(add)

    major_categories = Counter()
    examples = []

    for i in range(0, len(file_diffs), 2):
        cmd = file_diffs[i]
        block = file_diffs[i+1]

        filename = re.search(r' b/(.*)', cmd).group(1)
        if not filename.startswith('data/questions/'): continue

        hunks = re.split(r'^(@@ .*? @@)', block, flags=re.MULTILINE)
        for j in range(1, len(hunks), 2):
            h_body = hunks[j+1]
            lines = h_body.splitlines()
            rem = "".join([l[1:] for l in lines if l.startswith('-')])
            add = "".join([l[1:] for l in lines if l.startswith('+')])

            if not rem and not add: continue
            if is_minor(rem, add): continue

            # Analyze WHY it's major
            found_cat = False

            # 1. Link Healing (.tr etc)
            if '</a>.' in rem and '</a>' in add and ('.tr' in add or '.com' in add):
                major_categories["Link Healing (URL suffixlerini <a> içine alma)"] += 1
                found_cat = True

            # 2. Tag Unwrapping (<span>, <p>, <div> removal)
            rem_tags = set(re.findall(r'</?([a-z0-9]+)', rem.lower()))
            add_tags = set(re.findall(r'</?([a-z0-9]+)', add.lower()))
            if ('span' in rem_tags or 'p' in rem_tags or 'font' in rem_tags) and (not 'span' in add_tags and not 'p' in add_tags):
                major_categories["Tag Unwrapping (Gereksiz span/p/font silinmesi)"] += 1
                found_cat = True

            # 3. List Item / Structure change
            if ('<li>' in rem or '<ul>' in rem) and ('<li>' in add or '<ul>' in add):
                if rem.count('<li>') != add.count('<li>') or '</ul>' in add:
                    major_categories["Liste Yapısı Değişimi (İç içe listeler veya birleştirme)"] += 1
                    found_cat = True

            # 4. Attribute Removal
            if 'class=' in rem or 'style=' in rem or 'data-' in rem:
                major_categories["HTML Attribute Temizliği (class/style/data-*)"] += 1
                found_cat = True

            # 5. Technical Mode / Escaping
            if ('&lt;' in rem and '<' in add) or ('<' in rem and '&lt;' in add):
                major_categories["Teknik Mod / HTML Escape Düzeltmeleri"] += 1
                found_cat = True

            # 6. BR Addition (Logical break)
            if '<br' not in rem.lower() and '<br' in add.lower():
                major_categories["Mantıksal Satır Sonu (BR) Ekleme"] += 1
                found_cat = True

            if not found_cat:
                major_categories["Diğer Yapısal/Semantik İyileştirmeler"] += 1

            if len(examples) < 10:
                examples.append((filename, rem, add))

    print("=== MAJOR DEĞİŞİKLİK ANALİZİ ===\n")
    for cat, count in major_categories.most_common():
        print(f"[{count:4d}] - {cat}")

    print("\n" + "="*40)
    print("Örnek Major Değişimler:")
    for fn, rem, add in examples:
        print(f"\nDosya: {fn}")
        print(f"  [-] {rem[:150]}..." if len(rem)>150 else f"  [-] {rem}")
        print(f"  [+] {add[:150]}..." if len(add)>150 else f"  [+] {add}")

if __name__ == "__main__":
    analyze_major_changes()
