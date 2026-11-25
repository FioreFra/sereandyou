#!/usr/bin/env python3
"""Compone le slide di un carosello TikTok Sere&You (1080x1350, 4:5).

Esempio:
  python3 render.py --out /tmp/post --cover foto_copertina.jpg \
      --hook "Outfit da Fashion Week…|Cervicale da Voltaren 🤣" \
      --tag "Inverno 2027  Over 40" --cta whatsapp foto2.jpg foto3.jpg ...

Output: 01.jpg (copertina), 02.jpg … (un outfit per slide), NN_cta-<tipo>.jpg (slide finale).
"""
import argparse
import os
import re

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

W, H = 1080, 1350
PURPLE = (121, 42, 197)  # #792AC5
SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERIF = os.path.join(SKILL, 'assets', 'fonts', 'PlayfairDisplay.ttf')
CTA = {'segui': os.path.join(SKILL, 'assets', 'cta_segui.png'),
       'whatsapp': os.path.join(SKILL, 'assets', 'cta_whatsapp.png')}
EMOJI_FONTS = ['/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf',
               '/usr/share/fonts/noto/NotoColorEmoji.ttf']
EMOJI_RE = re.compile('([\U0001F000-\U0001FAFF☀-➿⭐✨]️?)')
MAX_TEXT_W = W - 2 * 60


def load(path):
    return ImageOps.exif_transpose(Image.open(path)).convert('RGB')


def fit(im):
    """Porta la foto a 4:5.
    Foto quasi 4:5 -> ritaglio. Foto lunghe (9:16, 2:3) -> intera su sfondo sfocato,
    così non si tagliano testa e scarpe."""
    r = im.width / im.height
    if 0.72 <= r <= 0.9:
        s = max(W / im.width, H / im.height)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        x = (im.width - W) // 2
        y = max(0, int((im.height - H) * 0.35))
        return im.crop((x, y, x + W, y + H))
    bg = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    by = max(0, (bg.height - H) // 2)
    bg = bg.crop((0, by, W, by + min(H, bg.height))).resize((W, H))
    bg = Image.blend(bg.filter(ImageFilter.GaussianBlur(40)), Image.new('RGB', (W, H)), 0.15)
    s = H / im.height
    fg = im.resize((round(im.width * s), H), Image.LANCZOS)
    if fg.width > W:
        off = (fg.width - W) // 2
        fg = fg.crop((off, 0, off + W, H))
    bg.paste(fg, ((W - fg.width) // 2, 0))
    return bg


def emoji_img(ch, size):
    path = next((p for p in EMOJI_FONTS if os.path.exists(p)), None)
    if not path:
        return None
    f = ImageFont.truetype(path, 109)
    im = Image.new('RGBA', (150, 150), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((0, 0), ch, font=f, embedded_color=True)
    bbox = im.getbbox()
    if not bbox:
        return None
    im = im.crop(bbox)
    return im.resize((size, round(im.height * size / im.width)), Image.LANCZOS)


def boxed_line(img, text, y, size, fg, bg, padx=28, pady=12):
    """Riga di testo (con emoji) in un box pieno, centrata. Riduce il font se troppo lunga."""
    d = ImageDraw.Draw(img)
    parts = [p for p in EMOJI_RE.split(text) if p]
    while True:
        font = ImageFont.truetype(SERIF, size)
        asc, desc = font.getmetrics()
        esz = int(asc * 0.95)
        widths = [esz + 8 if EMOJI_RE.fullmatch(p) else d.textlength(p, font=font) for p in parts]
        if sum(widths) + 2 * padx <= MAX_TEXT_W + 2 * padx or size <= 36:
            break
        size -= 2
    tw, h = sum(widths), asc + desc
    x0 = (W - tw) / 2
    d.rectangle((x0 - padx, y, x0 + tw + padx, y + h + 2 * pady), fill=bg)
    x = x0
    for p, w in zip(parts, widths):
        if EMOJI_RE.fullmatch(p):
            e = emoji_img(p[0], esz)
            if e:
                img.paste(e, (int(x + 4), int(y + pady + (asc - e.height) * 0.6)), e)
        else:
            d.text((x, y + pady), p, font=font, fill=fg)
        x += w
    return y + h + 2 * pady


def cover(path, hook_lines, tag, y_start):
    img = fit(load(path))
    y = y_start
    for i, line in enumerate(hook_lines):
        y = boxed_line(img, line.strip(), y - (6 if i else 0), 64, 'white', 'black')
    if tag:
        boxed_line(img, tag.upper(), y + 26, 56, 'white', PURPLE, padx=40, pady=14)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--cover', required=True, help='foto per la copertina')
    ap.add_argument('--hook', required=True, help='testo copertina, righe separate da |')
    ap.add_argument('--tag', default='', help='riga viola, es. "Inverno 2027  Over 40"')
    ap.add_argument('--cta', choices=list(CTA), required=True)
    ap.add_argument('--text-y', type=int, default=600, help='altezza del primo box (0-1350)')
    ap.add_argument('photos', nargs='+', help='foto delle slide interne, in ordine')
    a = ap.parse_args()

    os.makedirs(a.out, exist_ok=True)
    cover(a.cover, a.hook.split('|'), a.tag, a.text_y).save(os.path.join(a.out, '01.jpg'), quality=92)
    n = 1
    for p in a.photos:
        n += 1
        fit(load(p)).save(os.path.join(a.out, f'{n:02d}.jpg'), quality=92)
    load(CTA[a.cta]).resize((W, H)).save(os.path.join(a.out, f'{n + 1:02d}_cta-{a.cta}.jpg'), quality=92)
    print(f'OK: {n + 1} slide in {a.out}')


if __name__ == '__main__':
    main()
