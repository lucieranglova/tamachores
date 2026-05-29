from PIL import Image, ImageDraw
import math, os

def draw_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    S = size / 512  # scale factor

    # ── Background: dark arcade purple, rounded square ─────────────────────
    d.rounded_rectangle([0, 0, size, size], radius=int(90 * S), fill='#0D0820')

    # ── Pixel grid dots (subtle arcade feel) ──────────────────────────────
    grid_step = int(32 * S)
    for gx in range(0, size, grid_step):
        for gy in range(0, size, grid_step):
            d.ellipse([gx, gy, gx + int(2*S), gy + int(2*S)], fill='#1A1035')

    # ── Egg body ──────────────────────────────────────────────────────────
    ex, ey = size * 0.5, size * 0.49
    erx, ery = size * 0.33, size * 0.40
    # Glow (outer)
    for glow in range(4, 0, -1):
        alpha = 40 - glow * 8
        glow_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow_img)
        g = glow * int(6 * S)
        gd.ellipse([ex-erx-g, ey-ery-g, ex+erx+g, ey+ery+g], fill=(255, 100, 160, alpha))
        img = Image.alpha_composite(img, glow_img)
        d = ImageDraw.Draw(img)
    # Egg fill (pink gradient simulation: lighter top)
    d.ellipse([ex-erx, ey-ery, ex+erx, ey+ery], fill='#FF6B9D', outline='#FF3D7F', width=int(6*S))
    # Highlight
    d.ellipse([ex-erx*0.55, ey-ery*0.65, ex-erx*0.1, ey-ery*0.25],
              fill=(255, 255, 255, 60))

    # ── LCD screen ────────────────────────────────────────────────────────
    sw, sh = size * 0.50, size * 0.33
    sx, sy = ex - sw/2, ey - sh/2 - size*0.03
    border = int(5 * S)
    d.rounded_rectangle([sx-border, sy-border, sx+sw+border, sy+sh+border],
                        radius=int(8*S), fill='#0F380F')
    d.rounded_rectangle([sx, sy, sx+sw, sy+sh], radius=int(5*S), fill='#9BBC0F')

    # Screen scanlines
    line_step = int(6 * S)
    for ly in range(int(sy), int(sy+sh), line_step):
        d.rectangle([int(sx), ly, int(sx+sw), ly + int(2*S)], fill=(0, 0, 0, 20))

    # ── Pixel creature (8×8 logical pixels) ───────────────────────────────
    HAPPY = [
        [0,0,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1],
        [1,1,0,1,1,0,1,1],
        [1,1,2,1,1,2,1,1],
        [1,1,1,1,1,1,1,1],
        [1,1,2,1,1,1,2,1],
        [1,0,1,2,2,2,1,0],
        [0,0,1,0,0,0,1,0],
    ]
    px = int(sh / 9.5)
    gw = 8 * px
    gh = 8 * px
    cx = int(sx + sw/2 - gw/2)
    cy = int(sy + sh/2 - gh/2) - int(2*S)
    for row, cols in enumerate(HAPPY):
        for col, val in enumerate(cols):
            if not val:
                continue
            color = '#0F380F' if val == 2 else '#306230'
            d.rectangle([cx+col*px, cy+row*px, cx+col*px+px-1, cy+row*px+px-1], fill=color)

    # Score bar below creature
    bar_h = int(sh * 0.12)
    bar_y = int(sy + sh - bar_h - 3*S)
    d.rectangle([int(sx+4*S), bar_y, int(sx+sw-4*S), bar_y+bar_h], fill='#306230')
    # Points bar filled 60%
    d.rectangle([int(sx+4*S), bar_y, int(sx+4*S + (sw-8*S)*0.6), bar_y+bar_h], fill='#8BAC0F')

    # ── Buttons below LCD ─────────────────────────────────────────────────
    btn_y = ey + ery * 0.45
    btn_r = int(14 * S)
    for i, bx in enumerate([ex - size*0.13, ex, ex + size*0.13]):
        color = '#FF3D7F' if i == 1 else '#3D1A6E'
        outline = '#FF9ECC' if i == 1 else '#8B5CF6'
        d.ellipse([bx-btn_r, btn_y-btn_r, bx+btn_r, btn_y+btn_r],
                  fill=color, outline=outline, width=int(3*S))

    # ── Corner pixel stars ────────────────────────────────────────────────
    star_color = '#FFD700'
    star_size = int(10 * S)
    for (sx2, sy2) in [(size*0.12, size*0.12), (size*0.88, size*0.11),
                       (size*0.10, size*0.86), (size*0.90, size*0.87)]:
        for dx, dy in [(0,0),(star_size,0),(0,star_size),(star_size,star_size),
                       (star_size//2, -star_size//2),(star_size//2, star_size*3//2),
                       (-star_size//2, star_size//2),(star_size*3//2, star_size//2)]:
            d.rectangle([int(sx2+dx-S), int(sy2+dy-S), int(sx2+dx+S), int(sy2+dy+S)],
                       fill=star_color)

    # ── "TC" pixel text ───────────────────────────────────────────────────
    # T
    tc_y = int(ey + ery * 0.72)
    tc_x = int(ex - 22*S)
    pw = int(5*S)
    ph = int(5*S)
    tc_color = '#FF9ECC'
    T = [(0,0),(1,0),(2,0),(3,0),(4,0),(2,1),(2,2),(2,3),(2,4)]
    C = [(1,0),(2,0),(3,0),(0,1),(0,2),(0,3),(1,4),(2,4),(3,4)]
    for (gx2,gy2) in T:
        d.rectangle([tc_x+gx2*pw*2, tc_y+gy2*ph, tc_x+gx2*pw*2+pw, tc_y+gy2*ph+ph], fill=tc_color)
    tc_x2 = int(ex + 4*S)
    for (gx2,gy2) in C:
        d.rectangle([tc_x2+gx2*pw*2, tc_y+gy2*ph, tc_x2+gx2*pw*2+pw, tc_y+gy2*ph+ph], fill=tc_color)

    return img

os.makedirs('frontend/public/icons', exist_ok=True)

for size in [192, 512]:
    icon = draw_icon(size)
    icon.save(f'frontend/public/icons/icon-{size}.png')
    print(f'✓ icon-{size}.png')

# Also save SVG placeholder reference
print('Hotovo!')
