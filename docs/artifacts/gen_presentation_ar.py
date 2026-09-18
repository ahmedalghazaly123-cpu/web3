# -*- coding: utf-8 -*-
"""
LearnPilot — Premium Arabic (RTL) presentation generator.

Visual language: cinematic 2.5D — real isometric 3D geometry, glass surfaces,
volumetric glows, perspective floors and layered depth, all rendered with
Pillow at 2x supersampling; every word stays native PowerPoint text so the
Arabic shaping, RTL flow and editability are preserved.

Run:      python docs/artifacts/gen_presentation_ar.py
Outputs:  docs/artifacts/assets_ar/slide_NN.png   (3D background art)
          docs/artifacts/LearnPilot_Ar_Presentation.pptx
Verify:   python docs/artifacts/gen_presentation_ar.py --validate
"""

import math
import os
import random
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import nsdecls, qn
from pptx.oxml import parse_xml
from pptx.util import Emu, Inches, Pt

# ─────────────────────────────── output paths ────────────────────────────────
HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets_ar")
PPTX_OUT = os.path.join(HERE, "LearnPilot_Ar_Presentation.pptx")

# ───────────────────────────────── geometry ──────────────────────────────────
W, H = 2000, 1125            # design canvas (px) == 13.333 x 7.5 in
SS = 2                       # supersampling factor
PX_PER_IN = W / 13.333       # 150 px per inch
M = 96                       # safe margin
FONT = "Segoe UI"            # ships with Arabic + Latin glyphs on Windows

# ────────────────────────────────── palette ──────────────────────────────────
INK      = (0x05, 0x07, 0x0F)
INK_2    = (0x0A, 0x10, 0x24)
NAVY     = (0x0E, 0x15, 0x26)
GLASS    = (0x14, 0x1C, 0x33)
BLUE     = (0x3B, 0x74, 0xFF)
CYAN     = (0x22, 0xD3, 0xEE)
VIOLET   = (0x7C, 0x5C, 0xFF)
TEAL     = (0x2D, 0xD4, 0xBF)
AMBER    = (0xF5, 0x9E, 0x0B)
GREEN    = (0x34, 0xD3, 0x99)
ROSE     = (0xFB, 0x71, 0x85)
WHITE    = (0xFF, 0xFF, 0xFF)
MUTED    = (0x9F, 0xAD, 0xC7)
DIM      = (0x6E, 0x7D, 0x99)
TEXT     = (0xEE, 0xF3, 0xFB)

TOTAL_SLIDES = 16


def mix(c1, c2, t):
    """Linear blend between two RGB tuples."""
    return tuple(int(round(a + (b - a) * t)) for a, b in zip(c1, c2))


def rgba(c, a=255):
    return (c[0], c[1], c[2], int(a))


# ───────────────────────────── canvas primitives ─────────────────────────────
def vgrad(size, top, bottom):
    mask = Image.linear_gradient("L").resize(size, Image.BILINEAR)
    return Image.composite(Image.new("RGB", size, bottom),
                           Image.new("RGB", size, top), mask)


# ── coordinate systems ──
# Design space is 2000x1125. Render space is 4000x2250 (SS=2).
# ALL slide code uses design coords; ONLY low-level raster ops scale by SS.
def S(v):
    return int(round(v * SS))


def canvas_new():
    return vgrad((W * SS, H * SS), INK, INK_2).convert("RGBA")


def new_layer(size=None):
    return Image.new("RGBA", size or (W * SS, H * SS), (0, 0, 0, 0))


def glow(canvas, cx, cy, rx, ry, color, strength=1.0, falloff=1.7, alpha=255):
    """Soft volumetric light blob. (design coords in, SS handled inside)"""
    cx, cy = S(cx), S(cy)
    rx, ry = max(2, S(rx)), max(2, S(ry))
    size = (rx * 2, ry * 2)
    g = Image.radial_gradient("L").resize(size, Image.BILINEAR)
    a = g.point(lambda v: int((1.0 - v / 255.0) ** falloff * 255 * strength))
    if alpha < 255:
        a = a.point(lambda v: int(v * alpha / 255))
    blob = Image.new("RGBA", size, rgba(color, 255))
    blob.putalpha(a)
    canvas.alpha_composite(blob, (cx - rx, cy - ry))
def poly_fill(canvas, pts, top, bottom, alpha=255, blur_px=0):
    """Fill an arbitrary polygon with a vertical gradient (design coords)."""
    pts = [(S(x), S(y)) for (x, y) in pts]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    x0, y0 = int(min(xs)) - 2, int(min(ys)) - 2
    w, h = int(max(xs)) + 3 - x0, int(max(ys)) + 3 - y0
    if w <= 1 or h <= 1:
        return
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).polygon([(p[0] - x0, p[1] - y0) for p in pts], fill=alpha)
    if blur_px:
        mask = mask.filter(ImageFilter.GaussianBlur(blur_px))
    grad = vgrad((w, h), top, bottom).convert("RGBA")
    layer.paste(grad, (0, 0), mask)
    canvas.alpha_composite(layer, (x0, y0))


def glass_panel_shadow(canvas, x, y, w, h, radius=22):
    """Soft drop shadow for a glass panel (design coords in)."""
    x, y, w, h = S(x), S(y), S(w), S(h)
    radius = S(radius)
    mg = S(46)
    sh = Image.new("RGBA", (w + mg * 2, h + mg * 2), (0, 0, 0, 0))
    ImageDraw.Draw(sh, "RGBA").rounded_rectangle(
        [mg + S(6), mg + S(16), mg + w + S(6), mg + h + S(16)],
        radius, fill=(0, 0, 0, 165))
    canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(S(15))),
                           (x - mg, y - mg))


def glass_panel(canvas, x, y, w, h, radius=22, tint=GLASS, alpha=228, border=38,
                accent=None, accent_w=6, glow_color=None, glow_alpha=0.16,
                shadow=True, top_hl=True):
    """Frosted glass slab (design coords in, SS handled inside)."""
    if shadow:
        glass_panel_shadow(canvas, x, y, w, h, radius)
    if glow_color:
        glow(canvas, x + w / 2, y + h / 2, w * 0.72, h * 0.95,
             glow_color, glow_alpha, 2.0)
    x, y, w, h = S(x), S(y), S(w), S(h)
    radius = S(radius)

    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius, fill=alpha)
    grad = vgrad((w, h), mix(tint, WHITE, 0.10), mix(tint, INK, 0.35)).convert("RGBA")
    layer.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(layer, "RGBA")
    d.rounded_rectangle([1, 1, w - 2, h - 2], radius,
                        outline=(255, 255, 255, border), width=max(1, S(1.1)))
    if top_hl:
        d.line([(radius, S(2)), (w - radius, S(2))],
               fill=(255, 255, 255, min(255, int(border * 1.6))),
               width=max(1, S(0.9)))
    canvas.alpha_composite(layer, (x, y))

    if accent:
        aw, m10 = S(accent_w), S(10)
        ax0 = x + w - aw - m10
        inset = int(min(S(26), h * 0.22))
        layer = Image.new("RGBA", (aw + S(40), h), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer, "RGBA")
        box = [S(20), inset, S(20) + aw, h - inset]
        d.rounded_rectangle(box, max(1, int(aw / 2)), fill=rgba(accent, 235))
        canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(S(0.6))),
                               (int(ax0 - S(20)), y))
        glow(canvas, x / SS + w / SS - accent_w - 10, y / SS + (h / SS) / 2,
             30, (h / SS) * 0.31, accent, 0.30, 2.0)


ISO_KX, ISO_KY = 0.866025, 0.5


def iso_pt(cx, cy, gx, gy, gz):
    # iso grid units stay in caller space; caller passes render-space via S()
    return (cx + (gx - gy) * ISO_KX, cy + (gx + gy) * ISO_KY - gz)


def iso_box(canvas, cx, cy, w, d, h, base, top_tint=0.42, alpha=255,
            edge=(255, 255, 255, 30), shadow=True):
    """Isometric box (design coords in, SS handled inside)."""
    cx, cy = S(cx), S(cy)
    w, d, h = S(w), S(d), S(h)
    if shadow:
        pts = [iso_pt(cx, cy, 0, 0, 0), iso_pt(cx, cy, w, 0, 0),
               iso_pt(cx, cy, w, d, 0), iso_pt(cx, cy, 0, d, 0)]
        sh = new_layer()
        ImageDraw.Draw(sh, "RGBA").polygon(pts, fill=(0, 0, 0, 150))
        sh = sh.filter(ImageFilter.GaussianBlur(S(16)))
        sh = sh.transform(sh.size, Image.AFFINE, (1, 0, 0, 0, 1, -S(10)),
                          resample=Image.BILINEAR)
        canvas.alpha_composite(sh)

    top = [iso_pt(cx, cy, 0, 0, h), iso_pt(cx, cy, w, 0, h),
           iso_pt(cx, cy, w, d, h), iso_pt(cx, cy, 0, d, h)]
    right = [iso_pt(cx, cy, w, 0, h), iso_pt(cx, cy, w, d, h),
             iso_pt(cx, cy, w, d, 0), iso_pt(cx, cy, w, 0, 0)]
    front = [iso_pt(cx, cy, 0, d, h), iso_pt(cx, cy, w, d, h),
             iso_pt(cx, cy, w, d, 0), iso_pt(cx, cy, 0, d, 0)]

    light = mix(base, WHITE, top_tint)
    _poly_ss(canvas, right, mix(base, INK, 0.28), mix(base, INK, 0.52), alpha)
    _poly_ss(canvas, front, mix(base, INK, 0.45), mix(base, INK, 0.66), alpha)
    _poly_ss(canvas, top, mix(light, WHITE, 0.10), light, alpha)

    dd = ImageDraw.Draw(canvas, "RGBA")
    dd.polygon(top, outline=edge, width=max(1, S(0.8)))
    dd.line([front[0], front[3]], fill=edge, width=max(1, S(0.8)))
    dd.line([right[0], right[3]], fill=edge, width=max(1, S(0.8)))


def _poly_ss(canvas, pts, top, bottom, alpha=255, blur_px=0):
    """poly_fill variant for points ALREADY in render space."""
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    x0, y0 = int(min(xs)) - 2, int(min(ys)) - 2
    w, h = int(max(xs)) + 3 - x0, int(max(ys)) + 3 - y0
    if w <= 1 or h <= 1:
        return
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).polygon([(p[0] - x0, p[1] - y0) for p in pts], fill=alpha)
    if blur_px:
        mask = mask.filter(ImageFilter.GaussianBlur(blur_px))
    grad = vgrad((w, h), top, bottom).convert("RGBA")
    layer.paste(grad, (0, 0), mask)
    canvas.alpha_composite(layer, (x0, y0))


def glow_line(canvas, p0, p1, color, width=3.0, glow_px=16, alpha=215,
              arrow=True, dashed=False, arrow_len=22):
    """Tapered connector with volumetric glow and arrow head. (design coords)"""
    p0 = (S(p0[0]), S(p0[1]))
    p1 = (S(p1[0]), S(p1[1]))
    glow_px_ss, width_ss, arrow_ss = S(glow_px), S(width), S(arrow_len)
    mg = int(glow_px_ss * 3 + arrow_ss * 2)
    x0 = int(min(p0[0], p1[0])) - mg
    y0 = int(min(p0[1], p1[1])) - mg
    size = (int(abs(p1[0] - p0[0]) + mg * 2), int(abs(p1[1] - p0[1]) + mg * 2))
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    a, b = (p0[0] - x0, p0[1] - y0), (p1[0] - x0, p1[1] - y0)
    d = ImageDraw.Draw(layer, "RGBA")
    if dashed:
        steps = max(2, int(math.dist(a, b) / S(14)))
        for i in range(steps):
            t0, t1 = i / steps, (i + 0.55) / steps
            d.line([(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0),
                    (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1)],
                   fill=rgba(color, alpha), width=max(1, width_ss))
    else:
        d.line([a, b], fill=rgba(color, alpha), width=max(1, width_ss))
    if arrow:
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        L = arrow_ss
        d.polygon([b,
                   (b[0] - L * math.cos(ang - 0.42), b[1] - L * math.sin(ang - 0.42)),
                   (b[0] - L * math.cos(ang + 0.42), b[1] - L * math.sin(ang + 0.42))],
                  fill=rgba(color, min(255, alpha + 35)))
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(max(1, glow_px_ss // 2))),
                           (x0, y0))
    canvas.alpha_composite(layer, (x0, y0))


def ring(canvas, cx, cy, rx, ry, color, width=2.5, alpha=140, glow_px=14, dash=None):
    """Glowing orbit ring (design coords)."""
    cx, cy = S(cx), S(cy)
    rx, ry = S(rx), S(ry)
    mg = S(glow_px) * 3
    size = (int(rx * 2 + mg * 2), int(ry * 2 + mg * 2))
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, "RGBA")
    box = [mg, mg, mg + rx * 2, mg + ry * 2]
    if dash:
        t = 0.0
        while t < 360:
            d.arc(box, t, min(t + dash, 360), fill=rgba(color, alpha),
                  width=max(1, S(width)))
            t += dash * 2
    else:
        d.ellipse(box, outline=rgba(color, alpha), width=max(1, S(width)))
    off = (int(cx - rx - mg), int(cy - ry - mg))
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(max(1, S(glow_px) // 2))), off)
    canvas.alpha_composite(layer, off)


def sphere(canvas, cx, cy, r, color, tint_top=0.55, spec=True):
    """Glossy 3D sphere with contact shadow and specular highlight (design coords)."""
    cx, cy, r = S(cx), S(cy), S(r)
    size = (r * 2, r * 2)
    big = Image.radial_gradient("L").resize((int(r * 2.6), int(r * 2.6)), Image.BILINEAR)
    off = int(r * 0.55)
    g = big.crop((off, off, off + r * 2, off + r * 2))
    ball = Image.composite(Image.new("RGB", size, mix(color, INK, 0.74)),
                           Image.new("RGB", size, mix(color, WHITE, tint_top)),
                           g).convert("RGBA")
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).ellipse([0, 0, r * 2 - 1, r * 2 - 1], fill=255)
    ball.putalpha(mask)
    sh = new_layer()
    ImageDraw.Draw(sh, "RGBA").ellipse(
        [cx - r * 0.95, cy + r * 0.70, cx + r * 0.95, cy + r * 1.12], fill=(0, 0, 0, 165))
    canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(S(14))))
    glow(canvas, cx / SS, cy / SS, (r / SS) * 2.1, (r / SS) * 2.1, color, 0.30, 2.0)
    canvas.alpha_composite(ball, (int(cx - r), int(cy - r)))
    if spec:
        sp = new_layer()
        ImageDraw.Draw(sp, "RGBA").ellipse(
            [cx - r * 0.52, cy - r * 0.74, cx - r * 0.02, cy - r * 0.32],
            fill=(255, 255, 255, 150))
        canvas.alpha_composite(sp.filter(ImageFilter.GaussianBlur(S(7))))


def floor_grid(canvas, vp, y_horizon, y_bottom, rays=26, steps=9,
               color=BLUE, alpha=95):
    """Cinematic perspective floor that fades into the horizon. (design coords)"""
    vp = (S(vp[0]), S(vp[1]))
    y_horizon, y_bottom = S(y_horizon), S(y_bottom)
    layer = new_layer()
    d = ImageDraw.Draw(layer, "RGBA")
    for i in range(rays + 1):
        t = i / rays
        x = int(vp[0] + (t - 0.5) * 3.6 * W * SS)
        d.line([vp, (x, y_bottom)], fill=rgba(color, alpha), width=max(1, int(0.7 * SS)))
    for k in range(steps):
        y = y_horizon + (y_bottom - y_horizon) * ((k + 1) / steps) ** 1.75
        d.line([(0, y), (W * SS, y)], fill=rgba(color, alpha), width=max(1, int(0.7 * SS)))
    fade = Image.linear_gradient("L").resize(layer.size, Image.BILINEAR)
    fade = fade.point(lambda v: int((v / 255.0) ** 1.5 * 255))
    layer.putalpha(ImageChops.multiply(layer.getchannel("A"), fade))
    canvas.alpha_composite(layer)


def particles(canvas, n=140, seed=7, color=CYAN, alpha_max=130):
    rnd = random.Random(seed)
    layer = new_layer()
    d = ImageDraw.Draw(layer, "RGBA")
    for _ in range(n):
        x = rnd.uniform(0, W * SS)
        y = rnd.uniform(0, H * SS)
        r = rnd.uniform(0.9, 3.4) * SS
        d.ellipse([x - r, y - r, x + r, y + r],
                  fill=rgba(color, int(rnd.uniform(20, alpha_max))))
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(1.1 * SS)))


def sparkles(canvas, spots, color=WHITE, alpha=190):
    for (cx, cy, s) in spots:
        cx, cy = S(cx), S(cy)
        layer = new_layer()
        d = ImageDraw.Draw(layer, "RGBA")
        s = s * SS
        d.line([(cx - s, cy), (cx + s, cy)], fill=rgba(color, alpha),
               width=max(1, int(1.2 * SS)))
        d.line([(cx, cy - s), (cx, cy + s)], fill=rgba(color, alpha),
               width=max(1, int(1.2 * SS)))
        canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(1.6 * SS)))
        canvas.alpha_composite(layer)


def vignette(canvas, strength=0.72):
    g = Image.radial_gradient("L").resize(canvas.size, Image.BILINEAR)
    a = g.point(lambda v: int((v / 255.0) ** 1.35 * 255 * strength))
    layer = Image.new("RGBA", canvas.size, rgba(INK, 0))
    layer.putalpha(a)
    canvas.alpha_composite(layer)


def grain(canvas, amount=0.05):
    noise = Image.effect_noise(canvas.size, 26).convert("L")
    layer = Image.new("RGBA", canvas.size, rgba(WHITE, 0))
    layer.putalpha(noise.point(lambda v: int(abs(v - 128) / 128 * 255 * amount)))
    canvas.alpha_composite(layer)


# ─────────────────────────── geometric iconography ───────────────────────────
ICONS = {}


def _icon(name):
    def deco(fn):
        ICONS[name] = fn
        return fn
    return deco


@_icon("user")
def _ic_user(d, cx, cy, r, lw, c):
    d.ellipse([cx - r * 0.34, cy - r * 0.92, cx + r * 0.34, cy - r * 0.24], outline=c, width=lw)
    d.arc([cx - r * 0.86, cy - r * 0.14, cx + r * 0.86, cy + r * 1.42], 180, 360, fill=c, width=lw)


@_icon("teacher")
def _ic_teacher(d, cx, cy, r, lw, c):
    d.ellipse([cx - r * 0.30, cy - r * 1.02, cx + r * 0.30, cy - r * 0.40], outline=c, width=lw)
    d.arc([cx - r * 0.80, cy - r * 0.32, cx + r * 0.80, cy + r * 1.20], 180, 360, fill=c, width=lw)
    d.rounded_rectangle([cx - r * 0.98, cy + r * 0.32, cx + r * 0.98, cy + r * 0.90],
                        max(2, int(r * 0.16)), outline=c, width=lw)


@_icon("shield")
def _ic_shield(d, cx, cy, r, lw, c):
    d.polygon([(cx, cy - r), (cx + r * 0.86, cy - r * 0.58), (cx + r * 0.62, cy + r * 0.62),
               (cx, cy + r), (cx - r * 0.62, cy + r * 0.62), (cx - r * 0.86, cy - r * 0.58)],
              outline=c, width=lw)


@_icon("crown")
def _ic_crown(d, cx, cy, r, lw, c):
    d.line([(cx - r * 0.9, cy + r * 0.5), (cx - r * 0.9, cy - r * 0.5), (cx - r * 0.45, cy),
            (cx, cy - r * 0.88), (cx + r * 0.45, cy), (cx + r * 0.9, cy - r * 0.5),
            (cx + r * 0.9, cy + r * 0.5)], fill=c, width=lw, joint="curve")
    d.line([(cx - r * 0.9, cy + r * 0.64), (cx + r * 0.9, cy + r * 0.64)], fill=c, width=lw)


@_icon("spark")
def _ic_spark(d, cx, cy, r, lw, c):
    d.line([(cx - r * 0.95, cy), (cx + r * 0.95, cy)], fill=c, width=lw)
    d.line([(cx, cy - r * 0.95), (cx, cy + r * 0.95)], fill=c, width=lw)
    d.line([(cx - r * 0.52, cy - r * 0.52), (cx + r * 0.52, cy + r * 0.52)], fill=c, width=lw)
    d.line([(cx - r * 0.52, cy + r * 0.52), (cx + r * 0.52, cy - r * 0.52)], fill=c, width=lw)


@_icon("chart")
def _ic_chart(d, cx, cy, r, lw, c):
    for i, hh in enumerate((0.44, 0.74, 1.0)):
        x0 = cx - r * 0.78 + i * r * 0.74
        d.rounded_rectangle([x0, cy + r * 0.9 - r * hh * 1.55, x0 + r * 0.38, cy + r * 0.9],
                            max(2, int(r * 0.1)), fill=c)


@_icon("brain")
def _ic_brain(d, cx, cy, r, lw, c):
    for (dx, dy, rr) in ((-0.62, -0.35, 0.26), (0.10, -0.74, 0.22), (0.62, -0.15, 0.24),
                         (-0.30, 0.45, 0.24), (0.44, 0.56, 0.26)):
        d.ellipse([cx + r * dx - r * rr, cy + r * dy - r * rr,
                   cx + r * dx + r * rr, cy + r * dy + r * rr], outline=c, width=lw)
    d.line([(cx - r * 0.40, cy - r * 0.20), (cx + r * 0.10, cy - r * 0.52),
            (cx + r * 0.52, cy - r * 0.02)], fill=c, width=max(1, lw - 1))
    d.line([(cx - r * 0.26, cy + r * 0.30), (cx + r * 0.30, cy + r * 0.42)],
           fill=c, width=max(1, lw - 1))


@_icon("db")
def _ic_db(d, cx, cy, r, lw, c):
    d.ellipse([cx - r * 0.78, cy - r * 0.92, cx + r * 0.78, cy - r * 0.42], outline=c, width=lw)
    d.line([(cx - r * 0.78, cy - r * 0.66), (cx - r * 0.78, cy + r * 0.40)], fill=c, width=lw)
    d.line([(cx + r * 0.78, cy - r * 0.66), (cx + r * 0.78, cy + r * 0.40)], fill=c, width=lw)
    d.arc([cx - r * 0.78, cy + r * 0.18, cx + r * 0.78, cy + r * 0.68], 0, 90, fill=c, width=lw)
    d.arc([cx - r * 0.78, cy + r * 0.18, cx + r * 0.78, cy + r * 0.68], 90, 180, fill=c, width=lw)
    d.arc([cx - r * 0.78, cy + r * 0.72, cx + r * 0.78, cy + r * 1.22], 0, 180, fill=c, width=lw)


@_icon("api")
def _ic_api(d, cx, cy, r, lw, c):
    d.line([(cx - r * 0.35, cy - r * 0.85), (cx - r * 0.95, cy), (cx - r * 0.35, cy + r * 0.85)],
           fill=c, width=lw, joint="curve")
    d.line([(cx + r * 0.35, cy - r * 0.85), (cx + r * 0.95, cy), (cx + r * 0.35, cy + r * 0.85)],
           fill=c, width=lw, joint="curve")
    d.line([(cx - r * 0.22, cy + r * 0.9), (cx + r * 0.22, cy - r * 0.9)], fill=c, width=lw)


@_icon("engine")
def _ic_engine(d, cx, cy, r, lw, c):
    d.ellipse([cx - r * 0.42, cy - r * 0.42, cx + r * 0.42, cy + r * 0.42], outline=c, width=lw)
    for k in range(8):
        a = k * math.pi / 4
        d.line([(cx + math.cos(a) * r * 0.58, cy + math.sin(a) * r * 0.58),
                (cx + math.cos(a) * r * 0.98, cy + math.sin(a) * r * 0.98)], fill=c, width=lw)


@_icon("lock")
def _ic_lock(d, cx, cy, r, lw, c):
    d.rounded_rectangle([cx - r * 0.72, cy - r * 0.15, cx + r * 0.72, cy + r * 0.95],
                        max(2, int(r * 0.16)), outline=c, width=lw)
    d.arc([cx - r * 0.45, cy - r * 0.92, cx + r * 0.45, cy + r * 0.12], 180, 360, fill=c, width=lw)
    d.ellipse([cx - r * 0.09, cy + r * 0.24, cx + r * 0.09, cy + r * 0.44], fill=c)


@_icon("key")
def _ic_key(d, cx, cy, r, lw, c):
    d.ellipse([cx - r * 0.95, cy - r * 0.44, cx - r * 0.28, cy + r * 0.24], outline=c, width=lw)
    d.line([(cx - r * 0.26, cy - r * 0.10), (cx + r * 0.92, cy + r * 0.30)], fill=c, width=lw)
    d.line([(cx + r * 0.42, cy + r * 0.12), (cx + r * 0.55, cy + r * 0.54)], fill=c, width=lw)
    d.line([(cx + r * 0.72, cy + r * 0.22), (cx + r * 0.85, cy + r * 0.64)], fill=c, width=lw)


@_icon("doc")
def _ic_doc(d, cx, cy, r, lw, c):
    d.polygon([(cx - r * 0.66, cy - r), (cx + r * 0.34, cy - r), (cx + r * 0.68, cy - r * 0.60),
               (cx + r * 0.68, cy + r), (cx - r * 0.66, cy + r)], outline=c, width=lw)
    for k in range(3):
        yy = cy - r * 0.28 + k * r * 0.44
        d.line([(cx - r * 0.38, yy), (cx + r * 0.40, yy)], fill=c, width=max(1, lw - 1))


@_icon("bell")
def _ic_bell(d, cx, cy, r, lw, c):
    d.arc([cx - r * 0.72, cy - r * 0.94, cx + r * 0.72, cy + r * 0.48], 180, 360, fill=c, width=lw)
    d.line([(cx - r * 0.72, cy - r * 0.22), (cx - r * 0.72, cy + r * 0.48)], fill=c, width=lw)
    d.line([(cx + r * 0.72, cy - r * 0.22), (cx + r * 0.72, cy + r * 0.48)], fill=c, width=lw)
    d.line([(cx - r * 0.88, cy + r * 0.50), (cx + r * 0.88, cy + r * 0.50)], fill=c, width=lw)
    d.arc([cx - r * 0.22, cy + r * 0.50, cx + r * 0.22, cy + r * 0.96], 0, 180, fill=c, width=lw)


@_icon("room")
def _ic_room(d, cx, cy, r, lw, c):
    d.rounded_rectangle([cx - r, cy - r * 0.72, cx + r, cy + r * 0.72],
                        max(2, int(r * 0.2)), outline=c, width=lw)
    d.line([(cx - r * 0.32, cy + r * 0.72), (cx, cy + r * 0.18), (cx + r * 0.32, cy + r * 0.72)],
           fill=c, width=lw)


@_icon("check")
def _ic_check(d, cx, cy, r, lw, c):
    d.line([(cx - r * 0.80, cy + r * 0.04), (cx - r * 0.20, cy + r * 0.62),
            (cx + r * 0.85, cy - r * 0.62)], fill=c, width=max(2, lw), joint="curve")


@_icon("layers")
def _ic_layers(d, cx, cy, r, lw, c):
    for dy in (-0.56, 0.0, 0.56):
        d.polygon([(cx, cy + r * dy - r * 0.42), (cx + r * 0.95, cy + r * dy),
                   (cx, cy + r * dy + r * 0.42), (cx - r * 0.95, cy + r * dy)],
                  outline=c, width=lw)


@_icon("code")
def _ic_code(d, cx, cy, r, lw, c):
    d.line([(cx - r * 0.42, cy - r * 0.72), (cx - r * 0.98, cy), (cx - r * 0.42, cy + r * 0.72)],
           fill=c, width=lw, joint="curve")
    d.line([(cx + r * 0.42, cy - r * 0.72), (cx + r * 0.98, cy), (cx + r * 0.42, cy + r * 0.72)],
           fill=c, width=lw, joint="curve")


@_icon("mic")
def _ic_mic(d, cx, cy, r, lw, c):
    d.rounded_rectangle([cx - r * 0.34, cy - r * 0.96, cx + r * 0.34, cy + r * 0.22],
                        max(2, int(r * 0.34)), outline=c, width=lw)
    d.arc([cx - r * 0.72, cy - r * 0.36, cx + r * 0.72, cy + r * 0.60], 0, 180, fill=c, width=lw)
    d.line([(cx, cy + r * 0.60), (cx, cy + r * 0.98)], fill=c, width=lw)


@_icon("compass")
def _ic_compass(d, cx, cy, r, lw, c):
    d.ellipse([cx - r * 0.95, cy - r * 0.95, cx + r * 0.95, cy + r * 0.95], outline=c, width=lw)
    d.polygon([(cx + r * 0.5, cy - r * 0.5), (cx - r * 0.2, cy - r * 0.1),
               (cx - r * 0.5, cy + r * 0.5), (cx + r * 0.2, cy + r * 0.1)], fill=c)


@_icon("target")
def _ic_target(d, cx, cy, r, lw, c):
    d.ellipse([cx - r * 0.95, cy - r * 0.95, cx + r * 0.95, cy + r * 0.95], outline=c, width=lw)
    d.ellipse([cx - r * 0.44, cy - r * 0.44, cx + r * 0.44, cy + r * 0.44], outline=c, width=lw)
    d.ellipse([cx - r * 0.10, cy - r * 0.10, cx + r * 0.10, cy + r * 0.10], fill=c)


@_icon("truck")
def _ic_truck(d, cx, cy, r, lw, c):
    d.rounded_rectangle([cx - r, cy - r * 0.62, cx + r * 0.2, cy + r * 0.48],
                        max(2, int(r * 0.15)), outline=c, width=lw)
    d.polygon([(cx + r * 0.24, cy - r * 0.20), (cx + r * 0.9, cy - r * 0.20),
               (cx + r * 0.9, cy + r * 0.48), (cx + r * 0.24, cy + r * 0.48)],
              outline=c, width=lw)
    for dx in (-0.52, 0.5):
        d.ellipse([cx + r * dx - r * 0.2, cy + r * 0.48 - r * 0.2,
                   cx + r * dx + r * 0.2, cy + r * 0.48 + r * 0.2], outline=c, width=lw)


@_icon("globe")
def _ic_globe(d, cx, cy, r, lw, c):
    d.ellipse([cx - r * 0.95, cy - r * 0.95, cx + r * 0.95, cy + r * 0.95], outline=c, width=lw)
    d.ellipse([cx - r * 0.44, cy - r * 0.95, cx + r * 0.44, cy + r * 0.95], outline=c, width=lw)
    d.line([(cx - r * 0.95, cy), (cx + r * 0.95, cy)], fill=c, width=lw)


def icon(canvas, name, cx, cy, size, color, width=2.2, alpha=240):
    """Stamp a geometric glyph onto the canvas. (design coords)"""
    layer = new_layer()
    fn = ICONS.get(name)
    if fn:
        fn(ImageDraw.Draw(layer, "RGBA"), S(cx), S(cy), S(size) / 2.0,
           max(1, S(width)), rgba(color, alpha))
    canvas.alpha_composite(layer)


def fit_box(x, y, w, h, lines, pad_x=64, pad_y=36, spacing=1.22, grow_only=True):
    """Compute the panel height the text REALLY needs; grow the panel to fit."""
    total = 0.0
    for (text, size, color, bold, sb, rtl) in norm_lines(lines):
        n = wrapped_line_count(text, size, (w - pad_x) * PX_PER_IN / 72.0, bold)
        total += n * size * PX_PER_IN / 72.0 * spacing + sb * PX_PER_IN / 72.0
    need = total + pad_y * 2
    nh = max(h, need) if grow_only else need
    return (x, y, w, nh)


def tx(s, x, y, w, h, lines, align="right", rtl=True, panel="glass",
       accent=None, glow=None, radius=20, anchor="top", spacing=1.22,
       tint=GLASS, panel_alpha=228, fit=True):
    if fit and panel in ("glass", "pill"):
        x, y, w, h = fit_box(x, y, w, h, lines,
                             pad_x=36 if panel == "pill" else 64,
                             pad_y=14 if panel == "pill" else 36,
                             spacing=spacing)
    return s.text(x, y, w, h, lines, align=align, rtl=rtl, panel=panel,
                  accent=accent, glow=glow, radius=radius, anchor=anchor,
                  spacing=spacing, tint=tint, panel_alpha=panel_alpha)


# ───────────────────────────── slide framework ───────────────────────────────
SLIDES = []
SHRUNK = []
def _measure(text, size_pt, bold):
    f = _px_font(size_pt, bold)
    try:
        return f.getlength(text)
    except AttributeError:
        return f.getsize(text)[0]

def _lines_needed(lines, box_w, pad_x=56):
    need_rows, widest = 0, 0.0
    for (text, size, color, bold, sb, rtl) in norm_lines(lines):
        f = _px_font(size, bold)
        avail = max(40.0, (box_w - pad_x) * PX_PER_IN / 72.0 / SS)
        try:
            full = f.getlength(text)
        except AttributeError:
            full = f.getsize(text)[0]
        words, rows, cur = text.split(" "), 0, ""
        if not text:
            rows = 1
        for w in words:
            trial = (cur + " " + w) if cur else w
            try:
                tw = f.getlength(trial)
            except AttributeError:
                tw = f.getsize(trial)[0]
            if tw <= avail or not cur:
                cur = trial
            else:
                rows += 1
                cur = w
        rows += 1 if text else 0
        need_rows += rows
        widest = max(widest, min(full, avail))
    return need_rows, widest

def fit_box(x, y, w, h, lines, size_cap=99.0, pad_x=56, pad_y=34, spacing=1.22):
    """Grow/shrink the panel so text NEVER clips, overlaps or floats loose."""
    rows, widest = _lines_needed(lines, w, pad_x)
    line_px = sum(l[1] for l in norm_lines(lines)) / max(1, len(norm_lines(lines)))
    need_h = rows * line_px * PX_PER_IN / 72.0 * spacing + pad_y * 2
    need_h += sum((l[4] or 0.0) * PX_PER_IN / 72.0 for l in norm_lines(lines))
    if need_h > h:
        h = min(need_h, size_cap if size_cap else need_h)
    return (x, y, w, h)

def tx(s, x, y, w, h, lines, align="right", rtl=True, panel="glass",
       accent=None, glow=None, radius=20, anchor="top", spacing=1.22,
       tint=GLASS, panel_alpha=228, autodj=True):
    if autodj and panel in ("glass", "pill"):
        x, y, w, h = fit_box(x, y, w, h, lines, pad_y=30 if panel == "pill" else 34)
    return s.text(x, y, w, h, lines, align=align, rtl=rtl, panel=panel,
                  accent=accent, glow=glow, radius=radius, anchor=anchor,
                  spacing=spacing, tint=tint, panel_alpha=panel_alpha)


class Slide:
    """One cinematic frame: Pillow-rendered 3D art + native PowerPoint text."""

    def __init__(self, idx):
        self.idx = idx
        self.canvas = canvas_new()
        self.texts = []

    def art(self, fn):
        fn(self.canvas)
        return self

    def icon(self, name, cx, cy, size, color, width=2.2, alpha=240):
        icon(self.canvas, name, cx, cy, size, color, width, alpha)
        return self

    def box(self, cx, cy, w, d, h, base, **kw):
        iso_box(self.canvas, cx, cy, w, d, h, base, **kw)
        return self

    def text(self, x, y, w, h, lines, align="right", rtl=True, panel="glass",
             accent=None, glow=None, radius=20, anchor="top", spacing=1.22,
             tint=GLASS, panel_alpha=228):
        # Auto-fit: grow the panel so the text NEVER clips or overflows.
        try:
            nn = norm_lines(lines)
            total = 0.0
            for (t, size, _c, bold, sb, _r) in nn:
                n = wrapped_line_count(t, size, (w - (36 if panel == "pill" else 64)) * PX_PER_IN / 72.0, bold)
                total += n * size * PX_PER_IN / 72.0 * spacing + (sb or 0.0) * PX_PER_IN / 72.0
            need = total + (28 if panel == "pill" else 72)
            if need > h:
                h = need
        except Exception:
            pass
        if panel == "glass":
            glass_panel(self.canvas, x, y, w, h, radius=radius, tint=tint,
                        alpha=panel_alpha, accent=accent, glow_color=glow)
        elif panel == "pill":
            glass_panel(self.canvas, x, y, w, h, radius=int(h / 2), tint=tint,
                        alpha=panel_alpha, accent=accent, glow_color=glow,
                        top_hl=False, border=34)
        self.texts.append({"rect": (x, y, w, h), "lines": lines, "align": align,
                           "rtl": rtl, "anchor": anchor, "spacing": spacing})
        return self

    def render_png(self, path):
        img = self.canvas.convert("RGB")
        img.save(path, "PNG", optimize=True)
        return path


def norm_lines(lines):
    """Normalise a line spec to (text, size, color, bold, space_before, rtl)."""
    out = []
    for ln in lines:
        ln = list(ln) + [None] * (6 - len(ln))
        text, size = ln[0], float(ln[1])
        out.append((text, size, ln[2] if ln[2] else TEXT, bool(ln[3]),
                    ln[4] or 0.0, ln[5]))
    return out


# ═══════════════════════ SLIDE 5 — CORE EXPERIENCE ══════════════════════════
def slide_05():
    s = Slide(5)
    c = s.canvas
    glow(c, W / 2, 560, 900, 460, BLUE, 0.16, 2.2)
    glow(c, 340, 420, 520, 420, VIOLET, 0.16, 2.2)
    glow(c, 1660, 420, 520, 420, CYAN, 0.16, 2.2)
    floor_grid(c, (W / 2, 940), 880, H * 1.05, rays=22, steps=7, color=BLUE, alpha=70)
    particles(c, 90, 21, CYAN, 95)

    steps = [("تعلّم", "الدرس والشرح", "/courses", CYAN),
             ("تدرّب", "أسئلة ومحاولات", "/hub", TEAL),
             ("قِس", "اختبار تكيفي", "/assessment/:id", GREEN),
             ("حلِّل", "نتائج ومفاهيم خاطئة", "/results/:id", AMBER),
             ("خصِّص", "مسار وخطة", "/planner", VIOLET),
             ("تقدَّم", "إتقان ومستوى", "/progress", BLUE)]
    x = 1624
    for i, (title, sub, path, col) in enumerate(steps):
        s.box(x + 140, 350 - i * 4, 150, 150, 30 + i * 6, mix(col, INK, 0.20))
        s.icon("target" if i == 5 else "check", x + 216, 424 - i * 4, 46,
               mix(col, WHITE, 0.35), 2.2, 235)
        if i < 5:
            glow_line(c, (x + 10, 372 - i * 4), (x - 34, 372 - i * 4), mix(col, WHITE, 0.10),
                      2.4, 12, 190, arrow=True, arrow_len=18)
        s.text(x, 470, 280, 200, [
            ("%d. %s" % (6 - i, title), 21, WHITE, True),
            (sub, 14, TEXT, False, 8),
            (path, 11, mix(col, WHITE, 0.20), False, 6, False),
        ], accent=col, glow=col, radius=22, tint=mix(NAVY, col, 0.07))
        x -= 300
    chrome(s, "رحلة التعلّم في المنصة", "من الدرس إلى الإتقان — خطوات متصلة لا جزر منفصلة", CYAN,
           kicker="التجربة الأساسية")
    s.text(M, 716, W - 2 * M, 150, [
        ("كل خطوة تُنتج أحداث تعلّم حقيقية تُحفظ في PostgreSQL وتُغذّي التخصيص تلقائيًا", 20,
         mix(CYAN, WHITE, 0.20), True),
        ("الأحداث تُغذّي الإتقان والتحليل والمفاهيم الخاطئة والتكرار المتباعد وخطة اليوم التالي.",
         15, MUTED, False, 8),
    ], accent=CYAN, glow=CYAN, radius=24)
    footer(s, "المصدر: مسارات الواجهة في src/App.tsx ونقاط التعلّم في server/src/routes/learning.ts")
    return s


# ═══════════════════════ SLIDE 6 — TECHNOLOGY STACK ══════════════════════════
def slide_06():
    s = Slide(6)
    c = s.canvas
    glow(c, 1000, 700, 1000, 520, BLUE, 0.15, 2.2)
    glow(c, 300, 380, 480, 400, VIOLET, 0.14, 2.2)
    glow(c, 1700, 380, 480, 400, CYAN, 0.14, 2.2)
    floor_grid(c, (W / 2, 950), 880, H * 1.05, rays=20, steps=6, color=VIOLET, alpha=55)
    particles(c, 80, 31, CYAN, 85)

    towers = [
        ("الواجهة الأمامية", BLUE, ["React 19", "TypeScript", "Vite", "Tailwind CSS", "i18next · RTL"]),
        ("الخلفية", GREEN, ["Node.js", "Express", "TypeScript", "Zod", "multer"]),
        ("البيانات", CYAN, ["Prisma 6", "PostgreSQL 16", "56 model", "9 migrations", "JSONB + vector"]),
        ("الأمن", AMBER, ["bcrypt", "HMAC-SHA256", "helmet", "rate-limit", "AuditLog"]),
        ("الذكاء الاصطناعي", VIOLET, ["9 provider slots", "model cascade", "RAG + embeddings", "10 AI modes", "TTS / STT"]),
    ]
    x = 96
    for (name, col, items) in towers:
        for k, (wd, hh) in enumerate(((150, 24), (140, 22), (128, 20))):
            s.box(x + 172, 350 - k * 46, wd, wd, hh, mix(col, INK, 0.20 + k * 0.06))
        s.icon("layers", x + 172, 322, 52, mix(col, WHITE, 0.30), 2.3, 235)
        lines = [(name, 19, WHITE, True)]
        for it in items:
            lines.append((it, 13.5, TEXT, False, 9, False))
        s.text(x, 500, 344, 386, lines, accent=col, glow=col, radius=24,
               tint=mix(NAVY, col, 0.07))
        x += 364
    chrome(s, "المكدّس التقني الفعلي", None, VIOLET, kicker="التقنيات")
    s.text(564, 198, W - M - 564, 48,
           [("كل ما يلي مستخدم فعليًا في الكود — لا تقنيات افتراضية", 17, MUTED, False)],
           panel=None, align="right")
    ops = [("Vitest", TEAL), ("Playwright", CYAN), ("Docker", BLUE), ("nginx", VIOLET), ("oxlint", AMBER)]
    x = 96
    for (label, col) in ops:
        s.text(x, 902, 200, 52, [(label, 13, mix(col, WHITE, 0.30), True)],
               panel="pill", align="center", accent=None)
        x += 214
    footer(s)
    return s


# ══════════════════════ SLIDE 7 — SYSTEM ARCHITECTURE ════════════════════════
def layer_slab(canvas, cx, y, hw, thick, base, accent):
    """Perspective 2.5D slab (wider near edge, converging far edge). Design coords."""
    near_l, near_r = cx - hw, cx + hw
    far_l, far_r = cx - hw * 0.78, cx + hw * 0.78
    top = [(near_l, y), (near_r, y), (far_r, y - thick), (far_l, y - thick)]
    side_l = [(near_l, y), (far_l, y - thick), (far_l, y - thick + 16), (near_l, y + 16)]
    side_r = [(near_r, y), (far_r, y - thick), (far_r, y - thick + 16), (near_r, y + 16)]
    poly_fill(canvas, side_l, mix(base, INK, 0.35), mix(base, INK, 0.62), 245)
    poly_fill(canvas, side_r, mix(base, INK, 0.25), mix(base, INK, 0.55), 245)
    poly_fill(canvas, top, mix(base, WHITE, 0.30), mix(base, INK, 0.10), 250)
    top_ss = [(S(x), S(y)) for (x, y) in top]
    dd = ImageDraw.Draw(canvas, "RGBA")
    dd.polygon(top_ss, outline=rgba(mix(accent, WHITE, 0.25), 120), width=max(1, S(1.0)))
    glow(canvas, cx, y - thick / 2, hw * 1.25, 44, accent, 0.16, 2.0)


def slide_07():
    s = Slide(7)
    c = s.canvas
    glow(c, 820, 620, 760, 620, BLUE, 0.16, 2.2)
    glow(c, 1560, 560, 460, 520, CYAN, 0.14, 2.2)
    particles(c, 80, 41, CYAN, 80)

    stacks = [
        ("USERS  ·  طالب · معلّم · مسؤول · مالك", ROSE),
        ("REACT SPA  ·  Vite + nginx", BLUE),
        ("REST API  ·  /api/v1 · 131 نقطة", CYAN),
        ("EXPRESS  ·  مصادقة · RBAC · تحقق Zod", GREEN),
        ("SERVICES  ·  AI · RAG · تعلّم · خصوصية · صوت · تعاون", VIOLET),
        ("PRISMA ORM  ·  types + migrations", AMBER),
        ("POSTGRESQL 16  ·  56 جدولًا", TEAL),
    ]
    y = 986
    for i, (label, col) in enumerate(stacks):
        hw = 486 - i * 26
        layer_slab(c, 820, y, hw, 56, mix(col, INK, 0.30), col)
        s.text(820 - hw * 0.66, y - 70, hw * 1.32, 54,
               [(label, 15, mix(col, WHITE, 0.30), True)],
               panel=None, align="center", spacing=1.0)
        if i < len(stacks) - 1:
            glow_line(c, (1348 - i * 22, y - 50), (1320 - (i + 1) * 22, y - 150),
                      mix(col, WHITE, 0.05), 1.8, 8, 110, arrow=False)
        s.icon("layers" if i % 2 == 0 else "check", 820 - hw - 44, y - 28, 34,
               mix(col, WHITE, 0.20), 1.8, 200)
        y -= 100

    chrome(s, "المعمارية من الأعلى إلى القاعدة", "طبقات منفصلة بمسؤوليات واضحة — لكل طبقة دور واحد", CYAN,
           kicker="البنية")
    s.text(1470, 326, 434, 440, [
        ("أرقام من الكود", 19, WHITE, True),
        ("18 وحدة مسارات API", 15, TEXT, False, 12),
        ("131 نقطة نهاية REST", 15, TEXT, False, 8),
        ("3 حاويات Docker تعمل", 15, TEXT, False, 8),
        ("9 migrations مطبَّقة", 15, TEXT, False, 8),
        ("56 model + 52 enum", 15, TEXT, False, 8),
        ("6 طبقات خدمات", 15, TEXT, False, 8),
    ], accent=CYAN, glow=CYAN, radius=24)
    s.text(1470, 786, 434, 164, [
        ("نشر واحد", 17, WHITE, True),
        ("nginx يقدّم الواجهة ويوكّل /api إلى السيرفر داخل شبكة Docker.", 13.5, MUTED, False, 8),
    ], accent=VIOLET, radius=22)
    footer(s)
    return s


# ══════════════════════════ SLIDE 8 — AI ENGINE ══════════════════════════════
def slide_08():
    s = Slide(8)
    c = s.canvas
    glow(c, 1000, 460, 940, 460, VIOLET, 0.18, 2.2)
    glow(c, 500, 320, 520, 420, CYAN, 0.14, 2.2)
    glow(c, 1500, 720, 520, 420, BLUE, 0.14, 2.2)
    floor_grid(c, (W / 2, 980), 900, H * 1.05, rays=18, steps=6, color=VIOLET, alpha=60)
    particles(c, 90, 51, CYAN, 95)

    providers = [("Groq", "api.groq.com", 3), ("OpenRouter", "openrouter.ai", 6),
                 ("Cerebras", "api.cerebras.ai", 2), ("Mistral", "api.mistral.ai", 3),
                 ("DeepInfra", "api.deepinfra.com", 3), ("HuggingFace", "router.huggingface.co", 2),
                 ("GitHub Models", "models.github.ai", 3), ("Google Gemini", "generativelanguage", 3),
                 ("Ollama", "محلي · host", 1)]
    for i, (name, host, n) in enumerate(providers):
        row, ci = divmod(i, 5)
        x = 1552 - ci * 364
        y = 322 + row * 112
        s.text(x, y, 340, 96, [
            (name, 17, WHITE, True, 0, False),
            ("%s · %d models" % (host, n), 11.5, MUTED, False, 6, False),
        ], accent=VIOLET if row == 0 else BLUE, radius=20)
        if ci < 4:
            glow_line(c, (x - 8, y + 48), (x - 30, y + 48), mix(CYAN, WHITE, 0.05), 2.2, 10,
                      175, arrow=True, arrow_len=16)
    s.text(96, 434, 340, 96, [
        ("أي فشل ينتقل تلقائيًا", 14, AMBER, True),
        ("النموذج التالي ثم المزوّد التالي", 12, MUTED, False, 6),
    ], accent=AMBER, radius=20)

    s.text(W - M - 940, 550, 940, 40,
           [("RAG — إجابات موثّقة من محتوى الكورس فقط", 15, CYAN, True)],
           panel=None, align="right")
    rag = [("سؤال الطالب", "/rag/ask", CYAN), ("تضمين السؤال", "embeddings · e5-base", TEAL),
           ("استرجاع المقاطع", "تشابه ≥ 0.35", GREEN), ("بناء السياق", "مراجع [1] [2]", AMBER),
           ("توليد الإجابة", "LLM من السلسلة", VIOLET), ("إجابة موثّقة", "أو رفض بلا دليل", BLUE)]
    x = 1624
    for (t1, t2, col) in rag:
        s.text(x, 598, 280, 120, [(t1, 14.5, WHITE, True), (t2, 11.5, MUTED, False, 6, False)],
               accent=col, glow=col, radius=20)
        x -= 300
    s.text(M, 742, W - 2 * M, 92, [
        ("حالة التشغيل بصراحة: التوليد العربي والإنجليزي حقيقي ويعمل (تم التحقق حيًّا عبر Groq)، أما RAG الكامل فيعتمد على مفاتيح المزوّد و embeddings و PGVECTOR_ENABLED — وبدونها يعمل بالبحث الكلماتي.",
         13.5, AMBER, False),
    ], accent=AMBER, radius=20)
    chrome(s, "محرّك الذكاء الاصطناعي", "سلسلة مزوّدين مع انتقال تلقائي عند أي فشل", VIOLET,
           kicker="AI")
    footer(s)
    return s


# ═══════════════════ SLIDE 9 — LEARNING INTELLIGENCE ═════════════════════════
def slide_09():
    s = Slide(9)
    c = s.canvas
    glow(c, 780, 540, 900, 520, CYAN, 0.16, 2.2)
    glow(c, 300, 380, 480, 420, VIOLET, 0.14, 2.2)
    glow(c, 1560, 560, 480, 460, BLUE, 0.14, 2.2)
    floor_grid(c, (W / 2, 980), 900, H * 1.05, rays=20, steps=6, color=CYAN, alpha=55)
    particles(c, 80, 61, CYAN, 90)

    nodes = [("أحداث التعلّم", "learning-events", CYAN),
             ("الأدلة والمفاهيم الخاطئة", "misconception-engine", TEAL),
             ("نموذج معرفة الطالب", "student-knowledge-model", GREEN),
             ("تحليل المخاطر والتعثّر", "risk-engine", AMBER),
             ("الإتقان والتكرار المتباعد", "mastery + spaced-repetition", VIOLET),
             ("مسار وخطة مخصّصة", "learning-path + planner", BLUE)]
    for i, (name, en, col) in enumerate(nodes):
        row, ci = divmod(i, 3)
        x = 1030 - ci * 450
        y = 320 + row * 240
        s.box(x + 90, y - 96, 120, 120, 30, mix(col, INK, 0.22))
        s.icon("brain" if i % 2 == 0 else "chart", x + 144, y - 66, 40,
               mix(col, WHITE, 0.35), 2.2, 235)
        s.text(x, y, 420, 170, [
            ("%d" % (i + 1), 13, mix(col, WHITE, 0.30), True),
            (name, 19, WHITE, True, 4),
            (en, 11.5, MUTED, False, 6, False),
        ], accent=col, glow=col, radius=22, tint=mix(NAVY, col, 0.08))
        if ci < 2:
            glow_line(c, (x - 6, y + 100), (x - 40, y + 100), mix(col, WHITE, 0.05), 2.4, 10,
                      180, arrow=True, arrow_len=18)
    glow_line(c, (340, 500), (340, 552), CYAN, 2.4, 12, 180, arrow=True, arrow_len=18)
    glow_line(c, (1450, 700), (1500, 700), VIOLET, 2.4, 12, 180, arrow=True, arrow_len=18)

    chrome(s, "ذكاء التعلّم", "محرّكات حتمية تحوّل بيانات التعلّم إلى قرارات تعليمية", CYAN,
           kicker="التميّز")
    s.text(1520, 316, 384, 470, [
        ("19 محرّكًا حتميًا", 19, WHITE, True),
        ("قابلة للاختبار — لا صندوق أسود", 12.5, MUTED, False, 6),
        ("أحداث ومعرفة: 4 محركات", 14, TEXT, False, 14),
        ("تشخيص وتحليل: 4 محركات", 14, TEXT, False, 8),
        ("تخطيط وتخصيص: 4 محركات", 14, TEXT, False, 8),
        ("تقدّم ونماذج: 4 محركات", 14, TEXT, False, 8),
        ("منصّة وتشغيل: 3 محركات", 14, TEXT, False, 8),
    ], accent=VIOLET, glow=VIOLET, radius=24)
    s.text(1520, 812, 384, 150, [
        ("كل قرار له سبب", 16, WHITE, True),
        ("الإتقان والمخاطر والتوصيات مبنية على أحداث مسجّلة، لا على تخمين.", 13, MUTED, False, 8),
    ], accent=CYAN, radius=22)
    footer(s, "المصدر: src/shared/intelligence (19 محرّكًا + barrel) مع 12 ملف اختبار للواجهة")
    return s


# ═══════════════════ SLIDE 10 — STUDENT + TEACHER ECOSYSTEM ══════════════════
def slide_10():
    s = Slide(10)
    c = s.canvas
    glow(c, 1000, 420, 720, 460, BLUE, 0.18, 2.2)
    glow(c, 400, 320, 520, 420, TEAL, 0.13, 2.2)
    glow(c, 1600, 320, 520, 420, CYAN, 0.13, 2.2)
    floor_grid(c, (W / 2, 980), 900, H * 1.05, rays=22, steps=6, color=BLUE, alpha=55)
    particles(c, 80, 71, CYAN, 90)

    for k, (rx, ry, col) in enumerate(((300, 74, CYAN), (232, 56, BLUE), (168, 40, VIOLET))):
        ring(c, 1000, 452, rx, ry, col, 2.0, 110 - k * 25, 12)
    sphere(c, 1000, 430, 78, mix(BLUE, CYAN, 0.35))
    glow_line(c, (560, 372), (900, 392), TEAL, 2.6, 12, 190, arrow=True)
    glow_line(c, (1440, 372), (1100, 392), CYAN, 2.6, 12, 190, arrow=True)

    s.text(1470, 302, 434, 142, [
        ("الطالب", 23, WHITE, True),
        ("يتعلّم · يتدرّب · يُقيَّم · يتقدّم", 14, TEXT, False, 8),
        ("لوحة، دورات، مساعد ذكي، تقدّم", 12.5, MUTED, False, 6),
    ], accent=CYAN, glow=CYAN, radius=22)
    s.text(96, 302, 434, 142, [
        ("المعلّم", 23, WHITE, True),
        ("يُنشئ · ينشر · يصحّح · يتابع", 14, TEXT, False, 8),
        ("فصول، واجبات، اختبارات، تحليلات", 12.5, MUTED, False, 6),
    ], accent=TEAL, glow=TEAL, radius=22)
    s.text(830, 300, 340, 92, [
        ("الفصل الدراسي", 18, WHITE, True),
        ("مساحة العمل المشتركة", 12, MUTED, False, 4),
    ], accent=BLUE, glow=BLUE, radius=22, align="center")

    caps = [("الدورات والتسجيل", "courses · enroll", BLUE), ("الفصول والانضمام", "classrooms", TEAL),
            ("الواجبات والتسليم", "assignments", GREEN), ("التقييمات والأسئلة", "assessments", AMBER),
            ("خطط التعلّم", "learning/plans", VIOLET), ("الإشعارات", "notifications", CYAN),
            ("الملفات والمرفقات", "files · multer", ROSE), ("الغرف المباشرة", "collab rooms", BLUE)]
    for i, (name, en, col) in enumerate(caps):
        row, ci = divmod(i, 4)
        x = 1310 - ci * 300
        y = 528 + row * 108
        s.text(x, y, 280, 92, [(name, 14.5, WHITE, True), (en, 11, MUTED, False, 5, False)],
               accent=col, radius=18)

    cyc = [("إنشاء الفصل", CYAN), ("انضمام الطالب", TEAL), ("نشر واجب", GREEN),
           ("تسليم العمل", AMBER), ("تصحيح ودرجة", VIOLET), ("تحليل الفصل", BLUE)]
    x = 1624
    for i, (label, col) in enumerate(cyc):
        s.text(x, 806, 280, 84, [(label, 14, mix(col, WHITE, 0.25), True)],
               accent=col, radius=18, align="center")
        if i < 5:
            glow_line(c, (x - 6, 848), (x - 30, 848), mix(col, WHITE, 0.05), 2.2, 10, 170,
                      arrow=True, arrow_len=16)
        x -= 300
    chrome(s, "منظومة الطالب والمعلّم", "دورة عمل واحدة من إنشاء الفصل حتى تحليل النتائج", TEAL,
           kicker="التعاون")
    footer(s)
    return s


# ═════════════════════════ SLIDE 11 — SECURITY ══════════════════════════════
def slide_11():
    s = Slide(11)
    c = s.canvas
    glow(c, 300, 500, 620, 520, AMBER, 0.13, 2.2)
    glow(c, 1000, 620, 700, 480, BLUE, 0.15, 2.2)
    glow(c, 1700, 500, 620, 520, VIOLET, 0.13, 2.2)
    floor_grid(c, (W / 2, 990), 910, H * 1.05, rays=18, steps=5, color=BLUE, alpha=50)
    particles(c, 80, 81, CYAN, 85)

    cards = [
        ("مصادقة صلبة", "lock", AMBER, ["bcrypt للتجزئة — لا كلمات مرور نصية",
                                        "توكن HMAC-SHA256 مرتبط بجلسة في قاعدة البيانات"]),
        ("صلاحيات دقيقة", "shield", BLUE, ["RBAC + منع IDOR على الملكية",
                                           "الدور يُقرأ من الجلسة لا من الطلب"]),
        ("الأدوار العليا بدعوة", "key", VIOLET, ["ADMIN و OWNER بدعوة فقط",
                                                 "رمز دعوة مُجزّأ ومسجَّل لكل مسؤول"]),
        ("تحقّق من المدخلات", "api", GREEN, ["Zod على نقاط النهاية",
                                             "Prisma باستعلامات معاملات (لا SQL مركّب)"]),
        ("حماية الشبكة", "globe", CYAN, ["helmet + CORS + حد معدل عام",
                                         "حد أدق على مسار تسجيل الدخول"]),
        ("خصوصية واحتفاظ", "doc", TEAL, ["موافقات · تفضيلات · تصدير · حذف حساب",
                                         "مجدول احتفاظ يحذف البيانات القديمة"]),
    ]
    for i, (name, ic, col, lines) in enumerate(cards):
        row, ci = divmod(i, 3)
        x = 1330 - ci * 617
        y = 300 + row * 224
        s.icon(ic, x + 62, y + 62, 52, mix(col, WHITE, 0.35), 2.4, 240)
        s.text(x, y, 570, 200, [(name, 19, WHITE, True)] +
               [(t, 13.5, TEXT, False, 10) for t in lines],
               accent=col, glow=col, radius=22, tint=mix(NAVY, col, 0.07))

    chrome(s, "الأمان والصلاحيات", "الأمان مبني في السيرفر: جلسة، دور، تحقّق، تدقيق، خصوصية", AMBER,
           kicker="الحماية")
    s.text(M, 764, W - 2 * M, 132, [
        ("تحقّق حيّ اليوم — لا وعود", 17, mix(AMBER, WHITE, 0.25), True),
        ("تسجيل admin بلا رمز دعوة → 400 · طالب على /admin/users → 403 · طلب بلا توكن → 401 · توكن بلا جلسة → 401 · سجل التدقيق 1358 حدثًا في قاعدة البيانات.",
         13.5, MUTED, False, 10),
    ], accent=AMBER, glow=None, radius=22)
    footer(s)
    return s


# ═══════════════════ SLIDE 12 — DATA & PERSISTENCE ═══════════════════════════
def slide_12():
    s = Slide(12)
    c = s.canvas
    glow(c, 620, 660, 700, 620, TEAL, 0.16, 2.2)
    glow(c, 1500, 560, 620, 520, BLUE, 0.14, 2.2)
    particles(c, 80, 91, CYAN, 80)

    chain = [("الواجهة الأمامية", BLUE), ("REST API", CYAN), ("سيرفر Express", GREEN),
             ("Prisma ORM", AMBER), ("PostgreSQL 16", TEAL)]
    y = 900
    for i, (label, col) in enumerate(chain):
        hw = 420 - i * 30
        layer_slab(c, 620, y, hw, 56, mix(col, INK, 0.28), col)
        s.text(620 - hw * 0.62, y - 70, hw * 1.24, 54, [(label, 15, mix(col, WHITE, 0.30), True)],
               panel=None, align="center", spacing=1.0)
        if i < len(chain) - 1:
            glow_line(c, (1004 - i * 24, y - 46), (982 - (i + 1) * 24, y - 166),
                      mix(col, WHITE, 0.05), 1.8, 8, 110, arrow=False)
        y -= 120

    chrome(s, "البيانات والاستمرارية", "ما يتعلّمه الطالب يُحفظ في قاعدة بيانات حقيقية — لا في المتصفح فقط", TEAL,
           kicker="البيانات")
    s.text(1100, 300, 804, 420, [
        ("جداول تعلّم حقيقية", 19, WHITE, True),
        ("learning_events · mastery_records · xp_events", 13, TEXT, False, 12, False),
        ("knowledge_nodes · knowledge_edges", 13, TEXT, False, 7, False),
        ("plan_items · review_cards · study_sessions", 13, TEXT, False, 7, False),
        ("classrooms · assignments · submissions", 13, TEXT, False, 7, False),
        ("ai_conversations · ai_messages · rag_chunks", 13, TEXT, False, 7, False),
        ("live_rooms · voice_sessions · sandbox_runs", 13, TEXT, False, 7, False),
        ("sessions · audit_logs · consent_records", 13, TEXT, False, 7, False),
    ], accent=TEAL, glow=TEAL, radius=24)
    s.text(1100, 756, 804, 88, [
        ("التوكن فقط في المتصفح (localStorage) — أما بيانات التعلّم فكلها في PostgreSQL.",
         13.5, MUTED, False),
    ], accent=BLUE, glow=None, radius=20)
    s.text(1100, 866, 804, 42, [("أرقام حيّة الآن من الحاوية learnpilot-postgres", 13, DIM, False)],
           panel=None, align="right")
    counters = [("399 مستخدم", BLUE), ("573 جلسة", CYAN), ("1358 تدقيق", AMBER), ("99 حدث تعلّم", TEAL)]
    x = 1100
    for (label, col) in counters:
        s.text(x, 906, 190, 52, [(label, 13.5, mix(col, WHITE, 0.30), True)],
               panel="pill", align="center", accent=None)
        x += 210
    footer(s)
    return s


# ══════════════════ SLIDE 13 — TESTING & QUALITY ══════════════════════════
def slide_13():
    s = Slide(13)
    c = s.canvas
    glow(c, 560, 560, 700, 620, GREEN, 0.14, 2.2)
    glow(c, 1560, 540, 620, 520, AMBER, 0.13, 2.2)
    floor_grid(c, (W / 2, 990), 910, H * 1.05, rays=18, steps=5, color=BLUE, alpha=45)
    particles(c, 80, 101, CYAN, 80)

    stats = [("139 / 139", "اختبار واجهة — Vitest · 12 ملفًا", GREEN, "check"),
             ("76 / 81", "اختبار سيرفر — Vitest · 9 ملفات", AMBER, "chart"),
             ("11 / 13", "سيناريو E2E — Playwright", CYAN, "compass"),
             ("0 أخطاء", "TypeScript للواجهة — tsc -b", BLUE, "api")]
    for i, (big, sub, col, ic) in enumerate(stats):
        row, ci = divmod(i, 2)
        x = 616 - ci * 520
        y = 320 + row * 240
        s.icon(ic, x + 500, y + 56, 46, mix(col, WHITE, 0.35), 2.2, 235)
        s.text(x, y, 500, 216, [
            (big, 34, mix(col, WHITE, 0.15), True),
            (sub, 13.5, TEXT, False, 8),
        ], accent=col, glow=col, radius=24, tint=mix(NAVY, col, 0.07), align="right")

    chrome(s, "الجودة والاختبارات", "أرقام مقيسة اليوم على هذه النسخة — لا أرقام تاريخية", GREEN,
           kicker="الجودة")
    s.text(1160, 316, 744, 300, [
        ("لماذا 5 + 2 اختبارًا لا تمرّ؟", 19, WHITE, True),
        ("اختبارات قديمة تنشئ حساب ADMIN/OWNER ذاتيًا، والمنصة الآن تمنع ذلك (دعوة فقط).",
         13.5, TEXT, False, 10),
        ("أي أنها تكشف تشديدًا أمنيًا صحيحًا، وتحتاج تحديثًا في الاختبار لا إصلاحًا في المنصة.",
         13.5, TEXT, False, 8),
    ], accent=AMBER, glow=AMBER, radius=24)
    s.text(1160, 632, 744, 260, [
        ("مناطق مغطاة فعليًا", 18, WHITE, True),
        ("auth · rbac · security · retention · validation · learning · sandbox · voice · google-oauth",
         13, TEXT, False, 10, False),
        ("الواجهة: أحداث · إتقان · تكرار متباعد · مسارات · مخاطر · تكيّف · إنتاج · XP · مزامنة التعلّم.",
         13.5, TEXT, False, 10),
        ("فحص الأنواع: السيرفر يُظهر 3 أخطاء أنواع لأن عميل Prisma المُولَّد أقدم من المخطط — يلزم prisma generate.",
         13, AMBER, False, 10),
    ], accent=BLUE, radius=24)
    footer(s)
    return s


# ══════════════════ SLIDE 14 — CURRENT STATUS ═══════════════════════════════
def slide_14():
    s = Slide(14)
    c = s.canvas
    glow(c, 300, 460, 620, 520, GREEN, 0.12, 2.2)
    glow(c, 1700, 460, 620, 520, BLUE, 0.12, 2.2)
    glow(c, 1000, 900, 900, 420, VIOLET, 0.12, 2.2)
    particles(c, 80, 111, CYAN, 75)

    buckets = [
        ("مُنفَّذ ويعمل", GREEN, "check", [
            "مصادقة + جلسات + RBAC",
            "أحداث التعلّم · الإتقان · الخطط · XP",
            "دورات · فصول · واجبات · تقييمات",
            "إشعارات · ملفات · غرف مباشرة · صوت",
            "سجل تدقيق + خصوصية واحتفاظ"]),
        ("منفَّذ جزئيًا", AMBER, "layers", [
            "RAG كامل يحتاج embeddings و PGVECTOR_ENABLED",
            "الصوت يحتاج مفتاح Groq وإلا بديل المتصفح",
            "المحتوى التشغيلي محدود: دورة واحدة ودرسان",
            "5 اختبارات سيرفر + 2 E2E تحتاج تحديثًا",
            "التعاون عبر REST — لا WebSocket حيًّا"]),
        ("يحتاج إعدادًا خارجيًا", BLUE, "key", [
            "مفاتيح مزوّدي الذكاء الاصطناعي في .env",
            "نموذج التضمين من HuggingFace",
            "خانتا استضافة ذاتية CUSTOM_LLM_*",
            "تدوير مفاتيح API (إجراء المالك)",
            "مزودون اختياريون: Gemini · GitHub · Ollama"]),
        ("أعمال مستقبلية", VIOLET, "compass", [
            "توليد عميل Prisma حديث (يزيل 3 أخطاء أنواع)",
            "CI/CD ومتابعة تشغيل ومراقبة",
            "تخزين سحابي للملفات بدل القرص المحلي",
            "WebSocket لحظي للغرف والتعاون",
            "توسّع أفقي وحمل أعلى"]),
    ]
    for i, (name, col, ic, items) in enumerate(buckets):
        row, ci = divmod(i, 2)
        x = 1010 - ci * 914
        y = 292 + row * 336
        s.icon(ic, x + 856, y + 46, 44, mix(col, WHITE, 0.35), 2.2, 235)
        s.text(x, y, 894, 320, [(name, 20, mix(col, WHITE, 0.20), True)] +
               [(t, 13.5, TEXT, False, 11) for t in items],
               accent=col, glow=col, radius=24, tint=mix(NAVY, col, 0.07))
    chrome(s, "الحالة الحالية بصراحة", "مستخلصة من الكود وقاعدة البيانات الحيّة — بلا مبالغة", AMBER,
           kicker="الوضع")
    footer(s)
    return s


# ══════════════════════ SLIDE 15 — WHY LEARNPILOT ════════════════════════════
def slide_15():
    s = Slide(15)
    c = s.canvas
    glow(c, 1000, 620, 1000, 480, BLUE, 0.14, 2.2)
    glow(c, 340, 420, 520, 420, CYAN, 0.13, 2.2)
    glow(c, 1700, 420, 520, 420, VIOLET, 0.13, 2.2)
    floor_grid(c, (W / 2, 980), 890, H * 1.05, rays=18, steps=5, color=VIOLET, alpha=45)
    particles(c, 80, 121, CYAN, 80)

    pills = [("موحّد", BLUE, "brain", "تعلّم + تقييم + تحليلات + ذكاء في منصة واحدة."),
             ("ذكي", CYAN, "spark", "قرارات مبنية على أحداث تعلّم مسجّلة، لا على تخمين."),
             ("قائم على الأدوار", TEAL, "shield", "طالب · معلّم · مسؤول · مالك بصلاحيات مفصولة."),
             ("قابل للتوسّع", VIOLET, "layers", "طبقة تجريد للمزوّدين وخدمات موديولية مستقلة."),
             ("مستمر", AMBER, "db", "بيانات محفوظة في PostgreSQL مع تدقيق وخصوصية.")]
    x = 96
    for i, (name, col, ic, line) in enumerate(pills):
        h = 44 + i * 22
        s.box(x + 172, 420, 120, 120, h, mix(col, INK, 0.20))
        s.icon(ic, x + 172, 392, 52, mix(col, WHITE, 0.30), 2.3, 235)
        s.text(x, 540, 344, 360, [
            (name, 21, WHITE, True),
            (line, 13.5, TEXT, False, 12),
        ], accent=col, glow=col, radius=24, tint=mix(NAVY, col, 0.07))
        x += 364
    chrome(s, "لماذا LearnPilot؟", "خصائص تقنية موجودة فعلًا في الكود — بلا ترتيب وبلا مبالغة", CYAN,
           kicker="الخلاصة")
    footer(s, "كل بند في هذه الشريحة يمكن تتبّعه إلى ملف في المستودع أو إلى نقطة نهاية تعمل.")
    return s


# ════════════════════════ SLIDE 16 — FINAL VISION ════════════════════════════
def slide_16():
    s = Slide(16)
    c = s.canvas
    glow(c, W / 2, 420, 1000, 520, BLUE, 0.28, 2.1)
    glow(c, W * 0.24, 320, 600, 440, VIOLET, 0.20, 2.2)
    glow(c, W * 0.78, 640, 660, 440, CYAN, 0.20, 2.2)
    floor_grid(c, (W / 2, 700), 700, H * 1.06, rays=28, steps=9, color=BLUE, alpha=95)
    ring(c, W / 2, 300, 700, 250, CYAN, 2.0, 90, 18, dash=24)
    ring(c, W / 2, 300, 900, 320, VIOLET, 1.4, 55, 16, dash=16)
    particles(c, 190, 131, CYAN, 120)
    sparkles(c, [(W * 0.14, 320, 12), (W * 0.88, 250, 10), (W * 0.72, 880, 9)], WHITE, 165)
    for k, (rx, ry, col) in enumerate(((430, 120, CYAN), (330, 92, BLUE))):
        ring(c, W / 2, 648, rx, ry, col, 1.8, 80 - k * 20, 12)
    sphere(c, W / 2, 300, 102, mix(BLUE, VIOLET, 0.35))

    centered(s, 232, 1500, 110, [("LearnPilot", 58, WHITE, True)], panel=None, spacing=1.0)
    roles = [("الطالب", CYAN), ("المعلّم", TEAL), ("المسؤول", BLUE), ("المالك", VIOLET)]
    x = 370
    for (label, col) in roles:
        s.text(x, 424, 300, 86, [(label, 16, mix(col, WHITE, 0.30), True)],
               panel="pill", align="center", tint=mix(NAVY, col, 0.10))
        x += 320
    centered(s, 552, 1500, 130, [
        ("منصة تعليمية تتحوّل من مجرد إدارة التعلّم", 27, TEXT, True),
        ("إلى نظام تعلّم ذكي ومتكامل.", 27, mix(CYAN, WHITE, 0.25), True),
    ], panel=None, spacing=1.25)
    tail = [("تعلّم مستمر", GREEN), ("تحليل حقيقي", AMBER), ("تخصيص لكل طالب", VIOLET)]
    x = 470
    for (label, col) in tail:
        s.text(x, 742, 340, 72, [(label, 15, mix(col, WHITE, 0.30), True)],
               panel="pill", align="center", tint=mix(NAVY, col, 0.10))
        x += 360
    centered(s, 856, 1500, 60,
             [("منصة عربية أولًا · معمارية واضحة · بيانات محفوظة · ذكاء قابل للتوسّع", 15, MUTED, False)],
             panel=None)
    footer(s)
    return s


# ──────────────────────────── pptx assembly ─────────────────────────────────
def px2emu(px):
    return Emu(int(round(px / PX_PER_IN * 914400)))


def _set_typefaces(run, size_pt, color, bold):
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.name = FONT                      # a:latin
    run.font.color.rgb = RGBColor(*color)
    rPr = run._r.get_or_add_rPr()
    for tag in ("a:ea", "a:cs"):              # East-Asian + complex script (Arabic)
        el = rPr.makeelement(qn(tag), {"typeface": FONT})
        rPr.insert_element_before(el, "a:sym", "a:hlinkClick", "a:hlinkMouseOver",
                                  "a:rtl", "a:extLst")


def add_text(slide, spec, idx=0):
    x, y, w, h = spec["rect"]
    rtl = spec["rtl"]
    box = slide.shapes.add_textbox(px2emu(x), px2emu(y), px2emu(w), px2emu(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = px2emu(34)
    tf.margin_right = px2emu(34)
    tf.margin_top = px2emu(16)
    tf.margin_bottom = px2emu(12)
    tf.vertical_anchor = {"top": MSO_ANCHOR.TOP, "middle": MSO_ANCHOR.MIDDLE,
                          "bottom": MSO_ANCHOR.BOTTOM}[spec["anchor"]]
    align = {"right": PP_ALIGN.RIGHT, "center": PP_ALIGN.CENTER,
             "left": PP_ALIGN.LEFT}[spec["align"]]
    scale, need = fit_scale(spec["lines"], w, h)
    if scale < 0.999:
        SHRUNK.append((idx, spec["rect"], round(scale, 3)))
    lines = norm_lines(spec["lines"])
    for i, (text, size, color, bold, sb, rtl_override) in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        line_rtl = rtl if rtl_override is None else rtl_override
        if line_rtl:
            p._pPr.set("rtl", "1")
        p.line_spacing = spec["spacing"]
        if sb:
            p.space_before = Pt(round(sb * (0.6 + 0.4 * scale), 2))
        run = p.add_run()
        run.text = text
        _set_typefaces(run, max(11.0, round(size * scale, 1)), color, bold)
    return box


def add_fade(slide, idx=0):
    # Cinematic push/fly per-slide: variety + true 3D cube for two beats.
    kinds = ["fade", "push", "push", "cover", "fly", "zoom", "fade", "push",
             "fly", "cover", "push", "fade", "push", "cover", "fade", "zoom"]
    kind = kinds[(idx - 1) % len(kinds)] if idx else "fade"
    nsp = nsdecls("p")
    if kind == "fade":
        xml = '<p:transition %s spd="slow"><p:fade/></p:transition>' % nsp
    elif kind == "zoom":
        xml = ('<p:transition %s spd="med"><p:zoom/></p:transition>' % nsp)
    elif kind == "push":
        xml = ('<p:transition %s spd="med" thruBlk="1">'
               '<p:push thruBlk="1" dir="l"/></p:transition>' % nsp)
    elif kind == "cover":
        xml = ('<p:transition %s spd="med" thruBlk="1">'
               '<p:cover thruBlk="1" dir="l"/></p:transition>' % nsp)
    else:  # fly — cinematic float-in
        xml = ('<p:transition %s spd="med">'
               '<p:fly thruBlk="1" dir="l"/></p:transition>' % nsp)
    el = parse_xml(xml)
    slide._element.append(el)
    tn = el.find("{http://schemas.openxmlformats.org/presentationml/2006/main}transition")
    if tn is not None:
        tn.set("advTm", "0")  # click-advance preserved


def build_pptx(slides, pngs, out_path):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]
    for s, png in zip(slides, pngs):
        sl = prs.slides.add_slide(blank)
        sl.shapes.add_picture(png, 0, 0, width=prs.slide_width, height=prs.slide_height)
        for spec in s.texts:
            add_text(sl, spec, s.idx)
        add_fade(sl, s.idx)
    prs.save(out_path)
    return out_path


# ─────────────────────────────── validation ──────────────────────────────────
def overlaps(a, b, tol=2):
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    return not (ax + aw - tol <= bx or bx + bw - tol <= ax or
                ay + ah - tol <= by or by + bh - tol <= ay)


# ── real text metrics (Segoe UI) so wrapping/prediction matches PowerPoint ──
_FONT_FILES = {
    False: r"C:\Windows\Fonts\segoeui.ttf",
    True: r"C:\Windows\Fonts\segoeuib.ttf",
}
_FONT_CACHE = {}


def _px_font(size_pt, bold):
    px = max(4, int(round(size_pt * PX_PER_IN / 72.0 / SS)))
    key = (px, bool(bold))
    if key not in _FONT_CACHE:
        try:
            _FONT_CACHE[key] = ImageFont.truetype(_FONT_FILES[bool(bold)], px)
        except OSError:
            _FONT_CACHE[key] = ImageFont.load_default()
    return _FONT_CACHE[key]


def wrapped_line_count(text, size_pt, max_px, bold):
    """How many lines `text` occupies inside `max_px` (word wrap)."""
    f = _px_font(size_pt, bold)
    words = text.split(" ")
    lines, cur = 1, ""
    for w in words:
        trial = (cur + " " + w) if cur else w
        try:
            width = f.getlength(trial)
        except AttributeError:
            width = f.getsize(trial)[0]
        if width <= max_px or not cur:
            cur = trial
        else:
            lines += 1
            cur = w
    return lines


def est_height_px(lines, box_w, pad_x=44, pad_y=6, line_h=1.0, spacing=1.22):
    """Wrap each line with the real Segoe UI metrics and sum the heights."""
    total = 0.0
    for (text, size, color, bold, sb, rtl) in norm_lines(lines):
        n = wrapped_line_count(text, size, box_w - pad_x, bold)
        total += n * size * PX_PER_IN / 72.0 * spacing + sb * PX_PER_IN / 72.0
    return total + pad_y


def fit_scale(lines, box_w, box_h, pad_x=44, pad_y=6, spacing=1.22):
    """Shrink factor so a zone's text fits its panel (never below 11pt)."""
    need = est_height_px(lines, box_w, pad_x, pad_y, spacing=spacing)
    avail = max(20.0, box_h - 8)
    if need <= avail:
        return 1.0, need
    smallest = min(norm_lines(lines), key=lambda l: l[1])[1]
    limit = 11.0 / smallest
    return max(limit, avail / need), need


def validate(slides, verbose=True):
    errors, warnings, shrinks = [], [], []
    for s in slides:
        rects = []
        for spec in s.texts:
            x, y, w, h = spec["rect"]
            if x < 4 or y < 4 or x + w > W - 4 or y + h > H - 4:
                errors.append("slide %02d: rect out of canvas %s" % (s.idx, spec["rect"]))
            for other in rects:
                if overlaps(spec["rect"], other):
                    errors.append("slide %02d: overlapping text zones %s / %s"
                                  % (s.idx, spec["rect"], other))
            rects.append(spec["rect"])
            scale, need = fit_scale(spec["lines"], w, h)
            if scale < 0.999:
                shrinks.append((s.idx, spec["rect"], round(scale, 2),
                                round(min(l[1] for l in norm_lines(spec["lines"])) * scale, 1)))
                if scale < 0.80:
                    warnings.append("slide %02d: heavy shrink %.2f at %s"
                                    % (s.idx, scale, spec["rect"]))
    if verbose:
        print("--- validation ---")
        print("slides:", len(slides), "| text zones:", sum(len(s.texts) for s in slides))
        print("auto-shrunk zones:", len(shrinks))
        for (idx, rect, sc, small) in sorted(shrinks, key=lambda r: r[2])[:14]:
            print("   shrink slide %02d  x%.2f  min-font %.1fpt  %s" % (idx, sc, small, rect))
        for w in warnings:
            print("  WARN :", w)
        for e in errors:
            print("  ERROR:", e)
        print("errors: %d | warnings: %d" % (len(errors), len(warnings)))
    return errors, warnings


def inspect_pptx(path):
    """Second-stage QC on the written file: RTL, fonts, bounds, transitions."""
    prs = Presentation(path)
    sw, sh = prs.slide_width, prs.slide_height
    print("--- pptx QC ---")
    print("slide size: %.3f x %.3f in"
          % (sw / 914400.0, sh / 914400.0))
    print("slides: %d" % len(prs.slides))
    problems = []
    rtl_runs = total_runs = 0
    for idx, slide in enumerate(prs.slides, start=1):
        pics = boxes = 0
        has_transition = slide._element.find(
            "{http://schemas.openxmlformats.org/presentationml/2006/main}transition") is not None
        if not has_transition:
            problems.append("slide %02d: no transition" % idx)
        for shape in slide.shapes:
            if shape.shape_type == 13:
                pics += 1
            if shape.left < 0 or shape.top < 0 or shape.left + shape.width > sw or \
                    shape.top + shape.height > sh:
                problems.append("slide %02d: shape outside slide" % idx)
            if not shape.has_text_frame:
                continue
            boxes += 1
            for para in shape.text_frame.paragraphs:
                if para._pPr is not None and para._pPr.get("rtl") == "1":
                    rtl_runs += 1
                for run in para.runs:
                    total_runs += 1
                    rPr = run._r.find(
                        "{http://schemas.openxmlformats.org/drawingml/2006/main}rPr")
                    if rPr is None:
                        problems.append("slide %02d: run without rPr" % idx)
                        continue
                    for tag in ("latin", "cs"):
                        el = rPr.find("{http://schemas.openxmlformats.org/drawingml/2006/main}" + tag)
                        if el is None or el.get("typeface") != FONT:
                            problems.append("slide %02d: missing %s font" % (idx, tag))
                    if run.font.size is None or run.font.size.pt < 11:
                        problems.append("slide %02d: font below 11pt" % idx)
        print("slide %02d: %d pictures, %d text boxes" % (idx, pics, boxes))
    print("runs: %d | rtl paragraphs: %d" % (total_runs, rtl_runs))
    print("problems: %d" % len(problems))
    for p in problems[:25]:
        print("  !", p)
    return problems


def build_all(reuse_pngs=False):
    os.makedirs(ASSETS, exist_ok=True)
    slides = [b() for b in SLIDE_BUILDERS]
    pngs = []
    for s in slides:
        p = os.path.join(ASSETS, "slide_%02d.png" % s.idx)
        if not (reuse_pngs and os.path.exists(p)):
            s.render_png(p)
            print("rendered", os.path.basename(p), flush=True)
        pngs.append(p)
    errors, _ = validate(slides, verbose=True)
    build_pptx(slides, pngs, PPTX_OUT)
    if SHRUNK:
        print("shrunk zones in pptx: %d (worst %s)" % (len(SHRUNK), sorted(SHRUNK, key=lambda z: z[2])[:3]),
              flush=True)
    print("saved:", PPTX_OUT, flush=True)
    return errors


def chrome(s, title, subtitle=None, accent=CYAN, kicker=None):
    """Shared top band (RTL, right aligned) + accent rule."""
    top = 62
    if kicker:
        s.text(W - M - 700, top - 10, 700, 40, [(kicker, 13, accent, True)],
               panel=None, align="right", spacing=1.0)
        top += 40
    s.text(W - M - 1340, top, 1340, 92,
           [(title, 36, WHITE, True)], panel=None, align="right", spacing=1.0)
    y = top + (80 if subtitle else 54)
    ImageDraw.Draw(s.canvas, "RGBA").line(
        [(S(W - M - 200), S(y)), (S(W - M), S(y))],
        fill=rgba(accent, 235), width=max(1, S(3)))
    glow(s.canvas, W - M - 100, y, 220, 26, accent, 0.55, 2.2)
    glow(s.canvas, W - M - 100, y, 220, 26, accent, 0.55, 2.2)
    if subtitle:
        s.text(W - M - 1340, y + 16, 1340, 64, [(subtitle, 17, MUTED, False)],
               panel=None, align="right", spacing=1.15)


def footer(s, note=None, accent=CYAN):
    """Slide index (left) + brand wordmark (right) + optional footnote."""
    s.text(M, H - 76, 200, 44, [("%02d / %d" % (s.idx, TOTAL_SLIDES), 13, DIM, False)],
           panel=None, align="left")
    s.text(W - M - 320, H - 76, 320, 44, [("LearnPilot", 13, DIM, True)],
           panel=None, align="right")
    if note:
        s.text(M, H - 122, W - 2 * M, 46, [(note, 13, accent, False)],
               panel=None, align="right")


def centered(s, y, w, h, lines, **kw):
    return s.text((W - w) / 2, y, w, h, lines, align="center", **kw)


# ═════════════════════════════ SLIDE 1 — HERO ════════════════════════════════
def slide_01():
    s = Slide(1)
    c = s.canvas
    glow(c, W / 2, 470, 980, 640, BLUE, 0.30, 2.1)
    glow(c, W * 0.22, 360, 620, 460, VIOLET, 0.22, 2.2)
    glow(c, W * 0.80, 760, 680, 460, CYAN, 0.20, 2.2)
    floor_grid(c, (W / 2, 700), 700, H * 1.05, rays=30, steps=10, color=BLUE, alpha=100)
    ring(c, W / 2, 470, 700, 340, CYAN, 2.0, 85, 18, dash=24)
    ring(c, W / 2, 470, 900, 430, VIOLET, 1.4, 55, 16, dash=16)
    particles(c, 200, 11, CYAN, 125)
    sparkles(c, [(W * 0.14, 300, 12), (W * 0.86, 236, 10), (W * 0.70, 900, 9)], WHITE, 165)

    cy = 706
    for (size, hh, col) in ((340, 24, BLUE), (306, 28, VIOLET), (272, 32, CYAN)):
        s.box(1000, cy, size, size, hh, col)
        cy -= hh
    for (dx, cyy, sz) in ((-268, 664, 92), (0, 626, 78), (268, 664, 92)):
        s.box(1000 + dx, cyy, sz, sz, 54, mix(CYAN, WHITE, 0.10))
    s.icon("brain", 1000, 596, 84, mix(CYAN, WHITE, 0.35), 2.6, 245)

    centered(s, 168, 560, 52, [("منصة تعليمية ذكية مدعومة بالذكاء الاصطناعي", 14, CYAN, True)],
             panel="pill", glow=CYAN)
    centered(s, 236, 1500, 110, [("LearnPilot", 62, WHITE, True)], panel=None, spacing=1.0)
    centered(s, 350, 1500, 70, [("منصة تعليمية تتحوّل من إدارة التعلّم إلى نظام تعلّم ذكي ومتكامل", 24, TEXT, False)],
             panel=None, spacing=1.15)
    centered(s, 432, 1300, 54, [("تعلّم · تقييم · تحليل · تخصيص — في نظام واحد", 17, MUTED, False)],
             panel=None)
    chips = [("React 19", BLUE), ("Node + Express", GREEN), ("Prisma + PostgreSQL", CYAN),
             ("AI Cascade", VIOLET), ("RTL عربي/إنجليزي", TEAL)]
    x = 335
    for (label, col) in chips:
        s.text(x, 508, 250, 54, [(label, 13, mix(col, WHITE, 0.35), True)],
               panel="pill", align="center", accent=None)
        x += 270
    footer(s)
    return s


# ═══════════════════════════ SLIDE 2 — THE PROBLEM ═══════════════════════════
def slide_02():
    s = Slide(2)
    c = s.canvas
    glow(c, 520, 560, 640, 480, ROSE, 0.16, 2.2)
    glow(c, W - 520, 620, 560, 460, BLUE, 0.18, 2.2)
    floor_grid(c, (520, 900), 860, H * 1.05, rays=16, steps=6, color=VIOLET, alpha=70)
    particles(c, 110, 5, MUTED, 90)

    tiles = [(150, 300, "doc"), (450, 236, "check"), (760, 316, "chart"),
             (206, 596, "compass"), (520, 540, "brain"), (824, 632, "room")]
    for (x, y, ic) in tiles:
        s.box(x, y, 150, 150, 26, mix(NAVY, WHITE, 0.10))
        s.icon(ic, x + 130, y + 118, 54, mix(MUTED, WHITE, 0.25), 2.0, 200)
    for (a, b) in ((tiles[0], tiles[1]), (tiles[1], tiles[2]), (tiles[3], tiles[4]), (tiles[4], tiles[5])):
        glow_line(c, (a[0] + 210, a[1] + 96), (b[0] + 70, b[1] + 96), DIM, 2.0, 10, 150,
                  arrow=False, dashed=True)
    glow_line(c, (470, 762), (470, 852), ROSE, 2.6, 14, 190, arrow=True, arrow_len=20)
    s.box(470, 900, 190, 190, 30, mix(BLUE, INK, 0.15))
    s.icon("spark", 635, 998, 62, mix(CYAN, WHITE, 0.30), 2.4, 240)

    chrome(s, "التعلّم التقليدي مُجزَّأ", "المحتوى والتقييم والتقدّم والتخصيص والمساعدة الذكية في جزر منفصلة", ROSE)
    s.text(1040, 300, 864, 430, [
        ("ست جزر لا تتحدث مع بعضها", 21, WHITE, True),
        ("المحتوى في منصة، والتقييم في أخرى", 16, TEXT, False, 10),
        ("التقدّم مخزَّن في جدول منفصل", 16, TEXT, False, 6),
        ("التخصيص يعتمد على انطباع لا على بيانات", 16, TEXT, False, 6),
        ("متابعة المعلّم يدوية ومتأخرة", 16, TEXT, False, 6),
        ("المساعد الذكي لا يعرف منهج الطالب", 16, TEXT, False, 6),
        ("نتيجة: تجربة متعبة وتقدّم غير مرئي", 16, ROSE, True, 10),
    ], accent=ROSE, glow=ROSE, radius=24)
    s.text(1040, 762, 864, 150, [
        ("LearnPilot يجمعها في نظام تعلّم ذكي واحد", 24, mix(CYAN, WHITE, 0.25), True),
        ("بيانات التعلّم تتحرّك بين الدرس والتقييم والتحليل والتخصيص تلقائيًا.", 15, MUTED, False, 8),
    ], accent=CYAN, glow=CYAN, radius=24)
    footer(s)
    return s


# ════════════════════ SLIDE 3 — WHAT IS LEARNPILOT ══════════════════════════
def slide_03():
    s = Slide(3)
    c = s.canvas
    glow(c, 545, 600, 660, 560, BLUE, 0.22, 2.2)
    glow(c, W - 500, 560, 620, 500, VIOLET, 0.16, 2.2)
    floor_grid(c, (545, 980), 900, H * 1.05, rays=14, steps=5, color=BLUE, alpha=55)
    ring(c, 545, 600, 330, 255, CYAN, 1.8, 95, 16, dash=22)
    ring(c, 545, 600, 430, 330, VIOLET, 1.2, 55, 14, dash=14)
    particles(c, 90, 9, CYAN, 100)

    orbit = [("الطالب", "user", CYAN, 0), ("المعلّم", "teacher", TEAL, 45),
             ("المسؤول", "shield", BLUE, 90), ("المالك", "crown", VIOLET, 135),
             ("الذكاء الاصطناعي", "spark", VIOLET, 180), ("ذكاء التعلّم", "brain", CYAN, 225),
             ("التقييم", "check", GREEN, 270), ("التحليلات", "chart", AMBER, 315)]
    for (label, ic, col, ang) in orbit:
        a = math.radians(ang)
        cx = 545 + math.cos(a) * 330
        cy = 600 + math.sin(a) * 255
        glow_line(c, (545 + math.cos(a) * 118, 600 + math.sin(a) * 118),
                  (545 + math.cos(a) * 330, 600 + math.sin(a) * 255), col, 1.6, 10, 120,
                  arrow=False)
        s.text(cx - 130, cy - 26, 260, 52, [(label, 15, mix(col, WHITE, 0.30), True)],
               panel="glass", align="center", radius=26, accent=col, tint=mix(NAVY, col, 0.10))
        s.icon(ic, cx + 84, cy, 34, mix(col, WHITE, 0.25), 1.8, 220)
    sphere(c, 545, 600, 112, mix(BLUE, VIOLET, 0.35))

    chrome(s, "ما هو LearnPilot؟", "منصة تعليمية واحدة تربط الإنسان والبيانات والذكاء", BLUE,
           kicker="نظرة عامة")
    s.text(1040, 300, 864, 250, [
        ("منصة تعليمية متكاملة", 24, WHITE, True),
        ("تربط الطالب والمعلّم بمحركات تعلّم ذكية وذكاء اصطناعي — من الدرس حتى القياس والتخصيص،",
         17, TEXT, False, 12),
        ("مع حفظ كل بيانات التعلّم في قاعدة بيانات حقيقية.", 17, TEXT, False, 4),
    ], accent=BLUE, glow=BLUE, radius=24)
    facts = [("131 نقطة API", BLUE), ("56 جدولًا", CYAN), ("20 محرك ذكاء", VIOLET), ("53 صفحة", TEAL)]
    x = 1040
    for (label, col) in facts:
        s.text(x, 574, 202, 64, [(label, 14, mix(col, WHITE, 0.30), True)],
               panel="pill", align="center", accent=None)
        x += 214
    s.text(1040, 650, 864, 256, [
        ("كل ما تحتاجه المنصة موجود في نفس النظام", 19, mix(CYAN, WHITE, 0.20), True),
        ("دورات ودروس · تقييمات تكيفية · خطط تعلّم · تحليلات · إشعارات · ملفات · تعاون مباشر · إدارة وصلاحيات.",
         15, MUTED, False, 10),
        ("الواجهة عربية وإنجليزية بتخطيط RTL كامل.", 15, MUTED, False, 6),
    ], accent=CYAN, glow=CYAN, radius=24)
    footer(s)
    return s


# ═════════════════════════ SLIDE 4 — WHO USES IT ════════════════════════════
def slide_04():
    s = Slide(4)
    c = s.canvas
    glow(c, 300, 620, 560, 520, VIOLET, 0.15, 2.2)
    glow(c, 1700, 620, 560, 520, CYAN, 0.15, 2.2)
    floor_grid(c, (W / 2, 980), 900, H * 1.05, rays=20, steps=6, color=BLUE, alpha=60)
    particles(c, 80, 13, CYAN, 85)

    cards = [
        (1416, "الطالب", "student", CYAN, ["الدورات والدروس", "التقييمات والاختبارات",
                                          "خطط التعلّم والتقدّم", "المساعد الذكي"]),
        (976, "المعلّم", "teacher", TEAL, ["الفصول والطلاب", "الواجبات والتسليم",
                                           "الاختبارات والتصحيح", "تحليلات الفصل"]),
        (536, "المسؤول", "shield", BLUE, ["إدارة المستخدمين", "المحتوى والمقررات",
                                          "سجل التدقيق والصحة", "استخدام الذكاء الاصطناعي"]),
        (96, "المالك", "crown", VIOLET, ["رموز الدعوة والأدوار", "أعلام الميزات",
                                         "سياسة بوابة الذكاء", "المؤسسات والإعدادات"]),
    ]
    for (x, name, ic, col, bullets) in cards:
        s.box(x + 210, 320, 170, 170, 34, mix(col, INK, 0.25))
        s.icon(ic, x + 210, 372, 76, mix(col, WHITE, 0.45), 2.6, 250)
        lines = [(name, 24, WHITE, True)]
        for b in bullets:
            lines.append((b, 14, TEXT, False, 11))
        s.text(x + 16, 500, 388, 372, lines, accent=col, glow=col, radius=24,
               tint=mix(NAVY, col, 0.08))
    chrome(s, "من يستخدم المنصة؟", "أربعة أدوار واضحة، كل دور بواجهته وصلاحياته الخاصة", VIOLET,
           kicker="الأدوار")
    s.text(M, 890, W - 2 * M, 44,
           [("الدور يُثبَّت من جلسة السيرفر — لا يمكن للمستخدم تغيير دوره من الواجهة.", 14, AMBER, False)],
           panel=None, align="right")
    footer(s)
    return s


# ═══════════════════════════════ entry point ═════════════════════════════════
SLIDE_BUILDERS = [slide_01, slide_02, slide_03, slide_04, slide_05, slide_06,
                  slide_07, slide_08, slide_09, slide_10, slide_11, slide_12,
                  slide_13, slide_14, slide_15, slide_16]


if __name__ == "__main__":
    if "--validate" in sys.argv and os.path.exists(PPTX_OUT):
        inspect_pptx(PPTX_OUT)
    else:
        errs = build_all(reuse_pngs="--reuse" in sys.argv)
        inspect_pptx(PPTX_OUT)
        print("RESULT:", "OK" if not errs else "GEOMETRY ERRORS (%d)" % len(errs), flush=True)
        sys.exit(1 if errs else 0)