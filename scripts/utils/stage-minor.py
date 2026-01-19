import subprocess
import re
import os
import sys
import argparse

# Configuration
QUOTE_MAP = {'“': '"', '”': '"', '‘': "'", '’': "'"}
DASH_REGEX = re.compile(r'[\u2013\u2014\u2212]')

def normalize_text(s):
    if not s:
        return ""
    # Standard normalization
    for q, r in QUOTE_MAP.items():
        s = s.replace(q, r)
    s = DASH_REGEX.sub('-', s)

    # Ellipsis normalization - Three ellipsis entities equal three dots
    s = s.replace('&hellip;', '...')
    s = re.sub(r'[\.\-_]{3,}', '...', s)

    # HTML/BR normalization
    s = re.sub(r'(?:\s*<br\s*/?>\s*)+', ' ', s, flags=re.IGNORECASE)

    # MathML / Wiris
    if '<math' in s or 'wiris.net' in s:
        s = re.sub(r'<[^>]+>', '', s)
        s = re.sub(r'&(?:amp;)?mml=[^&"\s]+', '', s)

    # Normalize self-closing tags (/> -> >)
    s = re.sub(r'(\s*)/+>', '>', s)

    # Normalize spaces around tags (e.g. " <b> " -> "<b>")
    s = re.sub(r'\s*<', '<', s)
    s = re.sub(r'>\s*', '>', s)

    return " ".join(s.replace('&nbsp;', ' ').replace('\xa0', ' ').split())

def is_minor_hunk(h_body, debug=False):
    lines = h_body.splitlines()
    rem = "".join([l[1:] for l in lines if l.startswith('-')])
    add = "".join([l[1:] for l in lines if l.startswith('+')])

    norm_rem = normalize_text(rem)
    norm_add = normalize_text(add)

    is_minor = norm_rem == norm_add

    if debug and not is_minor:
        print("\n❌ HUNK FAILED:")
        print("-" * 20)
        # Showing a bit more for context
        print(f"RAW REM: {rem.strip()[:300]}")
        if len(rem) > 300: print("...")
        print(f"RAW ADD: {add.strip()[:300]}")
        if len(add) > 300: print("...")
        print("-" * 20)
        print(f"NRM REM: {norm_rem[:300]}")
        print(f"NRM ADD: {norm_add[:300]}")
        print("-" * 20)

    return is_minor

def surgical_v6_main():
    parser = argparse.ArgumentParser(description="Analyze and stage minor changes.")
    parser.add_argument("--debug", "-d", action="store_true", help="Enable debug output for failed hunks.")
    parser.add_argument("--file", "-f", type=str, help="Run analysis on a specific file only (substring match).")
    args = parser.parse_args()

    print("🚀 Analyzing changes in data/questions...")

    try:
        # Step 1: Stage all changes first to analyze the full staged diff
        # If a specific file is targeted, we could just add that, but adding all is fine
        subprocess.check_call(['git', 'add', 'data/questions/'])

        # Step 2: Get the diff of all staged files
        cmd = ['git', 'diff', '--cached', '-U0', '--no-color', 'data/questions/']
        diff_output = subprocess.check_output(cmd).decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error getting diff: {e}")
        return

    # 3. Split diff by file
    raw_files = re.split(r'^diff --git ', diff_output, flags=re.MULTILINE)

    major_files = []
    minor_files_count = 0
    total_files = 0

    for f_diff in raw_files:
        if not f_diff.strip(): continue

        lines = f_diff.splitlines()
        # Extract filename (e.g., b/data/questions/anadolu-aof/auditing.json)
        fname_match = re.search(r'b/(data/questions/[^ ]+)', lines[0])
        if not fname_match: continue
        filename = fname_match.group(1)

        # Filter by file argument if provided
        if args.file and args.file not in filename:
            # Not the file we're looking for, but we need to unstage it since we added all
            major_files.append(filename)
            continue

        total_files += 1

        # Check all hunks in this file
        hunk_header_pattern = re.compile(r'^(@@ .*? @@)', re.MULTILINE)
        hunk_matches = list(hunk_header_pattern.finditer(f_diff))

        is_file_minor = True
        if not hunk_matches:
             # Binary or weird change
             is_file_minor = False
        else:
            for idx in range(len(hunk_matches)):
                m = hunk_matches[idx]
                start = m.start()
                next_start = hunk_matches[idx+1].start() if idx+1 < len(hunk_matches) else len(f_diff)
                hunk_full = f_diff[start:next_start]
                # Skip the hunk header (@@ ...)
                body = "\n".join(hunk_full.splitlines()[1:])

                if not is_minor_hunk(body, debug=args.debug):
                    if args.debug:
                        print(f"File {filename} failed at hunk {idx+1}")
                    is_file_minor = False
                    break

        if is_file_minor:
            minor_files_count += 1
            if args.debug:
                 print(f"✅ Staged (minor): {filename}")
        else:
            major_files.append(filename)

    # 4. Unstage major files
    if major_files:
        # Batch reset to avoid command line limits
        batch_size = 100
        for i in range(0, len(major_files), batch_size):
            batch = major_files[i:i+batch_size]
            subprocess.check_call(['git', 'reset', 'HEAD'] + batch, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    print(f"✅ Staged {minor_files_count} files with minor cleanup changes.")
    if major_files:
        print(f"⚠️  Kept {len(major_files)} files unstaged (significant content changes detected).")

if __name__ == "__main__":
    surgical_v6_main()
