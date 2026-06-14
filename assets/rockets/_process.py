"""
火箭照片批次處理
- 統一縮放至 600x1200 (PNG 透明背景)
- 簡單色度去背（白/黑/灰 → 透明）
- 中心裁切保留主體
- 對齊最終 rocket_<key>.png
"""
from PIL import Image
import os
import io

RAW = r'D:\game\assets\rockets\raw'
OUT = r'D:\game\assets\rockets\processed'

# 最終配對：key -> 原始檔名
# 注意：starship_block3/4/mars 暫時重用既有圖
MAPPING = {
    'scout':         'new_shepard.jpg',
    'falcon':        'falcon9_ses10.png',
    'heavy':         'falcon_heavy_demo.png',
    'dragon':        'dragon2.jpg',
    'starship':      'starship_ift5.jpg',
    'starship_v2':   'starship_ift2.jpg',
    'super_heavy':   'super_heavy.png',
    'tanker':        'starship_tanker.png',
    'lynx':          'lynx.png',
    'starship_block1': 'starship_sn8.jpg',
    'starship_block2': 'starship_sn15.jpg',
    'starship_block3': 'starship_ift5.jpg',   # 重用
    'starship_block4': 'starship_launch.png',
    'starship_hls':    'hls_rendering.png',
    'starship_mars':   'starship_ift2.jpg',   # 重用
}

# 目標尺寸
TARGET_W = 600
TARGET_H = 1200


def detect_bg_color(img):
    """偵測圖片四角的平均色 → 推測背景色"""
    w, h = img.size
    corners = [
        img.getpixel((2, 2)),
        img.getpixel((w - 3, 2)),
        img.getpixel((2, h - 3)),
        img.getpixel((w - 3, h - 3)),
    ]
    # 對 RGB 模式
    if isinstance(corners[0], tuple):
        avg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))
    else:
        avg = corners[0]
    return avg


def is_white_like(rgb, threshold=200):
    """判斷是否為白/淺灰背景"""
    r, g, b = rgb[:3]
    return r > threshold and g > threshold and b > threshold and abs(r - g) < 40 and abs(g - b) < 40


def is_black_like(rgb, threshold=60):
    """判斷是否為黑/深灰背景"""
    r, g, b = rgb[:3]
    return r < threshold and g < threshold and b < threshold


def remove_bg_by_color(img, bg_color, tolerance=60):
    """根據偵測的背景色，把背景轉透明"""
    img = img.convert('RGBA')
    datas = img.getdata()
    new_data = []
    bg_r, bg_g, bg_b = bg_color[:3]
    for item in datas:
        r, g, b, a = item
        dist = abs(r - bg_r) + abs(g - bg_g) + abs(b - bg_b)
        if dist < tolerance:
            new_data.append((r, g, b, 0))  # 透明
        else:
            new_data.append(item)
    img.putdata(new_data)
    return img


def remove_bg_advanced(img, bg_color, threshold=240):
    """進階去背：白/亮色背景漸進式去背"""
    img = img.convert('RGBA')
    datas = img.getdata()
    new_data = []
    bg_r, bg_g, bg_b = bg_color[:3]
    for item in datas:
        r, g, b, a = item
        if a == 0:
            new_data.append(item)
            continue
        # 計算與背景色的距離
        dist = abs(r - bg_r) + abs(g - bg_g) + abs(b - bg_b)
        if dist < 30:
            new_data.append((r, g, b, 0))
        elif dist < 80:
            new_data.append((r, g, b, int(a * 0.3)))
        elif dist < 150:
            new_data.append((r, g, b, int(a * 0.7)))
        else:
            new_data.append(item)
    img.putdata(new_data)
    return img


def find_content_bounds(img):
    """找出非透明內容的邊界"""
    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    return bbox


def fit_to_target(img, target_w, target_h):
    """將圖片縮放至目標尺寸（保持長寬比，置中）"""
    w, h = img.size
    if w == 0 or h == 0:
        return img

    # 先裁切到內容邊界
    bbox = find_content_bounds(img)
    if bbox:
        img = img.crop(bbox)
        w, h = img.size

    if w == 0 or h == 0:
        return img

    # 計算縮放比例（取較小值，確保完全放入）
    # 火箭比例約 1:4（寬:高），所以目標 1:2，需要 padding
    scale = min(target_w / w, target_h / h)
    new_w = int(w * scale)
    new_h = int(h * scale)

    img = img.resize((new_w, new_h), Image.LANCZOS)

    # 創建透明畫布
    canvas = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
    # 置中貼上
    x = (target_w - new_w) // 2
    y = (target_h - new_h) // 2
    canvas.paste(img, (x, y), img)
    return canvas


def process_one(key, src_name):
    src_path = os.path.join(RAW, src_name)
    if not os.path.exists(src_path):
        print(f'❌ {key}: 找不到 {src_name}')
        return

    # 強制重新讀取（避免 PIL 快取）
    with open(src_path, 'rb') as f:
        data = f.read()
    img = Image.open(io.BytesIO(data)).convert('RGB')

    # 偵測背景色
    bg = detect_bg_color(img)
    print(f'  {key}: {src_name} {img.size} 背景色={bg}')

    # 根據背景決定去背方式
    if is_white_like(bg):
        img = remove_bg_advanced(img, bg, threshold=240)
        print(f'    → 白背景去背')
    elif is_black_like(bg):
        img = remove_bg_advanced(img, bg, threshold=240)
        print(f'    → 黑背景去背')
    else:
        # 灰/混雜背景：嘗試簡單去背
        img = remove_bg_advanced(img, bg, threshold=240)
        print(f'    → 灰/混雜去背（容忍度↑）')

    # 縮放至目標尺寸
    img = fit_to_target(img, TARGET_W, TARGET_H)

    # 儲存
    out_name = f'rocket_{key}.png'
    out_path = os.path.join(OUT, out_name)
    img.save(out_path, 'PNG', optimize=True)
    print(f'  ✅ 儲存 {out_name} ({img.size[0]}x{img.size[1]})')


def main():
    os.makedirs(OUT, exist_ok=True)
    print(f'=== 火箭照片批次處理 ===')
    print(f'來源: {RAW}')
    print(f'輸出: {OUT}')
    print(f'目標: {TARGET_W}x{TARGET_H} PNG 透明')
    print()
    for key, src in MAPPING.items():
        process_one(key, src)
    print()
    print(f'✅ 完成 {len(MAPPING)} 個火箭')


if __name__ == '__main__':
    main()
