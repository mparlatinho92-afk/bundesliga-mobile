from PIL import Image
import numpy as np
import os

PADDING_PCT = 0.08  # 8% Rand auf jeder Seite
wappen_dir = "Wappen/Vereinswappen"

files = [f for f in os.listdir(wappen_dir) if f.endswith('.png')]
skipped = 0
done = 0

for fname in files:
    path = os.path.join(wappen_dir, fname)
    img = Image.open(path).convert('RGBA')
    arr = np.array(img)
    w, h = img.size

    # Tight bounding box
    rows = np.any(arr[:,:,3] > 0, axis=1)
    cols = np.any(arr[:,:,3] > 0, axis=0)
    if not rows.any():
        skipped += 1
        continue
    rmin, rmax = np.where(rows)[0][[0,-1]]
    cmin, cmax = np.where(cols)[0][[0,-1]]
    content = img.crop((cmin, rmin, cmax+1, rmax+1))
    cw, ch = content.size

    # 8% padding relative to largest dimension
    pad = max(4, int(round(max(cw, ch) * PADDING_PCT)))
    target = max(cw, ch) + pad * 2

    # Paste content centered in square canvas
    out = Image.new('RGBA', (target, target), (0, 0, 0, 0))
    px = (target - cw) // 2
    py = (target - ch) // 2
    out.paste(content, (px, py))
    out.save(path)
    done += 1

print(f"Normalisiert: {done}, Uebersprungen: {skipped}")
