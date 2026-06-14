"""
使用 rembg AI 精準去背複雜背景火箭圖
"""
from rembg import remove
from PIL import Image
import os
import io

RAW = r'D:\game\assets\rockets\raw'
OUT = r'D:\game\assets\rockets\processed'

# 複雜背景需要 AI 去背的火箭
TARGETS = {
    'new_shepard.jpg': 'rocket_scout.png',         # 展覽+人群
    'falcon_heavy_demo.png': 'rocket_heavy.png',   # 雲煙+水
    'super_heavy.png': 'rocket_super_heavy.png',   # 升空塔+水
    'lynx.png': 'rocket_lynx.png',                 # 建築+行人
    'starship_sn8.jpg': 'rocket_starship_block1.png',  # 雲+煙
    'starship_launch.png': 'rocket_starship_block4.png',  # 升空
    'starship_ift5.jpg': 'rocket_starship.png',    # 升空塔
    'starship_ift2.jpg': 'rocket_starship_v2.png', # 灰藍天空
}

# 目標尺寸
TARGET_W, TARGET_H = 600, 1200


def fit_to_target(img, target_w, target_h):
    """縮放並居中"""
    w, h = img.size
    if w == 0 or h == 0:
        return img
    # 裁切到內容邊界
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


for src_name, out_name in TARGETS.items():
    src_path = os.path.join(RAW, src_name)
    out_path = os.path.join(OUT, out_name)

    if not os.path.exists(src_path):
        print(f'❌ 找不到 {src_name}')
        continue

    # 強制重新讀取
    with open(src_path, 'rb') as f:
        data = f.read()
    img = Image.open(io.BytesIO(data)).convert('RGB')
    print(f'處理: {src_name} {img.size}')

    # rembg 去背
    try:
        result = remove(img)
        print(f'  ✅ rembg 去背成功')
    except Exception as e:
        print(f'  ❌ rembg 失敗: {e}')
        continue

    # 縮放至目標尺寸
    result = fit_to_target(result, TARGET_W, TARGET_H)

    # 儲存
    result.save(out_path, 'PNG', optimize=True)
    print(f'  ✅ 儲存 {out_name}')

print()
print(f'✅ 完成 {len(TARGETS)} 個火箭 AI 去背')
