#!/usr/bin/env python3
"""Warm paper seal: one line inside a ring. No streak, no checkmark."""

from PIL import Image, ImageDraw

PAPER = (239, 228, 212)
CLAY = (143, 61, 43)
MOSS = (47, 93, 69)


def draw(size, maskable=False):
    image = Image.new("RGB", (size, size), PAPER)
    pen = ImageDraw.Draw(image)
    margin = int(size * (0.24 if maskable else 0.16))
    width = max(2, size // 42)
    pen.ellipse([margin, margin, size - margin - 1, size - margin - 1], outline=CLAY, width=width)
    line = max(3, size // 26)
    y = int(size * 0.56)
    x0 = int(size * 0.36)
    x1 = int(size * 0.64)
    pen.rounded_rectangle([x0, y - line // 2, x1, y + line // 2], radius=line, fill=CLAY)
    radius = max(2, int(size * 0.028))
    cx, cy = size // 2, int(size * 0.40)
    pen.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=MOSS)
    return image


if __name__ == "__main__":
    outputs = {
        "src/icons/icon-192.png": (192, False),
        "src/icons/icon-512.png": (512, False),
        "src/icons/icon-maskable-512.png": (512, True),
        "src/icons/apple-touch-icon.png": (180, False),
        "src/icons/favicon-32.png": (32, False),
    }
    for path, (size, maskable) in outputs.items():
        draw(size, maskable).save(path)
        print(path)
