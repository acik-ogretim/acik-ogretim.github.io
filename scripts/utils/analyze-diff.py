import sys
import subprocess
import re
import json

def get_diff(file_path):
    cmd = ['git', 'diff', '-U0', file_path]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, text=True)
    return result.stdout

def analyze_diff(diff_output):
    lines = diff_output.split('\n')
    changes = []

    current_hunk = {'minus': [], 'plus': []}

    for line in lines:
        if line.startswith('@@'):
            if current_hunk['minus'] or current_hunk['plus']:
                changes.append(current_hunk)
            current_hunk = {'minus': [], 'plus': []}
        elif line.startswith('-') and not line.startswith('---'):
            current_hunk['minus'].append(line[1:])
        elif line.startswith('+') and not line.startswith('+++'):
            current_hunk['plus'].append(line[1:])

    if current_hunk['minus'] or current_hunk['plus']:
        changes.append(current_hunk)

    return changes

def print_analysis(changes):
    print(f"Found {len(changes)} changed blocks.")
    for i, hunk in enumerate(changes):
        print(f"\n--- Block {i+1} ---")

        # Try to match lines if likely one-to-one
        m_lines = hunk['minus']
        p_lines = hunk['plus']

        # Heuristic: just print them
        for m in m_lines:
            print(f"[-] {m.strip()}")
        for p in p_lines:
            print(f"[+] {p.strip()}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 analyze-diff.py <file_path>")
        sys.exit(1)

    fpath = sys.argv[1]
    diff = get_diff(fpath)
    if not diff:
        print("No diff found.")
    else:
        changes = analyze_diff(diff)
        print_analysis(changes)
