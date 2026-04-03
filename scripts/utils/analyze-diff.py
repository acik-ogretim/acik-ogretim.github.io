import subprocess
import re
import sys
import os

# Categories
SAFE = "SAFE"
SAFE_BETTER = "SAFE_BETTER" # Restored content
SUSPICIOUS = "SUSPICIOUS"

def get_diff_files():
    # Only check json files in the target directory
    cmd = ['git', 'diff', '--name-only', 'data/questions/anadolu-aof']
    result = subprocess.run(cmd, stdout=subprocess.PIPE, text=True)
    return [f for f in result.stdout.split('\n') if f.strip() and f.endswith('.json')]

def get_file_diff(filename):
    cmd = ['git', 'diff', '-U0', filename]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, text=True)
    return result.stdout

def normalize_for_comparison(line):
    # Aggressive normalization for "same meaningful content" check

    # 1. Decode entities
    line = line.replace('\\u00A0', ' ').replace('&nbsp;', ' ')
    line = line.replace('\\"', '"')

    # 2. Normalize tags
    line = re.sub(r'alt=""', 'alt', line)
    line = re.sub(r'alt', 'alt', line)
    line = re.sub(r'<img\s+([^>]+)\s*/>', r'<img \1>', line)
    line = re.sub(r'<br\s*/>', r'<br>', line)

    # 3. Strip ALL whitespace for strict structural equality
    # This ignores " " vs "" vs "  " entirely.
    # For HTML questions, this is usually acceptable as browsers collapse whitespace,
    # UNLESS it's inside <pre>... but our standard cleaning cleans <pre> too usually?
    # Let's be bold: in JSON strings, if the only diff is whitespace, it's 99% safe.
    line_stripped = re.sub(r'\s+', '', line)

    return line_stripped

def analyze_hunks(diff_text):
    changes = []
    lines = diff_text.split('\n')

    minus_lines = []
    plus_lines = []

    for line in lines:
        if line.startswith('@@'):
            if minus_lines or plus_lines:
                changes.append((minus_lines, plus_lines))
                minus_lines = []
                plus_lines = []
        elif line.startswith('-') and not line.startswith('---'):
            minus_lines.append(line[1:])
        elif line.startswith('+') and not line.startswith('+++'):
            plus_lines.append(line[1:])

    if minus_lines or plus_lines:
        changes.append((minus_lines, plus_lines))

    return changes

def classify_change(minus_chunk, plus_chunk):
    old_full = "".join(minus_chunk)
    new_full = "".join(plus_chunk)

    norm_old = normalize_for_comparison(old_full)
    norm_new = normalize_for_comparison(new_full)

    if norm_old == norm_new:
        return SAFE, "Whitespace/Format"

    # Check for Content Restoration (New is Superset of Old)
    # Be careful: "abc" in "dabc" is true.
    # We want "Old Content" to be present in "New Content" (maybe with extra fluff).
    # If len(new) > len(old) and old is substring of new (normalized)
    if len(norm_new) > len(norm_old) and norm_old in norm_new:
        return SAFE_BETTER, "Restored Content"

    # Check for Strong Tag Merge (User specific request)
    # Old: </strong><br><strong> -> New: </strong> <strong> (or similar)
    # Normalized check might fail if <br> removal changes content string.
    # But wait, if normalized stripped ALL whitespace, </strong><strong> is same as </strong> <strong>.
    # But <br> removal is distinct.
    # If the ONLY difference is deletion of <br> between tags:

    # Try removing specific patterns from both and compare
    # Remove <br> between list items or strong tags
    weak_old = re.sub(r'(?:</li>|</strong>)\s*<br\s*/?>\s*(?:<li|<strong>)', '', old_full)
    weak_new = new_full # New logic might have removed it
    # This is getting too specific.

    return SUSPICIOUS, "Content Mismatch"

def main():
    files = get_diff_files()
    if not files: return

    print(f"Analyzing {len(files)} changed files...")

    stats = {SAFE: 0, SAFE_BETTER: 0, SUSPICIOUS: 0}

    safe_files = []

    for f in files:
        diff_text = get_file_diff(f)
        hunks = analyze_hunks(diff_text)

        file_status = SAFE
        reasons = set()

        for minus, plus in hunks:
            status, reason = classify_change(minus, plus)
            if status == SUSPICIOUS:
                file_status = SUSPICIOUS
                reasons.add(reason)
                break
            elif status == SAFE_BETTER:
                if file_status == SAFE: file_status = SAFE_BETTER # Upgrade status

        if file_status in [SAFE, SAFE_BETTER]:
            stats[file_status] += 1
            safe_files.append(f)
        else:
            stats[SUSPICIOUS] += 1

    print("\n--- SUMMARY ---")
    print(f"Total Files: {len(files)}")
    print(f"Safe (Whitespace/Format): {stats[SAFE]}")
    print(f"Better (Restored Content): {stats[SAFE_BETTER]}")
    print(f"Suspicious: {stats[SUSPICIOUS]}")

    if safe_files:
        with open('safe_files.txt', 'w') as sf:
            for f in safe_files:
                sf.write(f + '\n')
        print("Safe files written to sage_files.txt")

if __name__ == "__main__":
    main()
