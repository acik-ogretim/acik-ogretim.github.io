import re
import sys

def analyze_paths(svg_content):
    paths = re.findall(r'<path[^>]*d="([^"]*)"', svg_content)
    print(f"Total paths found: {len(paths)}")

    path_extents = []

    for i, d in enumerate(paths):
        # Very rough x coordinate extraction
        # We look for all numbers in the path string
        # This is not a proper SVG parser but should give an idea of distribution
        numbers = [float(x) for x in re.findall(r'-?\d*\.?\d+', d)]
        if not numbers:
            continue

        # Heuristic: X coordinates are usually at even indices (0, 2, 4...) in a flat list of args
        # But SVG commands like V only have Y, H only X. This is tricky.
        # However, typically M x y is the start.

        # Let's just grab the min and max numbers to see range? No, Y can be large.

        # Better heuristic: Look for 'M' or 'L' commands
        # M x y

        ms = re.findall(r'[ML] *(-?\d*\.?\d+)[ ,](-?\d*\.?\d+)', d)
        xs = [float(x) for x, y in ms]

        if xs:
            min_x = min(xs)
            max_x = max(xs)
            path_extents.append((i, min_x, max_x))
            print(f"Path {i}: X range [{min_x:.1f}, {max_x:.1f}]")
        else:
            print(f"Path {i}: Could not parse M/L commands")

    return path_extents

with open('public/icons/universities/ataturk-aof_raw.svg', 'r') as f:
    content = f.read()

print("Analyzing SVG...")
extents = analyze_paths(content)

# We expect a cluster on the left (logo) and a cluster on the right (text)
