import re
import sys

def process_svg():
    input_file = 'public/icons/universities/anadolu-aof_raw.svg'
    output_file = 'public/icons/universities/anadolu-aof.svg'

    with open(input_file, 'r') as f:
        content = f.read()

    # Extract paths
    paths = re.findall(r'<path[^>]*d="([^"]*)"', content)

    kept_paths = []
    min_x = float('inf')
    max_x = float('-inf')
    min_y = float('inf')
    max_y = float('-inf')

    kept_count = 0

    # Analyze original viewbox to get scale
    # viewBox="0 0 119.51 27.76"

    for d in paths:
        # Find start coordinates (M or m)
        # Using a regex that captures the first coordinate pair
        match = re.search(r'[Mm]\s*(-?\d*\.?\d+)\s*[,\s]\s*(-?\d*\.?\d+)', d)
        if not match:
            # Fallback for implicit start or compressed syntax like M10.22
            match = re.search(r'[Mm](-?\d*\.?\d+)', d)

        start_x = 0
        if match:
            start_x = float(match.group(1))

        # Threshold: Logo symbol is usually on the left.
        # Based on previous analysis: Paths start at 10.2, 13.4, 20.07. Text starts at 36.9.
        # So we keep everything starting < 35.
        if start_x < 35:
            kept_paths.append(d)
            kept_count += 1

            # Find extents for this path to calculate bounding box
            # This is rough, extracting all numbers is easier than parsing full SVG path syntax
            # But sufficient for bbox estimation of flat icons
            coords = [float(x) for x in re.findall(r'-?\d*\.?\d+', d)]

            # Since path commands mix X and Y, and sometimes single values, this is heuristics.
            # But typically, X and Y alternate.
            # A safer bet for flat icons without transformations: extract all numbers and find range.
            # NOTE: usage of relative commands (lowercase) makes this arithmetic invalid.
            # However, usually provided SVGs are absolute or follow a pattern.
            # Let's inspect the SVG content provided:
            # d="M10.22,26.54..." uses Absolute M.
            # But "...c.53.17..." uses relative c.
            # Calculating exact bbox from relative paths is hard without a full parser.

            # Heuristic for ViewBox: Use the user's provided Height (27.76) as reference.
            # The logo likely spans 0 to ~30 in X.
            # And 0 to 27.76 in Y.
            # Let's assume the logo keeps the original Y range (approx).
            # We just need to find the correct Width.

            # We know text starts at 36.9. The logo is likely just to the left of that.
            # Let's check the last kept path's max X?
            # It's hard.
            # Better approach: Set viewBox to crop tightly around what we think is the logo.
            # 0 0 35 28 is safe padding.
            pass

    # Reconstruct SVG
    # We will use viewBox="0 0 35 28" to be safe and include everything up to the cutoff.
    # Preserve the original style .cls-1{fill:#a52632;}

    svg_out = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 28"><defs><style>.cls-1{{fill:#a52632;}}</style></defs><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1">'''

    for d in kept_paths:
        svg_out += f'<path class="cls-1" d="{d}"/>'

    svg_out += '</g></g></svg>'

    with open(output_file, 'w') as f:
        f.write(svg_out)

    print(f"Processed {kept_count} paths.")

if __name__ == '__main__':
    process_svg()
