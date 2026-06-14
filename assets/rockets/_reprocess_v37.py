"""
v3.7 重做 3 個去背失敗的火箭照片
- falcon: rembg AI 去藍天
- block3: rembg AI 去水面
- mars: 重做色彩轉換 + rembg 去背
"""
from rembg import remove
from PIL import Image, ImageEnhance, ImageFilter
import os
import io

RAW = r'D:\game\assets\rockets\raw'
OUT = r'D:\game\assets\rockets\processed'

TARGET_W, TARGET_H = 600, 1200


def fit_to_target(img, target_w, target_h):
    """縮放並置中到透明畫布"""
    if img.mode == 'RGBA':
        alpha = img.split()[-1]
        bbox = alpha.getbbox()
        if bbox:
            img = img.crop(bbox)
    w, h = img.size
    if w == 0 or h == 0:
        return img
    scale = min(target_w / w, target_h / h)
    new_w = int(w * scale)
    new_h = int(h * scale)
    img = img.resize((new_w, new_h), Image.LANCZOS)
    canvas = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
    x = (target_w - new_w) // 2
    y = (target_h - new_h) // 2
    canvas.paste(img, (x, y), img)
    return canvas


# ============================================================
# 1. FALCON - rembg AI 去藍天
# ============================================================
print('=== 1/3 FALCON ===')
src = os.path.join(RAW, 'falcon9_ses10.png')
with open(src, 'rb') as f:
    data = f.read()
img = Image.open(io.BytesIO(data)).convert('RGB')
print(f'來源: {img.size}')
try:
    result = remove(img)
    print('  ✅ rembg 成功')
    result = fit_to_target(result, TARGET_W, TARGET_H)
    result.save(os.path.join(OUT, 'rocket_falcon.png'), 'PNG', optimize=True)
    print('  ✅ 儲存 rocket_falcon.png')
except Exception as e:
    print(f'  ❌ 失敗: {e}')


# ============================================================
# 2. BLOCK3 - rembg AI 去水面
# ============================================================
print()
print('=== 2/3 BLOCK3 (IFT-5) ===')
src = os.path.join(RAW, 'starship_ift5.jpg')
with open(src, 'rb') as f:
    data = f.read()
img = Image.open(io.BytesIO(data)).convert('RGB')
print(f'來源: {img.size}')
try:
    result = remove(img)
    print('  ✅ rembg 成功')
    result = fit_to_target(result, TARGET_W, TARGET_H)
    result.save(os.path.join(OUT, 'rocket_starship_block3.png'), 'PNG', optimize=True)
    print('  ✅ 儲存 rocket_starship_block3.png')
except Exception as e:
    print(f'  ❌ 失敗: {e}')


# ============================================================
# 3. MARS - 色彩轉換 + rembg 去背
# ============================================================
print()
print('=== 3/3 MARS (IFT-2 火星版) ===')
src = os.path.join(RAW, 'starship_ift2.jpg')
with open(src, 'rb') as f:
    data = f.read()
img = Image.open(io.BytesIO(data)).convert('RGB')
print(f'來源: {img.size}')

# 步驟 1: rembg 去背（先去掉天空/雲）
try:
    img = remove(img)
    print('  ✅ rembg 成功（先去背）')
except Exception as e:
    print(f'  ⚠️ rembg 失敗: {e}，改用色彩轉換')

# 步驟 2: 將剩餘背景轉火星紅橘
# 火箭本體銀色會保留，透明區域塗上紅橘色再變回透明
# 簡化做法：直接在 RGBA 上對 RGB 通道做色彩轉換
if img.mode == 'RGBA':
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0:
                # 透明區域保留透明
                continue
            # 識別非火箭像素：亮度高、飽和度低（雲/煙）
            brightness = (r + g + b) / 3
            max_c = max(r, g, b)
            min_c = min(r, g, b)
            saturation = (max_c - min_c) / max(max_c, 1)
            # 灰白煙/雲特徵：亮度 > 120 且飽和度 < 0.4
            if brightness > 100 and saturation < 0.45:
                # 灰白 → 火星紅橘煙塵
                nr = min(255, int(brightness * 1.4 + 40))
                ng = min(255, int(brightness * 0.7))
                nb = min(255, int(brightness * 0.4))
                pixels[x, y] = (nr, ng, nb, int(a * 0.85))
            # 藍天特徵：B > R + 20
            elif b > r + 15 and b > g:
                nr = min(255, int(r * 1.5 + 50))
                ng = min(255, int(g * 0.6))
                nb = min(255, int(b * 0.4))
                pixels[x, y] = (nr, ng, nb, a)
    # 增強紅橘色調
    enhancer = ImageEnhance.Color(img)
    img = enhancer.enhance(1.3)
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.1)
    # 輕微模糊火星塵
    img = img.filter(ImageFilter.GaussianBlur(radius=0.5))

result = fit_to_target(img, TARGET_W, TARGET_H)
result.save(os.path.join(OUT, 'rocket_starship_mars.png'), 'PNG', optimize=True)
print('  ✅ 儲存 rocket_starship_mars.png')

print()
print('✅ 完成 3 個火箭 v3.7 重做')
