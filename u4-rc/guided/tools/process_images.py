"""Turns the generated PNGs (about 3 MB each) into small web images in guided/img/.

- vignettes: paper lifted to pure white, trimmed to the drawing, padded to a square, 360 px WebP
  (the page lays them over its cards with "multiply", and only pure white disappears completely)
- hero: the middle band, 1200 px wide WebP (it sits under a dark overlay)
- paper: made seamless by mirroring a quarter in both directions, so it can repeat with no visible seams
- favicon from the capacitor vignette

usage: python3 guided/tools/process_images.py <folder with the PNGs>
The image list and the prompts are in guided/tools/JOBS.md.
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops

SRC = Path(sys.argv[1])
OUT = Path(__file__).resolve().parent.parent / "img"
VIGNETTES = ["st-intro", "st-sim", "st-lp", "st-hp", "st-final", "hint", "formula", "stopwatch", "res-great", "res-keep"]
WHITE = (255, 255, 255)


def trim_square(im, size, pad=0.04):
    paper = im.getpixel((3, 3))                 # the flat off-white the vignette was drawn on
    diff = ImageChops.difference(im, Image.new("RGB", im.size, paper)).convert("L").point(lambda v: 255 if v > 18 else 0)
    box = diff.getbbox() or (0, 0, *im.size)
    im = Image.merge("RGB", [ch.point(lambda v, g=255 / max(1, p): min(255, round(v * g))) for ch, p in zip(im.split(), paper)])
    im = im.crop(box)
    side = int(max(im.size) * (1 + 2 * pad))
    sq = Image.new("RGB", (side, side), WHITE)
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    return sq.resize((size, size), Image.LANCZOS)


OUT.mkdir(exist_ok=True)
for name in VIGNETTES:
    trim_square(Image.open(SRC / f"{name}.png").convert("RGB"), 360).save(OUT / f"{name}.webp", quality=82, method=6)

hero = Image.open(SRC / "hero.png").convert("RGB")
w = 1200
h = round(hero.height * w / hero.width)
hero = hero.resize((w, h), Image.LANCZOS)
band = 500
top = max(0, (h - band) // 2)
hero.crop((0, top, w, min(h, top + band))).save(OUT / "hero.webp", quality=66, method=6)

paper = Image.open(SRC / "paper.png").convert("RGB")
q = paper.crop((paper.width // 4, paper.height // 4, paper.width // 4 + paper.width // 2, paper.height // 4 + paper.height // 2)).resize((210, 210), Image.LANCZOS)
tile = Image.new("RGB", (420, 420))
tile.paste(q, (0, 0))
tile.paste(q.transpose(Image.FLIP_LEFT_RIGHT), (210, 0))
tile.paste(q.transpose(Image.FLIP_TOP_BOTTOM), (0, 210))
tile.paste(q.transpose(Image.ROTATE_180), (210, 210))
tile.save(OUT / "paper.webp", quality=70, method=6)

trim_square(Image.open(SRC / "st-lp.png").convert("RGB"), 96).save(OUT / "favicon.png")
print("written to", OUT)
