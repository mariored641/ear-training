"""
Process logo.png to make near-white pixels transparent.
Produces:
  - logo-clear.png:  white → fully transparent (clean cutout on any background)
  - logo-soft.png:   white → 50% transparent (subtle white halo retained)
  - logo-feather.png: soft alpha gradient based on whiteness (smoothest)
"""
from PIL import Image
import os

SRC = os.path.join(os.path.dirname(__file__), '..', 'public', 'logo.png')
OUT_DIR = os.path.dirname(__file__)

img = Image.open(SRC).convert('RGBA')
w, h = img.size
print(f"Loaded {SRC} ({w}x{h})")

def process(threshold=230, white_alpha=0):
    """Pixels where min(R,G,B) >= threshold get their alpha set to white_alpha."""
    out = img.copy()
    pixels = out.load()
    count = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                pixels[x, y] = (r, g, b, white_alpha)
                count += 1
    return out, count

def process_feather(threshold_low=200, threshold_high=255):
    """Smooth alpha based on whiteness: high white → low alpha, gradient between."""
    out = img.copy()
    pixels = out.load()
    span = max(1, threshold_high - threshold_low)
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            m = min(r, g, b)
            if m >= threshold_high:
                pixels[x, y] = (r, g, b, 0)
            elif m >= threshold_low:
                # linear: at threshold_low → full alpha, at threshold_high → 0
                factor = (threshold_high - m) / span
                pixels[x, y] = (r, g, b, int(a * factor))
    return out

clear, n_clear = process(threshold=235, white_alpha=0)
clear.save(os.path.join(OUT_DIR, 'logo-clear.png'))
print(f"logo-clear.png: {n_clear} pixels made transparent")

soft, n_soft = process(threshold=235, white_alpha=128)
soft.save(os.path.join(OUT_DIR, 'logo-soft.png'))
print(f"logo-soft.png: {n_soft} pixels made 50% transparent")

feather = process_feather(threshold_low=210, threshold_high=250)
feather.save(os.path.join(OUT_DIR, 'logo-feather.png'))
print("logo-feather.png: smooth alpha gradient")

print("done")
