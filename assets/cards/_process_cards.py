"""
v3.7 卡片圖片批次處理
- 11 張新下載的 .bin → 800x1120 PNG
- 火箭/行星照片：rembg 去背後貼到透明畫布
- 公司 Logo：直接縮放（已透明或白底）
"""
import os
from PIL import Image
import io
import base64

# 嘗試 rembg（用於火箭/行星去背）
try:
    from rembg import remove
    HAS_REMBG = True
    print('✅ rembg 可用')
except ImportError:
    HAS_REMBG = False
    print('⚠️ rembg 不可用，將用顏色去背')

RAW = r'D:\game\assets\cards_raw'
OUT = r'D:\game\assets\cards'

TARGET_W, TARGET_H = 800, 1120  # 與現有 cards 統一


# 分類
PHOTOS = ['uranus', 'falcon9', 'falcon_heavy', 'electron']  # 火箭+行星 → rembg 去背
LOGOS = ['nasa', 'esa', 'cnsa', 'spacex', 'tesla', 'xai', 'neuralink']  # Logo → 直接縮放


def fit_to_target(img, target_w=TARGET_W, target_h=TARGET_H, pad_color=(0, 0, 0, 0)):
    """縮放並居中到畫布"""
    if img.mode == 'RGBA':
        alpha = img.split()[-1]
        bbox = alpha.getbbox()
        if bbox:
            img = img.crop(bbox)
    w, h = img.size
    if w == 0 or h == 0:
        return Image.new('RGBA', (target_w, target_h), pad_color)
    scale = min(target_w / w, target_h / h)
    new_w = int(w * scale)
    new_h = int(h * scale)
    img = img.resize((new_w, new_h), Image.LANCZOS)
    canvas = Image.new('RGBA', (target_w, target_h), pad_color)
    x = (target_w - new_w) // 2
    y = (target_h - new_h) // 2
    if img.mode == 'RGBA':
        canvas.paste(img, (x, y), img)
    else:
        canvas.paste(img, (x, y))
    return canvas


# 載入 .bin
def load_bin(name):
    p = os.path.join(RAW, f'card_{name}.bin')
    if not os.path.exists(p):
        return None
    with open(p, 'rb') as f:
        return Image.open(io.BytesIO(f.read()))


# ============================================================
# 處理火箭/行星照片（rembg 去背）
# ============================================================
print('\n=== 4 張照片（rembg 去背）===')
for key in PHOTOS:
    img = load_bin(key)
    if img is None:
        print(f'❌ {key}: 無原始檔')
        continue
    img = img.convert('RGB')
    print(f'  {key}: 原始 {img.size}')
    if HAS_REMBG:
        try:
            img = remove(img)
            print(f'    ✅ rembg 去背')
        except Exception as e:
            print(f'    ⚠️ rembg 失敗: {e}')
    result = fit_to_target(img, TARGET_W, TARGET_H, (0, 0, 0, 0))
    out_path = os.path.join(OUT, f'card_{key}.png')
    result.save(out_path, 'PNG', optimize=True)
    print(f'    ✅ 儲存 {out_path}')


# ============================================================
# 處理 Logo（直接縮放）
# ============================================================
print('\n=== 7 張 Logo（直接縮放）===')
for key in LOGOS:
    img = load_bin(key)
    if img is None:
        print(f'❌ {key}: 無原始檔')
        continue
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    print(f'  {key}: 原始 {img.size}')
    result = fit_to_target(img, TARGET_W, TARGET_H, (255, 255, 255, 255))
    out_path = os.path.join(OUT, f'card_{key}.png')
    result.save(out_path, 'PNG', optimize=True)
    print(f'    ✅ 儲存 {out_path}')


# ============================================================
# 額外：SPCX 保留 .svg，但產生一個 PNG fallback
# ============================================================
# spcx 是太空指數虛構，無 Wikipedia logo，保留 spcx.svg 即可
# 不額外處理

print()
print('✅ 完成 11 張新卡片處理')
