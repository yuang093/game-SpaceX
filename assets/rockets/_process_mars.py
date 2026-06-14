"""
為 starship_mars 製作火星紅色調版本
- 保留火箭主體（銀色 Starship）
- 將天空背景改為火星紅色調
- 將雲煙改為橘紅色
"""
from PIL import Image, ImageEnhance, ImageFilter
import os
import io

RAW = r'D:\game\assets\rockets\raw'
OUT = r'D:\game\assets\rockets\processed'

# 從 IFT-2 升空照（starship_ift2.jpg）製作火星版
src_path = os.path.join(RAW, 'starship_ift2.jpg')

# 強制重新讀取
with open(src_path, 'rb') as f:
    data = f.read()
img = Image.open(io.BytesIO(data)).convert('RGB')
print(f'來源: {src_path} {img.size}')

# 步驟 1: 將背景（非火箭部分）轉為火星紅色調
# 灰藍天空 (103, 112, 128) → 火星紅橘 (160, 80, 50)
def mars_color_shift(r, g, b):
    """將天空/雲的灰藍色調轉為火星紅橘色"""
    # 識別非火箭像素（亮度中等的灰藍色）
    is_sky = (r + g + b) > 200 and (r + g + b) < 700
    if is_sky:
        # 將灰藍色調 → 紅橘色
        new_r = min(255, int(r * 1.4 + 60))
        new_g = min(255, int(g * 0.7))
        new_b = min(255, int(b * 0.5))
        return (new_r, new_g, new_b)
    return (r, g, b)

# 套用色彩轉換
pixels = img.load()
w, h = img.size
for y in range(h):
    for x in range(w):
        r, g, b = pixels[x, y]
        pixels[x, y] = mars_color_shift(r, g, b)

# 增強紅色調
enhancer = ImageEnhance.Color(img)
img = enhancer.enhance(1.3)  # 飽和度增強
enhancer = ImageEnhance.Contrast(img)
img = enhancer.enhance(1.15)  # 對比增強

# 輕微模糊火星塵效果
img = img.filter(ImageFilter.GaussianBlur(radius=0.5))

# 縮放至 600x1200
TARGET_W, TARGET_H = 600, 1200
bbox = img.getbbox()  # 用作參考
scale = min(TARGET_W / w, TARGET_H / h)
new_w = int(w * scale)
new_h = int(h * scale)
img = img.resize((new_w, new_h), Image.LANCZOS)

# 居中放至透明畫布
canvas = Image.new('RGBA', (TARGET_W, TARGET_H), (0, 0, 0, 0))
x = (TARGET_W - new_w) // 2
y = (TARGET_H - new_h) // 2
canvas.paste(img, (x, y))

# 儲存
out_path = os.path.join(OUT, 'rocket_starship_mars.png')
canvas.save(out_path, 'PNG', optimize=True)
print(f'✅ 儲存 rocket_starship_mars.png (火星紅橘版, {canvas.size})')
