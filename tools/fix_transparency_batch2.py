from PIL import Image
import numpy as np

def remove_bg_from_corners(path, tolerance=35):
    """
    Flood-fill background starting from 4 corners.
    Traverses through already-transparent pixels to reach white interior.
    """
    img = Image.open(path).convert('RGBA')
    arr = np.array(img, dtype=np.int32)
    h, w = arr.shape[:2]

    # Sample background color from opaque/semi-opaque corner pixels
    corners = [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]
    bg_samples = []
    for (x, y) in corners:
        a = arr[y, x, 3]
        if a > 10:  # has some color information
            bg_samples.append(arr[y, x, :3].astype(float))
    if not bg_samples:
        # All corners transparent - use white as default bg
        bg_color = np.array([255.0, 255.0, 255.0])
    else:
        bg_color = np.mean(bg_samples, axis=0)

    print(f"  bg_color: R={bg_color[0]:.0f} G={bg_color[1]:.0f} B={bg_color[2]:.0f}")

    visited = np.zeros((h, w), dtype=bool)
    queue = list(corners)
    for (x, y) in corners:
        visited[y, x] = True

    idx = 0
    while idx < len(queue):
        cx, cy = queue[idx]; idx += 1
        # Make transparent
        arr[cy, cx, 3] = 0
        # Expand to neighbors
        for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
            nx, ny = cx+dx, cy+dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx]:
                visited[ny, nx] = True
                a = arr[ny, nx, 3]
                if a == 0:
                    # Already transparent - traverse through it to reach background
                    queue.append((nx, ny))
                else:
                    pixel = arr[ny, nx, :3].astype(float)
                    dist = np.sqrt(np.sum((pixel - bg_color)**2))
                    if dist <= tolerance:
                        queue.append((nx, ny))

    result = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    result.save(path)
    filled = sum(1 for _ in queue)
    print(f"  -> {path} ({filled} pixels removed)")

base = "Wappen/Vereinswappen/"

print("FC Fortuna Mombach:")
remove_bg_from_corners(base + "fcfortunamombach_359.png", tolerance=35)

print("TuS Schaidt:")
remove_bg_from_corners(base + "tusschaidt_382.png", tolerance=40)

print("Done.")
