#!/usr/bin/env python3
"""Draw the app icon and write every size the page and the app bundle need.

    python3 tools/make-icons.py

One 1024x1024 master is drawn here and then resampled, so the favicon and the
iPhone icon are the same picture, not two drawings that drifted apart.  The
master is also what the Xcode AppIcon set uses, so the icon on the home screen
and the icon in the browser tab are one artefact.

The palette is tokens.css: the gilt cover of the header, the paper of the page,
the vermilion of the hand-drawn "today" ring.  Nothing here uses a colour the
app itself does not already print.

Only the Python standard library and Pillow are required.  The hand face is read
straight out of fonts-i-like/Patrick_Hand.zip so the repo does not carry a second
copy of a font it already has.
"""

import io
import math
import os
import random
import zipfile
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTER = 1024

LEATHER_TOP = (206, 172, 113)
LEATHER_BOTTOM = (150, 114, 62)
PAPER = (251, 244, 228)
INK = (39, 50, 79)
VERMILION = (201, 64, 44)
GILT = (255, 234, 191)
STITCH_DARK = (20, 10, 1)

rng = random.Random(20261011)


def leather(size):
    """The cover: a vertical gilt-to-tan gradient, grain, and a soft vignette."""
    base = Image.new("RGB", (size, size))
    d = ImageDraw.Draw(base)
    for y in range(size):
        t = y / (size - 1)
        d.line([(0, y), (size, y)], fill=tuple(
            round(a + (b - a) * t) for a, b in zip(LEATHER_TOP, LEATHER_BOTTOM)))

    # fine grain, then a coarse mottle: leather is uneven at two scales at once
    fine = Image.effect_noise((size, size), 26).convert("RGB")
    base = Image.blend(base, fine, 0.11)
    coarse = Image.effect_noise((size // 4, size // 4), 40).convert("RGB")
    coarse = coarse.resize((size, size), Image.BICUBIC).filter(ImageFilter.GaussianBlur(6))
    base = Image.blend(base, coarse, 0.10)

    # vignette, so the stitched frame sits in a pool of light
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([-size * 0.22, -size * 0.26, size * 1.22, size * 1.26], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(size * 0.10))
    return Image.composite(base, Image.new("RGB", (size, size), (96, 68, 34)), mask)


def stitch_frame(img):
    """The saddle stitching of the header: slanted waxed thread in a pressed groove."""
    d = ImageDraw.Draw(img, "RGBA")
    a = round(img.width * 0.055)
    b = img.width - a
    step = round(img.width * 0.032)
    slant = img.width * 0.030
    w = max(2, round(img.width * 0.006))

    def stitch(x0, y0, x1, y1):
        d.line([(x0, y0), (x1, y1)], fill=STITCH_DARK + (120,), width=w + 2)   # the needle hole
        d.line([(x0, y0), (x1, y1)], fill=(133, 117, 89) + (255,), width=w)    # shadowed thread
        d.line([(x0 - 2, y0 - 2), (x1 - 2, y1 - 2)], fill=(230, 220, 198) + (255,), width=max(1, w // 2))

    # the two horizontal runs lean one way, the vertical runs the other, like hand work
    for x in range(a, b, step):
        stitch(x, a - slant / 2, min(x + slant, b), a + slant / 2)
        stitch(x, b + slant / 2, min(x + slant, b), b - slant / 2)
    for y in range(a, b, step):
        stitch(a - slant / 2, y, a + slant / 2, min(y + slant, b))
        stitch(b + slant / 2, y, b - slant / 2, min(y + slant, b))


def hand_font(size):
    """Patrick Hand out of the zip: the app's own handwriting, no second copy kept."""
    with zipfile.ZipFile(os.path.join(ROOT, "fonts-i-like", "Patrick_Hand.zip")) as z:
        name = next(n for n in z.namelist() if n.lower().endswith(".ttf"))
        return ImageFont.truetype(io.BytesIO(z.read(name)), size)


def torn_plate(w, h):
    """A page torn from the notebook: jagged top and bottom, straight sides."""
    img = Image.new("RGBA", (w, h), PAPER + (255,))
    d = ImageDraw.Draw(img)
    teeth = 14
    top = [(0, 0)] + [(w * i / teeth + rng.uniform(-w / teeth / 2, w / teeth / 2), rng.uniform(0, h * 0.020)) for i in range(1, teeth)] + [(w, 0)]
    bottom = [(w, h)] + [(w * i / teeth + rng.uniform(-w / teeth / 2, w / teeth / 2), h - rng.uniform(0, h * 0.020)) for i in range(teeth - 1, 0, -1)] + [(0, h)]
    d.polygon(top, fill=(0, 0, 0, 0))
    d.polygon(bottom, fill=(0, 0, 0, 0))
    grain = Image.effect_noise((w, h), 12).convert("RGB")
    out = Image.blend(img.convert("RGB"), grain, 0.05).convert("RGBA")
    out.putalpha(img.getchannel("A"))
    return out


def wobbly_ring(draw, box, colour, width):
    """The hand-drawn ring of the month grid's "today", wobbled rather than an ellipse."""
    cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
    rx, ry = (box[2] - box[0]) / 2, (box[3] - box[1]) / 2
    pts, steps = [], 96
    for i in range(steps + 1):
        a = i / steps * 2 * math.pi
        jitter = 1 + rng.uniform(-0.022, 0.022) + 0.012 * math.sin(a * 3)
        pts.append((cx + rx * math.cos(a) * jitter, cy + ry * math.sin(a) * jitter))
    draw.line(pts, fill=colour, width=width, joint="curve")


def master():
    img = leather(MASTER)
    stitch_frame(img)

    plate = torn_plate(round(MASTER * 0.66), round(MASTER * 0.70)).rotate(-2.4, expand=True, resample=Image.BICUBIC)
    px, py = (MASTER - plate.width) // 2, (MASTER - plate.height) // 2

    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    shadow.paste((28, 14, 0, 210), (px + 4, py + 12), plate.split()[3])
    img = Image.alpha_composite(img.convert("RGBA"), shadow.filter(ImageFilter.GaussianBlur(MASTER * 0.018)))
    img.paste(plate, (px, py), plate)

    d = ImageDraw.Draw(img)
    wobbly_ring(d, (MASTER * 0.285, MASTER * 0.265, MASTER * 0.715, MASTER * 0.735), VERMILION + (255,), round(MASTER * 0.034))

    # The letter is written twice, a hair apart, the way a pen presses harder: down at
    # 32px a single stroke of this hand is one grey pixel and reads as nothing.
    font = hand_font(round(MASTER * 0.34))
    for offset in (0, round(MASTER * 0.007)):
        d.text((MASTER / 2 + offset, MASTER / 2 + MASTER * 0.005), "L", font=font, fill=INK + (255,), anchor="mm")
    return img.convert("RGB")


def main():
    art = master()

    web = os.path.join(ROOT, "web")
    art.resize((180, 180), Image.LANCZOS).save(os.path.join(web, "icon-180.png"))
    art.resize((32, 32), Image.LANCZOS).save(os.path.join(web, "icon-32.png"))

    iconset = os.path.join(ROOT, "ios", "Leatherbound", "Assets.xcassets", "AppIcon.appiconset")
    os.makedirs(iconset, exist_ok=True)
    art.save(os.path.join(iconset, "AppIcon-1024.png"))

    for p in ("web/icon-180.png", "web/icon-32.png", "ios/Leatherbound/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png"):
        print("wrote", p, os.path.getsize(os.path.join(ROOT, p)), "bytes")


if __name__ == "__main__":
    main()
