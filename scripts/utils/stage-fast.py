
import subprocess
import re
import os
import sys

# Configuration
QUOTE_MAP = {'“': '"', '”': '"', '‘': "'", '’': "'"}
DASH_REGEX = re.compile(r'[\u2013\u2014\u2212]')

def normalize_text(s):
    # Standard normalization
    for q, r in QUOTE_MAP.items():
        s = s.replace(q, r)
    s = DASH_REGEX.sub('-', s)

    # Ellipsis normalization
    s = s.replace('&hellip;', '...')
    s = re.sub(r'[\.\-_]{3,}', '...', s)

    # Typo fixes
    s = s.replace('temeli olarak', 'temeliolarak')

    # Leading artifacts
    s = s.lstrip('>').lstrip('&gt;')

    # Empty explanations
    s = s.replace('"explanation": ""', '').replace('"explanation": "",', '')

    # HTML/BR normalization
    s = re.sub(r'(?:\s*<br\s*/?>\s*)+', ' ', s, flags=re.IGNORECASE)

    # MathML / Wiris
    if '<math' in s or 'wiris.net' in s:
        s = re.sub(r'<[^>]+>', '', s)
        s = re.sub(r'&(?:amp;)?mml=[^&"\s]+', '', s)

    return " ".join(s.replace('&nbsp;', ' ').replace('\xa0', ' ').split())

def is_minor_hunk(h_body):
    lines = h_body.splitlines()
    rem = "".join([l[1:] for l in lines if l.startswith('-')])
    add = "".join([l[1:] for l in lines if l.startswith('+')])
    return normalize_text(rem) == normalize_text(add)

def main():
    print("🚀 Starting fast minor-change staging...")

    # 1. Stage everything in data/questions
    print("Step 1: Staging all files in data/questions...")
    subprocess.check_call(['git', 'add', 'data/questions/'])

    # 2. Get full diff of staged changes
    print("Step 2: Analyzing diffs...")
    diff_output = subprocess.check_output(['git', 'diff', '--cached', '-U0', '--no-color', 'data/questions/']).decode('utf-8', errors='ignore')

    # 3. Parse diff by file
    files = re.split(r'^diff --git ', diff_output, flags=re.MULTILINE)

    major_files = []
    minor_files_count = 0

    for f_diff in files:
        if not f_diff.strip(): continue

        lines = f_diff.splitlines()
        # Find filename
        fname_match = re.search(r'b/(data/questions/.*\.json)', lines[0])
        if not fname_match: continue
        filename = fname_match.group(1)

        # Check all hunks in this file
        hunk_header_pattern = re.compile(r'^(@@ .*? @@)', re.MULTILINE)
        hunk_matches = list(hunk_header_pattern.finditer(f_diff))

        is_file_minor = True
        for idx in range(len(hunk_matches)):
            m = hunk_matches[idx]
            start = m.start()
            end = hunk_matches[idx+1].start() if idx+1 < len(hunk_matches) else len(f_diff)
            hunk_full = f_diff[start:end]
            body = "\n".join(hunk_full.splitlines()[1:])

            if not is_minor_hunk(body):
                is_file_minor = False
                break

        if is_file_minor:
            minor_files_count += 1
        else:
            major_files.append(filename)

    # 4. Unstage major files
    if major_files:
        print(f"Step 3: Unstaging {len(major_files)} major files...")
        # Process in batches to avoid command line length limits
        batch_size = 50
        for i in range(0, len(major_files), batch_size):
            batch = major_files[i:i+batch_size]
            subprocess.check_call(['git', 'reset', 'HEAD'] + batch)

    print(f"\n✅ Done!")
    print(f"Staged {minor_files_count} files (minor changes only).")
    print(f"Remained unstaged {len(major_files)} files (contains major changes).")

if __name__ == "__main__":
    main()
