"""Cut the portrait out of its studio backdrop with an edge that holds up on
a light ground.

The first attempt thresholded luminance and took whatever the flood fill
touched. That gives a hard, stair-stepped outline: every pixel is either in or
out, so hair turns into a staircase and any backdrop pixel a shade outside the
window survives as a speck. Invisible on a dark page, ugly on a pale one.

This separates the two questions the job actually asks.

  Which side is a pixel on?   Connectivity answers that. The backdrop is one
                              flat region touching the border, so a flood fill
                              finds it exactly, and the subject's black shirt
                              is safe however close its value sits to the
                              backdrop's.

  How much of it is covered?  Distance from the backdrop value answers that,
                              but only in a narrow band around the boundary
                              where the question is real. `abs`, not a signed
                              difference: the shirt is darker than the backdrop
                              and the skin lighter, and both are equally "not
                              backdrop".

Edge colours are then un-composited, so no trace of the backdrop is left in
them either and the cutout sits correctly on any ground.
"""

import io
import struct
import sys
import zlib
from collections import deque

if len(sys.argv) != 3:
    raise SystemExit(
        "usage: python tools/portrait-matte.py <source.png> <out.png>\n"
        "  source: 8-bit PNG of a subject on a flat backdrop\n"
        "  out:    RGBA PNG, cropped to the subject\n"
        "See the portrait section of NOTES.md for why this is built the way it is."
    )

SRC, OUT = sys.argv[1], sys.argv[2]

# Deliberately tight. The shirt is black and the backdrop nearly so, and where
# their values meet a looser flood walks straight through the outline and eats
# holes out of the clothing. Anything the flood therefore leaves behind near the
# edge is cleaned by the coverage band below, which judges pixels on value
# rather than on reachability.
FLOOD_TOL = 1    # how far from the backdrop value the flood may wander
BAND = 4         # pixels either side of the boundary that get a soft alpha
NOISE = 3.0      # backdrop grain, discounted so it cannot tint the edge
FULL = 20.0      # distance from the backdrop that counts as fully covered
MARGIN = 8       # breathing room kept around the crop
MIN_BLOB = 400   # opaque islands smaller than this are specks, not the subject


def read_png(path):
    data = io.open(path, "rb").read()
    pos, idat, w, h, depth, ctype = 8, b"", 0, 0, 0, 0
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos : pos + 4])
        kind = data[pos + 4 : pos + 8]
        body = data[pos + 8 : pos + 8 + length]
        if kind == b"IHDR":
            w, h, depth, ctype = struct.unpack(">IIBB", body[:10])
        elif kind == b"IDAT":
            idat += body
        pos += 12 + length

    assert depth == 8 and ctype in (2, 6)
    n = 3 if ctype == 2 else 4
    raw = zlib.decompress(idat)
    stride = w * n
    rows, prev = [], bytearray(stride)
    i = 0
    for _ in range(h):
        f = raw[i]
        i += 1
        line = bytearray(raw[i : i + stride])
        i += stride
        for x in range(stride):
            a = line[x - n] if x >= n else 0
            b = prev[x]
            c = prev[x - n] if x >= n else 0
            if f == 1:
                line[x] = (line[x] + a) & 255
            elif f == 2:
                line[x] = (line[x] + b) & 255
            elif f == 3:
                line[x] = (line[x] + ((a + b) >> 1)) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 255
        rows.append(line)
        prev = line
    return w, h, n, rows


def write_rgba(path, w, h, rows):
    raw = bytearray()
    for line in rows:
        raw.append(0)
        raw += line

    def chunk(kind, data):
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
        )

    io.open(path, "wb").write(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )


w, h, n, rows = read_png(SRC)
lum = [[0] * w for _ in range(h)]
for y in range(h):
    row = rows[y]
    ly = lum[y]
    for x in range(w):
        o = x * n
        ly[x] = (row[o] * 299 + row[o + 1] * 587 + row[o + 2] * 114) // 1000

# The backdrop value, taken from the corners rather than assumed.
corners = [lum[y][x] for y in (2, 3, h - 3, h - 4) for x in (2, 3, w - 3, w - 4)]
B = sorted(corners)[len(corners) // 2]
print(f"source {w}x{h}, backdrop luminance {B}")

# --- which side: connectivity -------------------------------------------
bg = bytearray(w * h)
q = deque()


def seed(x, y):
    if not bg[y * w + x] and abs(lum[y][x] - B) <= FLOOD_TOL:
        bg[y * w + x] = 1
        q.append((x, y))


for x in range(w):
    seed(x, 0)
    seed(x, h - 1)
for y in range(h):
    seed(0, y)
    seed(w - 1, y)

while q:
    x, y = q.popleft()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx]:
            if abs(lum[ny][nx] - B) <= FLOOD_TOL:
                bg[ny * w + nx] = 1
                q.append((nx, ny))

print(f"backdrop: {sum(bg) * 100 // (w * h)}% of the frame")

# --- the band where coverage is a real question -------------------------
# Grown from the background by BAND pixels, as two 1D passes.
near = bytearray(bg)
for _ in range(BAND):
    nxt = bytearray(near)
    for y in range(h):
        base = y * w
        for x in range(w):
            if near[base + x]:
                continue
            if (x > 0 and near[base + x - 1]) or (x + 1 < w and near[base + x + 1]):
                nxt[base + x] = 1
    near = nxt
    nxt = bytearray(near)
    for y in range(h):
        base = y * w
        for x in range(w):
            if near[base + x]:
                continue
            if (y > 0 and near[base - w + x]) or (y + 1 < h and near[base + w + x]):
                nxt[base + x] = 1
    near = nxt

# --- coverage ------------------------------------------------------------
alpha = [[0] * w for _ in range(h)]
span = FULL - NOISE
for y in range(h):
    ly = lum[y]
    ay = alpha[y]
    base = y * w
    for x in range(w):
        if bg[base + x]:
            continue
        if not near[base + x]:
            ay[x] = 255
            continue
        d = abs(ly[x] - B) - NOISE
        if d <= 0:
            ay[x] = 0
        elif d >= span:
            ay[x] = 255
        else:
            ay[x] = int(d / span * 255 + 0.5)

# --- fill holes ----------------------------------------------------------
# Shadowed skin and cloth sit at the backdrop's own value in places, and the
# flood walks through such a patch into the middle of the subject. What it
# leaves behind is a transparent island enclosed by the subject -- a bite out
# of a forearm, a hole in a shirt. Anything transparent that cannot be reached
# from outside the frame is one of those, and belongs to the subject.
outside = bytearray(w * h)
q = deque()
for x in range(w):
    for y in (0, h - 1):
        if not outside[y * w + x] and alpha[y][x] == 0:
            outside[y * w + x] = 1
            q.append((x, y))
for y in range(h):
    for x in (0, w - 1):
        if not outside[y * w + x] and alpha[y][x] == 0:
            outside[y * w + x] = 1
            q.append((x, y))
while q:
    x, y = q.popleft()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < w and 0 <= ny < h and not outside[ny * w + nx] and alpha[ny][nx] == 0:
            outside[ny * w + nx] = 1
            q.append((nx, ny))

filled = 0
for y in range(h):
    ay = alpha[y]
    base = y * w
    for x in range(w):
        if ay[x] == 0 and not outside[base + x]:
            ay[x] = 255
            filled += 1
print(f"enclosed holes filled: {filled} px")

# --- drop specks ---------------------------------------------------------
seen = bytearray(w * h)
kept = 0
dropped = 0
for sy in range(h):
    for sx in range(w):
        i = sy * w + sx
        if seen[i] or alpha[sy][sx] == 0:
            continue
        stack = [(sx, sy)]
        seen[i] = 1
        blob = []
        while stack:
            x, y = stack.pop()
            blob.append((x, y))
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                j = ny * w + nx
                if 0 <= nx < w and 0 <= ny < h and not seen[j] and alpha[ny][nx] > 0:
                    seen[j] = 1
                    stack.append((nx, ny))
        if len(blob) < MIN_BLOB:
            dropped += 1
            for x, y in blob:
                alpha[y][x] = 0
        else:
            kept += 1
print(f"regions kept {kept}, specks dropped {dropped}")

# --- crop ----------------------------------------------------------------
minx, miny, maxx, maxy = w, h, -1, -1
for y in range(h):
    ay = alpha[y]
    for x in range(w):
        if ay[x] > 6:
            if x < minx:
                minx = x
            if x > maxx:
                maxx = x
            if y < miny:
                miny = y
            if y > maxy:
                maxy = y
minx = max(0, minx - MARGIN)
miny = max(0, miny - MARGIN)
maxx = min(w - 1, maxx + MARGIN)
maxy = min(h - 1, maxy + MARGIN)
cw, ch = maxx - minx + 1, maxy - miny + 1

# --- un-composite and write ---------------------------------------------
out = []
for y in range(miny, maxy + 1):
    row = rows[y]
    ay = alpha[y]
    line = bytearray()
    for x in range(minx, maxx + 1):
        o = x * n
        a = ay[x]
        if a == 0:
            line += b"\x00\x00\x00\x00"
            continue
        if a == 255:
            line += bytes((row[o], row[o + 1], row[o + 2], 255))
            continue
        cover = a / 255.0
        px = []
        for ch_i in range(3):
            f = (row[o + ch_i] - (1.0 - cover) * B) / cover
            px.append(0 if f < 0 else (255 if f > 255 else int(f + 0.5)))
        line += bytes((px[0], px[1], px[2], a))
    out.append(line)

write_rgba(OUT, cw, ch, out)
print(f"cropped to {cw}x{ch} (ratio {cw / ch:.2f}), {len(io.open(OUT, 'rb').read()) // 1024} KB")
