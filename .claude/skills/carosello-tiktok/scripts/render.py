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


PAD_TOP, PAD_BOTTOM = 0.035, 0.025   # aria sopra la testa / sotto i piedi (frazione altezza foto)
WARN = []


def parse_photo(arg):
    """'foto.jpg' oppure 'foto.jpg@top,bottom[,cx]' (frazioni 0-1: cima della testa,
    punta dei piedi, centro orizzontale della persona)."""
    if '@' in arg:
        path, spec = arg.rsplit('@', 1)
        v = [float(x) for x in spec.split(',')]
        return path, v[0], v[1], (v[2] if len(v) > 2 else 0.5)
    return arg, 0.0, 1.0, 0.5


def mirror_fill(strip, width, side):
    """Riempie `width` pixel a lato della foto con il bordo specchiato e sfocato."""
    h = strip.height
    out = Image.new('RGB', (width, h))
    src = ImageOps.mirror(strip)
    x = 0
    while x < width:                       # se il bordo non basta, ripete lo specchio
        out.paste(src, (x, 0))
        x += src.width
        src = ImageOps.mirror(src)
    if side == 'left':
        out = ImageOps.mirror(out)
    return out.filter(ImageFilter.GaussianBlur(22))


def expand(fg, cx_px):
    """Foto più stretta del 4:5: la mette alta 1350 e allarga lo sfondo ai lati."""
    canvas = Image.new('RGB', (W, H))
    x0 = int(min(max(W / 2 - cx_px, 0), W - fg.width))   # persona il più possibile al centro
    gl, gr = x0, W - (x0 + fg.width)
    if gl > 0:
        canvas.paste(mirror_fill(fg.crop((0, 0, min(gl, fg.width), H)), gl, 'left'), (0, 0))
    if gr > 0:
        canvas.paste(mirror_fill(fg.crop((fg.width - min(gr, fg.width), 0, fg.width, H)), gr, 'right'), (x0 + fg.width, 0))
    # sotto la foto metto una sua copia sfocata: così la sfumatura del bordo non crea righe scure
    canvas.paste(fg, (x0, 0))
    canvas = canvas.filter(ImageFilter.GaussianBlur(10))
    feather = 40
    mask = Image.new('L', fg.size, 255)
    d = ImageDraw.Draw(mask)
    for i in range(feather):
        a = int(255 * (i + 1) / feather)
        if gl > 0:
            d.line([(i, 0), (i, H)], fill=a)
        if gr > 0:
            d.line([(fg.width - 1 - i, 0), (fg.width - 1 - i, H)], fill=a)
    canvas.paste(fg, (x0, 0), mask)
    return canvas


def fit(im, top=0.0, bottom=1.0, cx=0.5, name=''):
    """Porta la foto a 4:5 (1080x1350).
    1. Zoom: ritaglia il più vicino possibile alla persona SENZA tagliare testa e piedi.
    2. Se la foto è troppo stretta per il 4:5, la tiene intera in altezza e ALLARGA lo
       sfondo ai lati (bordo specchiato e sfocato)."""
    w, h = im.size
    y0 = max(0, int((top - PAD_TOP) * h))
    y1 = min(h, int((bottom + PAD_BOTTOM) * h))
    ch = y1 - y0
    cw = round(ch * W / H)
    if cw <= w:                                  # zoom: c'è abbastanza larghezza
        x = int(min(max(cx * w - cw / 2, 0), w - cw))
        out = im.crop((x, y0, x + cw, y1)).resize((W, H), Image.LANCZOS)
        scale = H / ch
    else:                                        # troppo stretta: allarga i lati
        band = im.crop((0, y0, w, y1))
        scale = H / ch
        fg = band.resize((round(w * scale), H), Image.LANCZOS)
        out = expand(fg, cx * fg.width)
    if scale > 2.2:
        WARN.append(f'{name}: ingrandita {scale:.1f}x, potrebbe risultare sgranata')
    return out


def inspect(paths, out):
    """Foglio con griglia (ogni 5%) per leggere testa/piedi/centro di ogni foto."""
    th = []
    for i, p in enumerate(paths, 1):
        im = load(p)
        im = im.resize((round(im.width * 600 / im.height), 600))
        d = ImageDraw.Draw(im)
        for k in range(0, 101, 5):
            y = int(k / 100 * (im.height - 1))
            d.line([(0, y), (im.width, y)], fill=(255, 0, 0) if k % 10 == 0 else (255, 160, 160), width=1)
            if k % 10 == 0:
                d.text((2, y + 1), f'{k / 100:.1f}', fill=(255, 255, 0))
        for k in range(10, 100, 10):
            x = int(k / 100 * im.width)
            d.line([(x, 0), (x, im.height)], fill=(0, 200, 255), width=1)
        d.text((im.width - 30, 4), f'#{i}', fill=(0, 255, 0))
        th.append(im)
    sheet = Image.new('RGB', (sum(t.width + 8 for t in th), 600), 'white')
    x = 0
    for t in th:
        sheet.paste(t, (x, 0))
        x += t.width + 8
    sheet.save(out, quality=88)
    print(f'griglia salvata: {out}')


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


def cover(arg, hook_lines, tag, y_start):
    path, t, b, cx = parse_photo(arg)
    img = fit(load(path), t, b, cx, 'copertina')
    y = y_start
    for i, line in enumerate(hook_lines):
        y = boxed_line(img, line.strip(), y - (6 if i else 0), 64, 'white', 'black')
    if tag:
        boxed_line(img, tag.upper(), y + 26, 56, 'white', PURPLE, padx=40, pady=14)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--inspect', help='crea solo il foglio-griglia in questo file e termina')
    ap.add_argument('--out')
    ap.add_argument('--cover', help='foto copertina, anche con @top,bottom,cx')
    ap.add_argument('--hook', help='testo copertina, righe separate da |')
    ap.add_argument('--tag', default='', help='riga viola, es. "Inverno 2027  Over 40"')
    ap.add_argument('--cta', choices=list(CTA))
    ap.add_argument('--text-y', type=int, default=600, help='altezza del primo box (0-1350)')
    ap.add_argument('photos', nargs='+', help='foto interne in ordine: foto.jpg oppure foto.jpg@top,bottom,cx')
    a = ap.parse_args()

    if a.inspect:
        inspect([parse_photo(p)[0] for p in a.photos], a.inspect)
        return
    if not (a.out and a.cover and a.hook and a.cta):
        ap.error('servono --out, --cover, --hook e --cta')
    os.makedirs(a.out, exist_ok=True)
    cover(a.cover, a.hook.split('|'), a.tag, a.text_y).save(os.path.join(a.out, '01.jpg'), quality=92)
    n = 1
    for p in a.photos:
        n += 1
        path, t, b, cx = parse_photo(p)
        fit(load(path), t, b, cx, f'slide {n:02d}').save(os.path.join(a.out, f'{n:02d}.jpg'), quality=92)
    load(CTA[a.cta]).resize((W, H)).save(os.path.join(a.out, f'{n + 1:02d}_cta-{a.cta}.jpg'), quality=92)
    for w in WARN:
        print('ATTENZIONE', w)
    print(f'OK: {n + 1} slide in {a.out}')


if __name__ == '__main__':
    main()
