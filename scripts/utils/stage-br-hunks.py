#!/usr/bin/env python3
"""
Minor HTML değişikliklerini stage eder:
- br tag normalize
- img self-closing
- style attribute kaldırma
- alt="" -> alt
- boşluk ve tire normalize
- blockquote kaldırma
- boş tagları kaldırma
- h3 kaldırma
- tag arası boşluk temizliği (</tag> <tag> → </tag><tag>)
- nested list normalizasyonu (<ol><ol> -> <ol>)
- adjacent list merge (</ol><ol> -> '')
"""
import subprocess
import re
import sys
import argparse
import html

def normalize(text: str) -> str:
    # 0. Decode HTML entities to allow tag matching (e.g. &lt;div&gt; -> <div>)
    t = html.unescape(text)

    # 1. REMOVE all <br> variants completely (treat as whitespace)
    # Also remove HR
    t = re.sub(r'<br\s*/?\s*>', ' ', t, flags=re.IGNORECASE)
    t = re.sub(r'<hr\s*/?\s*>', ' ', t, flags=re.IGNORECASE)

    # 2. Normalize <a ...>text</a> -> text (remove all links, keep text)
    t = re.sub(r'<a\s+(?:[^>]*?)>(.*?)</a>', r'\1', t, flags=re.IGNORECASE)

    # 3. Normalize <img...> to <img.../> (self-closing)
    t = re.sub(r'<img([^>]*?)/?>', r'<img\1/>', t, flags=re.IGNORECASE)

    # 3. Remove style="..." from img tags
    t = re.sub(r'(<img[^>]*?)\s*style="[^"]*"', r'\1', t, flags=re.IGNORECASE)

    # 4. Normalize alt="" to alt
    t = re.sub(r'\s+alt=""', ' alt', t)
    t = re.sub(r'\s+alt=""\s*', ' alt ', t)

    # Remove soft hyphens and other zero-width artifacts
    t = re.sub(r'[\xad\ufeff\u200b]', '', t)

    # Handle AÖF specific control characters (map 1d, 1e, 1f to 'i', remove others)
    # Handle both raw characters and JSON-escaped versions (\u001d, \b, etc.)
    t = re.sub(r'[\x1d\x1e\x1f]|\\u001[def]', 'i', t)
    t = re.sub(r'[\x00-\x1f\x7f]|\\u00(?:0[0-9a-f]|1[0-9a-bc]|20|7f)|\\(?:[bnrtf])', '', t, flags=re.IGNORECASE)

    # 5. REMOVE all dashes/hyphens completely
    t = re.sub(r'[\u2013\u2014\u2212\u2010\u2011\u2012\u2015\-]', '', t)

    # 6. Remove semantic/formatting containers but keep content
    t = re.sub(r'</?(?:blockquote|h[1-6]|section|article|div|span|header|footer|font|strong|b|em|i|u|small|big|code|pre|ul|ol|li|p|table|tbody|tr|td|th)[^>]*>', '', t, flags=re.IGNORECASE)

    # 7. Normalize self-closing tags
    t = re.sub(r'\s*/+>', '>', t)

    # 8. Remove empty tags
    for _ in range(5):
        prev = t
        t = re.sub(r'<(strong|em|ul|ol|li|p|span|div|b|i|u|a|td|tr|th|table|tbody|thead)[^>]*>\s*</\1>', '', t, flags=re.IGNORECASE)
        if t == prev:
            break

    # 9. Aggressive Tag-Adjacent Whitespace Removal (including tables)
    # FIX: Ensure regex group (\1) does NOT include the closing '>' to avoid double '>>' in replacement usually caused by including > in the group.
    s_tags = 'table|tbody|thead|tr|td|th|ul|ol|li|p|div|span|br'
    t = re.sub(r'\s*<(/?(?:' + s_tags + r')[^>]*?)>\s*', r'<\1>', t, flags=re.IGNORECASE)
    t = re.sub(r'<(/?(?:' + s_tags + r')[^>]*?)>\s+<(/?(?:' + s_tags + r')[^>]*?)>', r'<\1><\2>', t, flags=re.IGNORECASE)

    # 10. Normalize multiple spaces
    t = re.sub(r'\s+', ' ', t)

    # 11. Trim spaces inside quotes (fix h3 removal artifacts)
    t = re.sub(r'"\s+', '"', t)
    t = re.sub(r'\s+"', '"', t)

    # 12. Normalize nested lists (ol>ol -> ol)
    t = re.sub(r'<(ul|ol)\b([^>]*)>\s*<\1\b[^>]*>', r'<\1\2>', t, flags=re.IGNORECASE)

    # 13. Merge adjacent lists (</ol><ol> -> '')
    t = re.sub(r'</(ul|ol)>\s*<\1\b[^>]*>', '', t, flags=re.IGNORECASE)

    return t.strip()

def is_minor_change(old_line: str, new_line: str) -> bool:
    """Minor HTML farkı mı kontrol et"""
    # User Request: Always stage explanation changes
    if '"explanation":' in old_line or '"explanation":' in new_line:
        return True

    return normalize(old_line) == normalize(new_line)

def run_git(*args, input_data=None):
    result = subprocess.run(
        ['git'] + list(args),
        capture_output=True,
        text=True,
        input=input_data
    )
    return result

def get_modified_files():
    result = run_git('diff', '--name-only')
    if result.returncode == 0:
        return [f for f in result.stdout.strip().split('\n') if f]
    return []

def get_staged_content(filepath):
    result = run_git('show', f':{filepath}')
    if result.returncode == 0:
        return result.stdout
    return None

def get_working_content(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except:
        return None

def create_blob(content):
    result = run_git('hash-object', '-w', '--stdin', input_data=content)
    if result.returncode == 0:
        return result.stdout.strip()
    return None

def stage_blob(filepath, blob_hash):
    result = run_git('update-index', '--cacheinfo', '100644', blob_hash, filepath)
    return result.returncode == 0

def main():
    parser = argparse.ArgumentParser(description="Stage minor HTML changes line by line.")
    parser.add_argument("--debug", "-d", action="store_true", help="Enable debug output for failed lines.")
    parser.add_argument("--file", "-f", type=str, help="Run analysis on a specific file only (substring match).")
    args = parser.parse_args()

    print("🔍 Değiştirilmiş dosyalar taranıyor...", flush=True)

    files = get_modified_files()
    json_files = [f for f in files if f.endswith('.json') and 'questions' in f]

    if args.file:
        json_files = [f for f in json_files if args.file in f]

    if not json_files:
        print("❌ Değiştirilmiş JSON dosyası bulunamadı.")
        return

    print(f"📊 {len(json_files)} dosya bulundu.", flush=True)

    success_files = 0
    success_lines = 0

    for idx, filepath in enumerate(json_files):
        staged_content = get_staged_content(filepath)
        work_content = get_working_content(filepath)

        if not staged_content or not work_content:
            continue

        staged_lines = staged_content.split('\n')
        work_lines = work_content.split('\n')

        if len(staged_lines) != len(work_lines):
            if args.debug:
                print(f"  [!] {filepath}: Line count mismatch ({len(staged_lines)} vs {len(work_lines)}). Skipping...")
            continue

        new_staged_lines = list(staged_lines)
        changes_in_file = 0

        # Process lines in reverse order to avoid index shifting when staging
        # If we modify line N, lines 0..N-1 indices remain unchanged
        for i in range(len(staged_lines) - 1, -1, -1):
            if staged_lines[i] != work_lines[i]:
                if is_minor_change(staged_lines[i], work_lines[i]):
                    new_staged_lines[i] = work_lines[i]
                    changes_in_file += 1
                elif args.debug:
                    print(f"\n❌ MAJOR CHANGE in {filepath} line {i+1}:")
                    print(f"  OLD RAW : {staged_lines[i].strip()[:2000]}")
                    print(f"  NEW RAW : {work_lines[i].strip()[:2000]}")
                    print(f"  OLD NORM: {normalize(staged_lines[i])}")
                    print(f"  NEW NORM: {normalize(work_lines[i])}")

        if changes_in_file > 0:
            new_staged_content = '\n'.join(new_staged_lines)
            blob_hash = create_blob(new_staged_content)

            if blob_hash and stage_blob(filepath, blob_hash):
                success_files += 1
                success_lines += changes_in_file
                if args.debug or len(json_files) < 10:
                     print(f"  [{idx+1}/{len(json_files)}] ✅ {filepath}: {changes_in_file} satır", flush=True)
        else:
            if (idx + 1) % 200 == 0:
                print(f"  [{idx+1}/{len(json_files)}] tarandı...", flush=True)

    print(f"\n📦 Sonuç: {success_files} dosya, {success_lines} satır eklendi", flush=True)

if __name__ == "__main__":
    main()
