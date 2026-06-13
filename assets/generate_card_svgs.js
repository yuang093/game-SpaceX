// 為空殼卡片生成有辨識度的新 SVG
// 設計原則：每張卡片有獨特的主體圖形（非空心圓），保持 240x320 viewBox
const fs = require('fs');
const path = require('path');

const OUT = 'D:/game/assets/cards';

// 通用工具：背景 + 主體 + 標籤
function wrap(content, title, labelColor = '#FFFFFF') {
    return `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#0a0a1a"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  ${content}
  <text x="120" y="295" text-anchor="middle" fill="${labelColor}" font-size="18" font-weight="bold" font-family="sans-serif" letter-spacing="1">${title}</text>
</svg>`;
}

// ============ 火箭類 (8 個空殼要重畫) ============
// 共用：火箭本體 + 整流罩 + 引擎噴嘴 + 火焰 + 左右 fin
function rocketSvg({ body, dark, fin, flame, label, fins = 'normal' }) {
    const bodyGrad = `<linearGradient id="rb" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${dark}"/>
      <stop offset="50%" stop-color="${body}"/>
      <stop offset="100%" stop-color="${dark}"/>
    </linearGradient>`;
    let finPaths = '';
    if (fins === 'wide') {
        finPaths = `<polygon points="105,170 80,210 105,205" fill="${fin}"/>
                    <polygon points="135,170 160,210 135,205" fill="${fin}"/>`;
    } else if (fins === 'big') {
        finPaths = `<polygon points="100,160 70,215 100,210" fill="${fin}"/>
                    <polygon points="140,160 170,215 140,210" fill="${fin}"/>`;
    } else {
        finPaths = `<polygon points="105,180 90,210 105,205" fill="${fin}"/>
                    <polygon points="135,180 150,210 135,205" fill="${fin}"/>`;
    }
    return wrap(`<defs>${bodyGrad}</defs>
    <!-- 整流罩 -->
    <path d="M 110 60 Q 120 40 130 60 L 130 75 L 110 75 Z" fill="${body}"/>
    <!-- 本體 -->
    <rect x="110" y="75" width="20" height="115" fill="url(#rb)"/>
    <!-- 細節條 -->
    <line x1="110" y1="105" x2="130" y2="105" stroke="${dark}" stroke-width="1.5"/>
    <line x1="110" y1="140" x2="130" y2="140" stroke="${dark}" stroke-width="1.5"/>
    <!-- 引擎 -->
    <rect x="113" y="190" width="14" height="14" fill="#333"/>
    <!-- 翅膀/fins -->
    ${finPaths}
    <!-- 火焰 -->
    <ellipse cx="120" cy="220" rx="20" ry="30" fill="${flame}" opacity="0.8"/>
    <ellipse cx="120" cy="225" rx="12" ry="22" fill="#FFD700" opacity="0.9"/>
    <ellipse cx="120" cy="230" rx="6" ry="14" fill="#FFFFFF"/>`,
    label);
}

// Falcon 1: 小型銀色火箭
fs.writeFileSync(path.join(OUT, 'rocket_falcon1.svg'), rocketSvg({
    body: '#E8E8E8', dark: '#666', fin: '#888', flame: '#FF8800', label: 'FALCON 1', fins: 'normal'
}));

// Falcon Heavy: 三節並排火箭
fs.writeFileSync(path.join(OUT, 'rocket_fh.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#0a0a1a"/>
    </linearGradient>
    <linearGradient id="rb" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#666"/><stop offset="50%" stop-color="#E8E8E8"/><stop offset="100%" stop-color="#666"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 左側助推器 -->
  <rect x="60" y="80" width="14" height="110" fill="url(#rb)"/>
  <path d="M 60 80 Q 67 65 74 80 Z" fill="#E8E8E8"/>
  <polygon points="60,180 50,200 60,195" fill="#888"/>
  <polygon points="74,180 84,200 74,195" fill="#888"/>
  <ellipse cx="67" cy="220" rx="8" ry="20" fill="#FF8800" opacity="0.8"/>
  <!-- 中央主芯 -->
  <rect x="113" y="50" width="14" height="140" fill="url(#rb)"/>
  <path d="M 113 50 Q 120 30 127 50 Z" fill="#E8E8E8"/>
  <polygon points="113,180 103,205 113,200" fill="#888"/>
  <polygon points="127,180 137,205 127,200" fill="#888"/>
  <ellipse cx="120" cy="225" rx="9" ry="22" fill="#FF8800" opacity="0.8"/>
  <!-- 右側助推器 -->
  <rect x="166" y="80" width="14" height="110" fill="url(#rb)"/>
  <path d="M 166 80 Q 173 65 180 80 Z" fill="#E8E8E8"/>
  <polygon points="166,180 156,200 166,195" fill="#888"/>
  <polygon points="180,180 190,200 180,195" fill="#888"/>
  <ellipse cx="173" cy="220" rx="8" ry="20" fill="#FF8800" opacity="0.8"/>
  <text x="120" y="295" text-anchor="middle" fill="#E8E8E8" font-size="14" font-weight="bold" font-family="sans-serif" letter-spacing="1">FALCON HEAVY</text>
</svg>`);

// Starship HLS: 月球著陸器（大肚子+4 腳架）
fs.writeFileSync(path.join(OUT, 'rocket_hls.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#0a0a1a"/>
    </linearGradient>
    <linearGradient id="ss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F0F0F0"/><stop offset="100%" stop-color="#888"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 月面 -->
  <ellipse cx="120" cy="270" rx="100" ry="8" fill="#444" opacity="0.5"/>
  <!-- 4 個著陸腳架 -->
  <line x1="80" y1="200" x2="65" y2="260" stroke="#666" stroke-width="3"/>
  <line x1="160" y1="200" x2="175" y2="260" stroke="#666" stroke-width="3"/>
  <line x1="90" y1="210" x2="80" y2="265" stroke="#666" stroke-width="3"/>
  <line x1="150" y1="210" x2="160" y2="265" stroke="#666" stroke-width="3"/>
  <line x1="80" y1="200" x2="90" y2="210" stroke="#666" stroke-width="3"/>
  <line x1="160" y1="200" x2="150" y2="210" stroke="#666" stroke-width="3"/>
  <!-- 著陸器主體（梯形大肚子）-->
  <path d="M 75 200 L 165 200 L 155 110 L 85 110 Z" fill="url(#ss)"/>
  <!-- 駕駛艙窗 -->
  <rect x="100" y="120" width="40" height="8" fill="#1a4a6a" opacity="0.8"/>
  <!-- 細節 -->
  <line x1="85" y1="140" x2="155" y2="140" stroke="#666" stroke-width="1.5"/>
  <line x1="87" y1="170" x2="153" y2="170" stroke="#666" stroke-width="1.5"/>
  <!-- 月亮（背景） -->
  <circle cx="200" cy="60" r="18" fill="#DDD" opacity="0.4"/>
  <circle cx="194" cy="56" r="2" fill="#999" opacity="0.5"/>
  <circle cx="204" cy="64" r="1.5" fill="#999" opacity="0.5"/>
  <text x="120" y="295" text-anchor="middle" fill="#F0F0F0" font-size="16" font-weight="bold" font-family="sans-serif" letter-spacing="1">STARSHIP HLS</text>
</svg>`);

// Dragon: 圓錐膠囊 + 太陽能板
fs.writeFileSync(path.join(OUT, 'rocket_dragon.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#0a0a1a"/>
    </linearGradient>
    <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F5F5F5"/><stop offset="100%" stop-color="#AAA"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 太陽能板 -->
  <rect x="20" y="130" width="50" height="40" fill="#1a2a6a" stroke="#444"/>
  <line x1="45" y1="130" x2="45" y2="170" stroke="#666"/>
  <line x1="20" y1="150" x2="70" y2="150" stroke="#666"/>
  <line x1="70" y1="150" x2="85" y2="155" stroke="#666" stroke-width="2"/>
  <rect x="170" y="130" width="50" height="40" fill="#1a2a6a" stroke="#444"/>
  <line x1="195" y1="130" x2="195" y2="170" stroke="#666"/>
  <line x1="170" y1="150" x2="220" y2="150" stroke="#666"/>
  <line x1="170" y1="150" x2="155" y2="155" stroke="#666" stroke-width="2"/>
  <!-- 膠囊主體 -->
  <path d="M 85 130 L 155 130 L 155 200 Q 155 215 120 215 Q 85 215 85 200 Z" fill="url(#dg)"/>
  <!-- 圓錐頭 -->
  <path d="M 85 130 Q 120 80 155 130 Z" fill="url(#dg)"/>
  <!-- 窗 -->
  <circle cx="120" cy="160" r="6" fill="#1a4a6a" stroke="#444"/>
  <!-- 細節線 -->
  <line x1="85" y1="185" x2="155" y2="185" stroke="#666" stroke-width="1"/>
  <text x="120" y="295" text-anchor="middle" fill="#F5F5F5" font-size="18" font-weight="bold" font-family="sans-serif" letter-spacing="1">DRAGON</text>
</svg>`);

// SLS: 大型橘色火箭
fs.writeFileSync(path.join(OUT, 'rocket_sls.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#0a0a1a"/>
    </linearGradient>
    <linearGradient id="sls" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#A04000"/><stop offset="50%" stop-color="#FFA040"/><stop offset="100%" stop-color="#A04000"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 整流罩尖 -->
  <path d="M 95 50 Q 120 30 145 50 L 145 75 L 95 75 Z" fill="url(#sls)"/>
  <!-- 巨型主芯 -->
  <rect x="95" y="75" width="50" height="135" fill="url(#sls)"/>
  <!-- 兩側 SRB（白色）-->
  <rect x="65" y="90" width="22" height="115" fill="#F0F0F0"/>
  <path d="M 65 90 Q 76 80 87 90 Z" fill="#F0F0F0"/>
  <rect x="153" y="90" width="22" height="115" fill="#F0F0F0"/>
  <path d="M 153 90 Q 164 80 175 90 Z" fill="#F0F0F0"/>
  <!-- USA 文字（假） -->
  <text x="120" y="135" text-anchor="middle" fill="#1a1a2e" font-size="11" font-weight="bold">USA</text>
  <text x="120" y="170" text-anchor="middle" fill="#1a1a2e" font-size="9">NASA</text>
  <!-- 引擎噴嘴 -->
  <rect x="100" y="210" width="40" height="20" fill="#333"/>
  <polygon points="100,230 95,250 110,230" fill="#222"/>
  <polygon points="140,230 145,250 130,230" fill="#222"/>
  <polygon points="120,230 115,250 125,230" fill="#222"/>
  <!-- 火焰 -->
  <ellipse cx="120" cy="260" rx="50" ry="25" fill="#FF8800" opacity="0.8"/>
  <ellipse cx="120" cy="265" rx="35" ry="18" fill="#FFD700"/>
  <text x="120" y="295" text-anchor="middle" fill="#FFA040" font-size="20" font-weight="bold" font-family="sans-serif" letter-spacing="2">SLS</text>
</svg>`);

// Soyuz: 三段錐形（俄式）
fs.writeFileSync(path.join(OUT, 'rocket_soyuz.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#0a0a1a"/>
    </linearGradient>
    <linearGradient id="sz" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#666"/><stop offset="50%" stop-color="#E0E0E0"/><stop offset="100%" stop-color="#666"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 整流罩 -->
  <path d="M 105 55 Q 120 35 135 55 L 135 80 L 105 80 Z" fill="url(#sz)"/>
  <!-- 上段（軌道段）白 -->
  <rect x="105" y="80" width="30" height="40" fill="url(#sz)"/>
  <!-- 中段錐形（白色）-->
  <rect x="105" y="120" width="30" height="60" fill="url(#sz)"/>
  <!-- 下段錐形（白色，4 個錐）-->
  <path d="M 105 180 L 135 180 L 145 230 L 95 230 Z" fill="url(#sz)"/>
  <!-- 4 個小型助推器錐 -->
  <polygon points="100,150 90,230 100,230" fill="#CCC"/>
  <polygon points="140,150 150,230 140,230" fill="#CCC"/>
  <polygon points="105,150 95,230 105,230" fill="#AAA"/>
  <polygon points="135,150 145,230 135,230" fill="#AAA"/>
  <!-- 旗幟 -->
  <rect x="110" y="95" width="20" height="3" fill="#FFFFFF"/>
  <rect x="110" y="98" width="20" height="3" fill="#1a4a8a"/>
  <rect x="110" y="101" width="20" height="3" fill="#C8323C"/>
  <!-- 引擎 -->
  <rect x="110" y="230" width="20" height="12" fill="#333"/>
  <!-- 火焰 -->
  <ellipse cx="120" cy="260" rx="25" ry="20" fill="#FF8800" opacity="0.7"/>
  <ellipse cx="120" cy="265" rx="15" ry="14" fill="#FFD700"/>
  <text x="120" y="295" text-anchor="middle" fill="#E0E0E0" font-size="16" font-weight="bold" font-family="sans-serif" letter-spacing="1">SOYUZ</text>
</svg>`);

// Ariane 5: 藍白法式火箭
fs.writeFileSync(path.join(OUT, 'rocket_ariane.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#0a0a1a"/>
    </linearGradient>
    <linearGradient id="ar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1a3a8a"/><stop offset="50%" stop-color="#4488DD"/><stop offset="100%" stop-color="#1a3a8a"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 整流罩（白色錐）-->
  <path d="M 108 50 Q 120 30 132 50 L 132 90 L 108 90 Z" fill="#F0F0F0"/>
  <!-- 主芯藍白 -->
  <rect x="108" y="90" width="24" height="120" fill="url(#ar)"/>
  <rect x="108" y="140" width="24" height="50" fill="#F0F0F0"/>
  <!-- 兩側助推器 -->
  <rect x="78" y="100" width="20" height="105" fill="url(#ar)"/>
  <path d="M 78 100 Q 88 85 98 100 Z" fill="#1a3a8a"/>
  <rect x="142" y="100" width="20" height="105" fill="url(#ar)"/>
  <path d="M 142 100 Q 152 85 162 100 Z" fill="#1a3a8a"/>
  <!-- 文字（假 ESA） -->
  <text x="120" y="125" text-anchor="middle" fill="#FFFFFF" font-size="8" font-weight="bold">esa</text>
  <!-- 引擎 -->
  <rect x="113" y="210" width="14" height="12" fill="#333"/>
  <!-- 火焰 -->
  <ellipse cx="120" cy="240" rx="22" ry="25" fill="#FF8800" opacity="0.7"/>
  <ellipse cx="120" cy="245" rx="13" ry="18" fill="#FFD700"/>
  <text x="120" y="295" text-anchor="middle" fill="#4488DD" font-size="16" font-weight="bold" font-family="sans-serif" letter-spacing="1">ARIANE 5</text>
</svg>`);

// Electron: 小型黑色火箭
fs.writeFileSync(path.join(OUT, 'rocket_electron.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#0a0a1a"/>
    </linearGradient>
    <linearGradient id="el" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#222"/><stop offset="50%" stop-color="#555"/><stop offset="100%" stop-color="#222"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 細長整流罩 -->
  <path d="M 113 70 Q 120 55 127 70 L 127 95 L 113 95 Z" fill="url(#el)"/>
  <!-- 細長本體 -->
  <rect x="113" y="95" width="14" height="105" fill="url(#el)"/>
  <!-- Rutherford 引擎環 -->
  <circle cx="120" cy="115" r="8" fill="#666" stroke="#999"/>
  <circle cx="120" cy="145" r="8" fill="#666" stroke="#999"/>
  <circle cx="120" cy="175" r="8" fill="#666" stroke="#999"/>
  <!-- 引擎 -->
  <rect x="115" y="200" width="10" height="10" fill="#111"/>
  <!-- 火焰（電致） -->
  <ellipse cx="120" cy="225" rx="12" ry="20" fill="#88CCFF" opacity="0.7"/>
  <ellipse cx="120" cy="230" rx="6" ry="14" fill="#FFFFFF"/>
  <text x="120" y="295" text-anchor="middle" fill="#88CCFF" font-size="16" font-weight="bold" font-family="sans-serif" letter-spacing="1">ELECTRON</text>
</svg>`);

// ============ 公司類 (8 個) ============
// SpaceX: 太空船剪影（細長龍膠囊+翼）
fs.writeFileSync(path.join(OUT, 'spacex.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#0a0a1a"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 太空船細長主體 -->
  <path d="M 110 60 L 110 200 L 100 220 L 100 230 L 140 230 L 140 220 L 130 200 L 130 60 Q 120 50 110 60 Z" fill="#E0E0E0"/>
  <!-- 翼 -->
  <polygon points="110,140 80,160 110,165" fill="#E0E0E0"/>
  <polygon points="130,140 160,160 130,165" fill="#E0E0E0"/>
  <!-- 窗 -->
  <circle cx="120" cy="80" r="4" fill="#1a3a6a"/>
  <circle cx="120" cy="100" r="4" fill="#1a3a6a"/>
  <!-- 火焰 -->
  <ellipse cx="120" cy="245" rx="15" ry="20" fill="#FF8800" opacity="0.8"/>
  <ellipse cx="120" cy="248" rx="8" ry="14" fill="#FFD700"/>
  <text x="120" y="295" text-anchor="middle" fill="#FFFFFF" font-size="20" font-weight="bold" font-family="sans-serif" letter-spacing="2">SPACEX</text>
</svg>`);

// Tesla: 汽車輪廓
fs.writeFileSync(path.join(OUT, 'tesla.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#0a0a1a"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 跑車輪廓（Model S 風格）-->
  <path d="M 50 200 Q 50 180 70 170 L 100 170 L 110 145 Q 115 140 125 140 L 165 140 Q 175 140 180 145 L 195 170 L 220 180 Q 230 195 230 210 L 230 215 L 50 215 Z" fill="#C8323C"/>
  <!-- 車窗 -->
  <path d="M 115 145 L 175 145 L 188 170 L 105 170 Z" fill="#1a2a4a" opacity="0.8"/>
  <!-- 輪子 -->
  <circle cx="85" cy="220" r="15" fill="#222"/>
  <circle cx="85" cy="220" r="8" fill="#666"/>
  <circle cx="195" cy="220" r="15" fill="#222"/>
  <circle cx="195" cy="220" r="8" fill="#666"/>
  <!-- 地面 -->
  <line x1="30" y1="235" x2="250" y2="235" stroke="#555" stroke-width="2"/>
  <text x="120" y="280" text-anchor="middle" fill="#FFFFFF" font-size="22" font-weight="bold" font-family="sans-serif" letter-spacing="2">TESLA</text>
</svg>`);

// xAI: 抽象大腦圖示
fs.writeFileSync(path.join(OUT, 'xai.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#0a0a1a"/>
    </linearGradient>
    <radialGradient id="xai-g" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#4488FF"/><stop offset="100%" stop-color="#1a2a5a"/>
    </radialGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 大腦輪廓 -->
  <path d="M 120 80 Q 70 80 70 130 Q 60 150 70 175 Q 70 210 120 215 Q 170 210 170 175 Q 180 150 170 130 Q 170 80 120 80 Z" fill="url(#xai-g)"/>
  <!-- 神經突觸線 -->
  <circle cx="100" cy="120" r="4" fill="#88CCFF"/>
  <circle cx="140" cy="120" r="4" fill="#88CCFF"/>
  <circle cx="90" cy="155" r="4" fill="#88CCFF"/>
  <circle cx="150" cy="155" r="4" fill="#88CCFF"/>
  <circle cx="100" cy="190" r="4" fill="#88CCFF"/>
  <circle cx="140" cy="190" r="4" fill="#88CCFF"/>
  <line x1="100" y1="120" x2="140" y2="120" stroke="#88CCFF" stroke-width="1.5" opacity="0.7"/>
  <line x1="100" y1="120" x2="90" y2="155" stroke="#88CCFF" stroke-width="1.5" opacity="0.7"/>
  <line x1="140" y1="120" x2="150" y2="155" stroke="#88CCFF" stroke-width="1.5" opacity="0.7"/>
  <line x1="90" y1="155" x2="100" y2="190" stroke="#88CCFF" stroke-width="1.5" opacity="0.7"/>
  <line x1="150" y1="155" x2="140" y2="190" stroke="#88CCFF" stroke-width="1.5" opacity="0.7"/>
  <line x1="100" y1="190" x2="140" y2="190" stroke="#88CCFF" stroke-width="1.5" opacity="0.7"/>
  <line x1="90" y1="155" x2="150" y2="155" stroke="#88CCFF" stroke-width="1.5" opacity="0.7"/>
  <text x="120" y="295" text-anchor="middle" fill="#88CCFF" font-size="22" font-weight="bold" font-family="sans-serif" letter-spacing="3">xAI</text>
</svg>`);

// Neuralink: 晶片+大腦
fs.writeFileSync(path.join(OUT, 'neuralink.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#0a0a1a"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 頭部輪廓 -->
  <path d="M 120 70 Q 70 70 70 140 Q 65 200 120 220 Q 175 200 170 140 Q 170 70 120 70 Z" fill="#2a3a5a" opacity="0.5"/>
  <!-- 晶片（Neuralink 風格，圓形）-->
  <circle cx="120" cy="135" r="22" fill="#1a1a1a" stroke="#88CCFF" stroke-width="2"/>
  <circle cx="120" cy="135" r="14" fill="#88CCFF" opacity="0.3"/>
  <text x="120" y="140" text-anchor="middle" fill="#88CCFF" font-size="11" font-weight="bold">N</text>
  <!-- 線從晶片向外延伸（神經介面）-->
  <line x1="100" y1="120" x2="80" y2="105" stroke="#88CCFF" stroke-width="1.5" opacity="0.7"/>
  <line x1="100" y1="135" x2="75" y2="135" stroke="#88CCFF" stroke-width="1.5" opacity="0.7"/>
  <line x1="100" y1="150" x2="80" y2="170" stroke="#88CCFF" stroke-width="1.5" opacity="0.7"/>
  <line x1="140" y1="120" x2="160" y2="105" stroke="#88CCFF" stroke-width="1.5" opacity="0.7"/>
  <line x1="140" y1="135" x2="165" y2="135" stroke="#88CCFF" stroke-width="1.5" opacity="0.7"/>
  <line x1="140" y1="150" x2="160" y2="170" stroke="#88CCFF" stroke-width="1.5" opacity="0.7"/>
  <line x1="120" y1="113" x2="120" y2="95" stroke="#88CCFF" stroke-width="1.5" opacity="0.7"/>
  <line x1="120" y1="157" x2="120" y2="180" stroke="#88CCFF" stroke-width="1.5" opacity="0.7"/>
  <!-- 線末端小點 -->
  <circle cx="80" cy="105" r="2" fill="#88CCFF"/>
  <circle cx="75" cy="135" r="2" fill="#88CCFF"/>
  <circle cx="80" cy="170" r="2" fill="#88CCFF"/>
  <circle cx="160" cy="105" r="2" fill="#88CCFF"/>
  <circle cx="165" cy="135" r="2" fill="#88CCFF"/>
  <circle cx="160" cy="170" r="2" fill="#88CCFF"/>
  <circle cx="120" cy="95" r="2" fill="#88CCFF"/>
  <circle cx="120" cy="180" r="2" fill="#88CCFF"/>
  <text x="120" y="295" text-anchor="middle" fill="#88CCFF" font-size="16" font-weight="bold" font-family="sans-serif" letter-spacing="1">NEURALINK</text>
</svg>`);

// SPCX: 太空指數（火箭+上升箭頭）
fs.writeFileSync(path.join(OUT, 'spcx.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#0a0a1a"/>
    </linearGradient>
    <linearGradient id="sp-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFD700"/><stop offset="100%" stop-color="#AA7700"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 股票走勢圖（上升）-->
  <polyline points="20,220 50,200 80,210 110,170 140,180 170,130 200,140 220,90" fill="none" stroke="#FFD700" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
  <!-- 上升箭頭 -->
  <polygon points="220,90 210,85 215,100" fill="#FFD700"/>
  <polygon points="220,90 230,85 225,100" fill="#FFD700"/>
  <!-- 走勢節點圓 -->
  <circle cx="50" cy="200" r="3" fill="#FFD700"/>
  <circle cx="110" cy="170" r="3" fill="#FFD700"/>
  <circle cx="170" cy="130" r="3" fill="#FFD700"/>
  <circle cx="220" cy="90" r="4" fill="#FFFFFF" stroke="#FFD700" stroke-width="2"/>
  <!-- $ 符號 -->
  <text x="60" y="120" text-anchor="middle" fill="#FFD700" font-size="48" font-weight="bold" font-family="sans-serif">$</text>
  <text x="120" y="295" text-anchor="middle" fill="#FFD700" font-size="20" font-weight="bold" font-family="sans-serif" letter-spacing="2">SPCX</text>
</svg>`);

// NASA: 圓形 logo 風格（肉丸+軌道）
fs.writeFileSync(path.join(OUT, 'nasa.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0a3a"/><stop offset="100%" stop-color="#000018"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 背景星 -->
  <circle cx="40" cy="50" r="1.5" fill="#FFFFFF"/>
  <circle cx="200" cy="40" r="1" fill="#FFFFFF"/>
  <circle cx="30" cy="180" r="1" fill="#FFFFFF"/>
  <circle cx="210" cy="190" r="1.5" fill="#FFFFFF"/>
  <!-- 軌道（傾斜）-->
  <ellipse cx="120" cy="135" rx="80" ry="22" fill="none" stroke="#FC3D21" stroke-width="3" transform="rotate(-20 120 135)"/>
  <!-- 行星（藍色肉丸）-->
  <circle cx="120" cy="135" r="50" fill="#1a4488"/>
  <circle cx="105" cy="120" r="20" fill="#3a78c8" opacity="0.6"/>
  <circle cx="135" cy="150" r="12" fill="#3a78c8" opacity="0.5"/>
  <!-- 文字 NASA（紅色）-->
  <text x="120" y="220" text-anchor="middle" fill="#FC3D21" font-size="36" font-weight="bold" font-family="sans-serif" letter-spacing="4">NASA</text>
  <text x="120" y="240" text-anchor="middle" fill="#FFFFFF" font-size="9" font-family="sans-serif" letter-spacing="2">NATIONAL AERONAUTICS AND</text>
  <text x="120" y="252" text-anchor="middle" fill="#FFFFFF" font-size="9" font-family="sans-serif" letter-spacing="2">SPACE ADMINISTRATION</text>
  <text x="120" y="295" text-anchor="middle" fill="#FFFFFF" font-size="14" font-weight="bold" font-family="sans-serif">EST. 1958</text>
</svg>`);

// ESA: 歐洲旗幟風格
fs.writeFileSync(path.join(OUT, 'esa.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a1a3a"/><stop offset="100%" stop-color="#000010"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- ESA 文字（藍色大寫） -->
  <text x="120" y="140" text-anchor="middle" fill="#003366" font-size="64" font-weight="bold" font-family="sans-serif" letter-spacing="2">esa</text>
  <!-- 文字外框（白）-->
  <text x="120" y="140" text-anchor="middle" fill="none" stroke="#FFFFFF" stroke-width="1" font-size="64" font-weight="bold" font-family="sans-serif" letter-spacing="2">esa</text>
  <!-- 環繞文字弧形（簡化為直線）-->
  <text x="120" y="170" text-anchor="middle" fill="#FFFFFF" font-size="8" letter-spacing="2">EUROPEAN SPACE AGENCY</text>
  <!-- 軌道線 -->
  <ellipse cx="120" cy="120" rx="90" ry="10" fill="none" stroke="#4488DD" stroke-width="1.5" opacity="0.6" transform="rotate(-15 120 120)"/>
  <!-- 衛星 -->
  <circle cx="60" cy="100" r="4" fill="#88CCFF"/>
  <rect x="56" y="98" width="8" height="4" fill="#88CCFF"/>
  <!-- 星星 -->
  <circle cx="30" cy="50" r="1" fill="#FFFFFF"/>
  <circle cx="210" cy="60" r="1.5" fill="#FFFFFF"/>
  <circle cx="200" cy="200" r="1" fill="#FFFFFF"/>
  <text x="120" y="295" text-anchor="middle" fill="#003366" font-size="14" font-weight="bold" font-family="sans-serif" letter-spacing="2">ESA</text>
</svg>`);

// CNSA: 中國國旗配色+火箭
fs.writeFileSync(path.join(OUT, 'cnsa.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3a0000"/><stop offset="100%" stop-color="#1a0000"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 大五角星 -->
  <polygon points="60,55 65,75 86,75 69,87 75,107 60,95 45,107 51,87 34,75 55,75" fill="#FFD700"/>
  <!-- 小五角星 1 -->
  <polygon points="100,40 103,52 115,52 105,60 109,72 100,65 91,72 95,60 85,52 97,52" fill="#FFD700" transform="scale(0.5) translate(120 50)"/>
  <!-- 火箭（長征系列） -->
  <path d="M 110 130 Q 120 115 130 130 L 130 195 L 110 195 Z" fill="#FFFFFF"/>
  <rect x="110" y="195" width="20" height="20" fill="#C8323C"/>
  <rect x="113" y="215" width="14" height="10" fill="#222"/>
  <!-- 兩側助推器 -->
  <rect x="98" y="150" width="8" height="40" fill="#FFFFFF"/>
  <rect x="134" y="150" width="8" height="40" fill="#FFFFFF"/>
  <!-- 火焰 -->
  <ellipse cx="120" cy="235" rx="14" ry="15" fill="#FF8800"/>
  <ellipse cx="120" cy="240" rx="7" ry="10" fill="#FFD700"/>
  <!-- CNSA 文字 -->
  <text x="120" y="180" text-anchor="middle" fill="#C8323C" font-size="11" font-weight="bold" font-family="sans-serif">CNSA</text>
  <text x="120" y="295" text-anchor="middle" fill="#FFD700" font-size="20" font-weight="bold" font-family="sans-serif" letter-spacing="3">CNSA</text>
</svg>`);

// ============ 太空站類 (4 個) ============
// ISS: 太陽能板+模組
fs.writeFileSync(path.join(OUT, 'iss.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a1a3a"/><stop offset="100%" stop-color="#000010"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 4 個太陽能板（左2右2）-->
  <rect x="20" y="80" width="50" height="14" fill="#1a2a6a" stroke="#4488FF"/>
  <line x1="20" y1="87" x2="70" y2="87" stroke="#4488FF"/>
  <rect x="20" y="180" width="50" height="14" fill="#1a2a6a" stroke="#4488FF"/>
  <line x1="20" y1="187" x2="70" y2="187" stroke="#4488FF"/>
  <rect x="170" y="80" width="50" height="14" fill="#1a2a6a" stroke="#4488FF"/>
  <line x1="170" y1="87" x2="220" y2="87" stroke="#4488FF"/>
  <rect x="170" y="180" width="50" height="14" fill="#1a2a6a" stroke="#4488FF"/>
  <line x1="170" y1="187" x2="220" y2="187" stroke="#4488FF"/>
  <!-- 中央桁架（橫向）-->
  <line x1="70" y1="137" x2="170" y2="137" stroke="#888" stroke-width="3"/>
  <line x1="70" y1="95" x2="170" y2="95" stroke="#888" stroke-width="2"/>
  <line x1="70" y1="180" x2="170" y2="180" stroke="#888" stroke-width="2"/>
  <!-- 中央模組（多節圓筒）-->
  <rect x="100" y="125" width="40" height="20" fill="#E0E0E0" stroke="#666"/>
  <rect x="90" y="130" width="60" height="10" fill="#E0E0E0" stroke="#666"/>
  <circle cx="100" cy="135" r="3" fill="#4488FF"/>
  <circle cx="140" cy="135" r="3" fill="#4488FF"/>
  <!-- 地球弧線（背景底部）-->
  <ellipse cx="120" cy="280" rx="200" ry="40" fill="#1a4488" opacity="0.5"/>
  <ellipse cx="60" cy="270" rx="20" ry="6" fill="#3a8b3a" opacity="0.6"/>
  <text x="120" y="295" text-anchor="middle" fill="#FFFFFF" font-size="20" font-weight="bold" font-family="sans-serif" letter-spacing="2">ISS</text>
</svg>`);

// Tiangong: T 字型雙太陽能板
fs.writeFileSync(path.join(OUT, 'tiangong.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a1a3a"/><stop offset="100%" stop-color="#000010"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 太陽能板（單一橫向大板）-->
  <rect x="30" y="125" width="180" height="22" fill="#1a2a6a" stroke="#C8323C" stroke-width="1"/>
  <line x1="60" y1="125" x2="60" y2="147" stroke="#C8323C"/>
  <line x1="90" y1="125" x2="90" y2="147" stroke="#C8323C"/>
  <line x1="120" y1="125" x2="120" y2="147" stroke="#C8323C"/>
  <line x1="150" y1="125" x2="150" y2="147" stroke="#C8323C"/>
  <line x1="180" y1="125" x2="180" y2="147" stroke="#C8323C"/>
  <line x1="30" y1="136" x2="210" y2="136" stroke="#C8323C"/>
  <!-- 中央模組 -->
  <rect x="100" y="80" width="40" height="40" fill="#E0E0E0" stroke="#666"/>
  <rect x="90" y="90" width="60" height="20" fill="#E0E0E0" stroke="#666"/>
  <!-- 對接端口 -->
  <circle cx="120" cy="100" r="3" fill="#1a3a6a"/>
  <line x1="120" y1="147" x2="120" y2="160" stroke="#666" stroke-width="3"/>
  <!-- 地球弧 -->
  <ellipse cx="120" cy="290" rx="200" ry="35" fill="#1a4488" opacity="0.4"/>
  <text x="120" y="295" text-anchor="middle" fill="#C8323C" font-size="18" font-weight="bold" font-family="sans-serif" letter-spacing="2">天宮</text>
</svg>`);

// MIR: 核心模組+多對接艙
fs.writeFileSync(path.join(OUT, 'mir.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a1a3a"/><stop offset="100%" stop-color="#000010"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 6 個模組 + 太陽能板 -->
  <rect x="60" y="130" width="120" height="20" fill="#E0E0E0" stroke="#666"/>
  <line x1="100" y1="130" x2="100" y2="150" stroke="#666" stroke-width="2"/>
  <line x1="140" y1="130" x2="140" y2="150" stroke="#666" stroke-width="2"/>
  <!-- 4 個對接艙（上下左右）-->
  <rect x="115" y="90" width="10" height="40" fill="#CCC" stroke="#666"/>
  <rect x="115" y="150" width="10" height="40" fill="#CCC" stroke="#666"/>
  <rect x="40" y="135" width="20" height="10" fill="#CCC" stroke="#666"/>
  <rect x="180" y="135" width="20" height="10" fill="#CCC" stroke="#666"/>
  <!-- 太陽能板（兩端各 2 片）-->
  <rect x="10" y="110" width="30" height="60" fill="#1a2a6a" stroke="#666"/>
  <line x1="25" y1="110" x2="25" y2="170" stroke="#666"/>
  <line x1="10" y1="140" x2="40" y2="140" stroke="#666"/>
  <rect x="200" y="110" width="30" height="60" fill="#1a2a6a" stroke="#666"/>
  <line x1="215" y1="110" x2="215" y2="170" stroke="#666"/>
  <line x1="200" y1="140" x2="230" y2="140" stroke="#666"/>
  <!-- 地球弧 -->
  <ellipse cx="120" cy="280" rx="200" ry="40" fill="#1a4488" opacity="0.4"/>
  <text x="120" y="295" text-anchor="middle" fill="#FFFFFF" font-size="18" font-weight="bold" font-family="sans-serif" letter-spacing="2">MIR</text>
</svg>`);

// Gateway: 月球門戶（L 形 + 雙太陽能板）
fs.writeFileSync(path.join(OUT, 'gateway.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1a3a"/><stop offset="100%" stop-color="#000018"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 月球（背景） -->
  <circle cx="50" cy="220" r="30" fill="#999"/>
  <circle cx="42" cy="215" r="3" fill="#666"/>
  <circle cx="55" cy="225" r="2" fill="#666"/>
  <circle cx="60" cy="210" r="1.5" fill="#666"/>
  <circle cx="40" cy="230" r="2" fill="#666"/>
  <!-- 太陽能板（巨型單一對）-->
  <rect x="20" y="100" width="50" height="80" fill="#1a2a6a" stroke="#4488FF"/>
  <line x1="45" y1="100" x2="45" y2="180" stroke="#4488FF"/>
  <line x1="20" y1="125" x2="70" y2="125" stroke="#4488FF"/>
  <line x1="20" y1="150" x2="70" y2="150" stroke="#4488FF"/>
  <rect x="170" y="100" width="50" height="80" fill="#1a2a6a" stroke="#4488FF"/>
  <line x1="195" y1="100" x2="195" y2="180" stroke="#4488FF"/>
  <line x1="170" y1="125" x2="220" y2="125" stroke="#4488FF"/>
  <line x1="170" y1="150" x2="220" y2="150" stroke="#4488FF"/>
  <!-- 中央 HALO 棲息艙 -->
  <rect x="100" y="130" width="40" height="25" fill="#E0E0E0" stroke="#666"/>
  <!-- PPE 動力元件 -->
  <rect x="95" y="100" width="50" height="20" fill="#FFC832" stroke="#666"/>
  <line x1="95" y1="110" x2="145" y2="110" stroke="#666"/>
  <!-- 國際介面 -->
  <rect x="115" y="155" width="10" height="15" fill="#CCC" stroke="#666"/>
  <text x="120" y="295" text-anchor="middle" fill="#FFC832" font-size="14" font-weight="bold" font-family="sans-serif" letter-spacing="1">GATEWAY</text>
</svg>`);

// ============ 探測器類 (6 個) ============
// Voyager: 拋物面天線+三腳架
function probeSvg(label, dishColor, bodyColor, accent, ringExtra = '') {
    return `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0a2a"/><stop offset="100%" stop-color="#000010"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 拋物面天線（圓形 + 內部格柵） -->
  <circle cx="120" cy="115" r="55" fill="${dishColor}"/>
  <circle cx="120" cy="115" r="55" fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity="0.6"/>
  <line x1="65" y1="115" x2="175" y2="115" stroke="#FFFFFF" stroke-width="0.5" opacity="0.5"/>
  <line x1="120" y1="60" x2="120" y2="170" stroke="#FFFFFF" stroke-width="0.5" opacity="0.5"/>
  <line x1="80" y1="78" x2="160" y2="152" stroke="#FFFFFF" stroke-width="0.5" opacity="0.4"/>
  <line x1="160" y1="78" x2="80" y2="152" stroke="#FFFFFF" stroke-width="0.5" opacity="0.4"/>
  <circle cx="120" cy="115" r="6" fill="#FFFFFF" opacity="0.7"/>
  <!-- 支撐桿（天線到主體） -->
  <line x1="120" y1="170" x2="120" y2="190" stroke="${bodyColor}" stroke-width="3"/>
  <!-- 主體（10 邊形盒） -->
  <polygon points="100,190 140,190 145,220 95,220" fill="${bodyColor}"/>
  <rect x="105" y="200" width="30" height="6" fill="#FFFFFF" opacity="0.3"/>
  <!-- 三腳 RTG 放射性同位素發電機（3 根桿 + 發電塊） -->
  <line x1="100" y1="220" x2="70" y2="245" stroke="${bodyColor}" stroke-width="2"/>
  <line x1="140" y1="220" x2="170" y2="245" stroke="${bodyColor}" stroke-width="2"/>
  <line x1="120" y1="220" x2="120" y2="250" stroke="${bodyColor}" stroke-width="2"/>
  <rect x="60" y="240" width="20" height="14" fill="#1a1a1a" stroke="${accent}"/>
  <rect x="160" y="240" width="20" height="14" fill="#1a1a1a" stroke="${accent}"/>
  <rect x="110" y="248" width="20" height="14" fill="#1a1a1a" stroke="${accent}"/>
  <!-- 背景星 -->
  <circle cx="30" cy="40" r="1" fill="#FFFFFF"/>
  <circle cx="210" cy="50" r="1.5" fill="#FFFFFF"/>
  <circle cx="40" cy="170" r="1" fill="#FFFFFF"/>
  <circle cx="200" cy="160" r="1" fill="#FFFFFF"/>
  ${ringExtra}
  <text x="120" y="295" text-anchor="middle" fill="#FFFFFF" font-size="16" font-weight="bold" font-family="sans-serif" letter-spacing="1">${label}</text>
</svg>`;
}

fs.writeFileSync(path.join(OUT, 'voyager1.svg'), probeSvg('VOYAGER 1', '#C0C0C0', '#A0A0A0', '#FFD700'));
fs.writeFileSync(path.join(OUT, 'voyager2.svg'), probeSvg('VOYAGER 2', '#C0C0C0', '#A0A0A0', '#FFD700'));

// Cassini: 高增益天線+本體
fs.writeFileSync(path.join(OUT, 'cassini.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0a2a"/><stop offset="100%" stop-color="#000010"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 高增益天線（白色大圓）-->
  <ellipse cx="120" cy="80" rx="70" ry="22" fill="#F0F0F0" stroke="#888"/>
  <ellipse cx="120" cy="80" rx="60" ry="16" fill="none" stroke="#888"/>
  <!-- 支柱 -->
  <line x1="120" y1="100" x2="120" y2="115" stroke="#888" stroke-width="2"/>
  <!-- 主體（梯形）-->
  <polygon points="95,115 145,115 155,170 85,170" fill="#E0C870" stroke="#666"/>
  <!-- 儀器視窗 -->
  <rect x="100" y="125" width="40" height="3" fill="#1a1a1a"/>
  <rect x="100" y="135" width="40" height="3" fill="#1a1a1a"/>
  <rect x="100" y="145" width="40" height="3" fill="#1a1a1a"/>
  <!-- 兩側儀器臂 -->
  <line x1="95" y1="140" x2="70" y2="160" stroke="#888" stroke-width="2"/>
  <line x1="145" y1="140" x2="170" y2="160" stroke="#888" stroke-width="2"/>
  <circle cx="70" cy="160" r="3" fill="#FF8800"/>
  <circle cx="170" cy="160" r="3" fill="#FF8800"/>
  <!-- RTG（同位素）3 根支柱 + 棒 -->
  <line x1="95" y1="170" x2="80" y2="210" stroke="#888" stroke-width="2"/>
  <line x1="120" y1="170" x2="120" y2="220" stroke="#888" stroke-width="2"/>
  <line x1="145" y1="170" x2="160" y2="210" stroke="#888" stroke-width="2"/>
  <rect x="76" y="210" width="8" height="20" fill="#1a1a1a"/>
  <rect x="116" y="220" width="8" height="20" fill="#1a1a1a"/>
  <rect x="156" y="210" width="8" height="20" fill="#1a1a1a"/>
  <!-- 土星（背景） -->
  <circle cx="195" cy="100" r="14" fill="#F4D58A"/>
  <ellipse cx="195" cy="100" rx="22" ry="4" fill="none" stroke="#C4A05A" stroke-width="1.5"/>
  <text x="120" y="295" text-anchor="middle" fill="#F0F0F0" font-size="18" font-weight="bold" font-family="sans-serif" letter-spacing="2">CASSINI</text>
</svg>`);

// New Horizons: 圓盤天線
fs.writeFileSync(path.join(OUT, 'horizons.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0a2a"/><stop offset="100%" stop-color="#000010"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 大型拋物面天線 -->
  <circle cx="120" cy="110" r="65" fill="#F0F0F0" stroke="#666"/>
  <circle cx="120" cy="110" r="65" fill="none" stroke="#888" stroke-width="1"/>
  <line x1="55" y1="110" x2="185" y2="110" stroke="#888" stroke-width="0.5" opacity="0.5"/>
  <line x1="120" y1="45" x2="120" y2="175" stroke="#888" stroke-width="0.5" opacity="0.5"/>
  <!-- 三腳支撐 -->
  <line x1="100" y1="160" x2="80" y2="200" stroke="#888" stroke-width="2"/>
  <line x1="140" y1="160" x2="160" y2="200" stroke="#888" stroke-width="2"/>
  <line x1="120" y1="165" x2="120" y2="200" stroke="#888" stroke-width="2"/>
  <!-- 主體（三稜柱，黑色） -->
  <polygon points="100,200 140,200 140,230 100,230" fill="#1a1a1a"/>
  <!-- 儀器 -->
  <rect x="105" y="210" width="30" height="4" fill="#FFD700"/>
  <rect x="105" y="218" width="30" height="4" fill="#FF8800"/>
  <!-- 冥王星（背景） -->
  <circle cx="200" cy="80" r="12" fill="#C0A080"/>
  <ellipse cx="200" cy="80" rx="18" ry="3" fill="none" stroke="#888" stroke-width="1"/>
  <text x="120" y="295" text-anchor="middle" fill="#FFD700" font-size="14" font-weight="bold" font-family="sans-serif" letter-spacing="1">NEW HORIZONS</text>
</svg>`);

// JWST: 金色六角鏡陣+遮陽板
fs.writeFileSync(path.join(OUT, 'jwst.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0a2a"/><stop offset="100%" stop-color="#000010"/>
    </linearGradient>
    <linearGradient id="jw" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFD700"/><stop offset="100%" stop-color="#AA7700"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 18 個六角鏡（簡化為蜂巢） -->
  ${(() => {
    let s = '';
    const cx = 120, cy = 120, r = 18, gap = 4;
    const positions = [
        [0, -36], [0, 0], [0, 36],
        [-30, -18], [-30, 18],
        [30, -18], [30, 18]
    ];
    positions.forEach(([dx, dy]) => {
        const x = cx + dx * 1.3;
        const y = cy + dy;
        s += `<polygon points="${x-r},${y} ${x-r/2},${y-r*0.87} ${x+r/2},${y-r*0.87} ${x+r},${y} ${x+r/2},${y+r*0.87} ${x-r/2},${y+r*0.87}" fill="url(#jw)" stroke="#5A4400" stroke-width="1"/>\n`;
    });
    return s;
  })()}
  <!-- 遮陽板（5 層菱形）-->
  <polygon points="120,180 100,250 140,250" fill="#3A2A4A" opacity="0.7"/>
  <polygon points="120,190 110,245 130,245" fill="#4A3A5A" opacity="0.7"/>
  <polygon points="120,200 115,240 125,240" fill="#5A4A6A" opacity="0.7"/>
  <!-- 連接臂 -->
  <line x1="120" y1="155" x2="120" y2="195" stroke="#888" stroke-width="2"/>
  <text x="120" y="295" text-anchor="middle" fill="#FFD700" font-size="14" font-weight="bold" font-family="sans-serif" letter-spacing="1">JAMES WEBB</text>
</svg>`);

// Hubble: 圓筒+太陽能板
fs.writeFileSync(path.join(OUT, 'hubble.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0a2a"/><stop offset="100%" stop-color="#000010"/>
    </linearGradient>
    <linearGradient id="hb" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#888"/><stop offset="50%" stop-color="#E8E8E8"/><stop offset="100%" stop-color="#888"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 太陽能板 -->
  <rect x="20" y="100" width="50" height="50" fill="#1a2a6a" stroke="#666"/>
  <line x1="45" y1="100" x2="45" y2="150" stroke="#666"/>
  <line x1="20" y1="125" x2="70" y2="125" stroke="#666"/>
  <rect x="170" y="100" width="50" height="50" fill="#1a2a6a" stroke="#666"/>
  <line x1="195" y1="100" x2="195" y2="150" stroke="#666"/>
  <line x1="170" y1="125" x2="220" y2="125" stroke="#666"/>
  <!-- 主鏡筒（兩段）-->
  <rect x="100" y="80" width="40" height="20" fill="url(#hb)"/>
  <rect x="95" y="100" width="50" height="60" fill="url(#hb)"/>
  <rect x="100" y="160" width="40" height="30" fill="url(#hb)"/>
  <!-- 光譜儀窗口 -->
  <rect x="105" y="120" width="30" height="4" fill="#1a3a6a"/>
  <rect x="105" y="130" width="30" height="4" fill="#1a3a6a"/>
  <!-- 太陽能板支撐 -->
  <line x1="70" y1="125" x2="100" y2="100" stroke="#888" stroke-width="2"/>
  <line x1="170" y1="125" x2="140" y2="100" stroke="#888" stroke-width="2"/>
  <!-- 底座 -->
  <rect x="110" y="190" width="20" height="15" fill="#666"/>
  <text x="120" y="295" text-anchor="middle" fill="#E8E8E8" font-size="16" font-weight="bold" font-family="sans-serif" letter-spacing="1">HUBBLE</text>
</svg>`);

// ============ 星系類 (3 個) ============
// Black hole: 黑色圓 + 吸積盤
fs.writeFileSync(path.join(OUT, 'blackhole.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a0a2a"/><stop offset="100%" stop-color="#000000"/>
    </linearGradient>
    <radialGradient id="disc">
      <stop offset="0%" stop-color="#FFA040" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#FF6020" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#FFA040" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 背景星 -->
  <circle cx="40" cy="50" r="1" fill="#FFFFFF"/>
  <circle cx="200" cy="40" r="1" fill="#FFFFFF"/>
  <circle cx="30" cy="220" r="1.5" fill="#FFFFFF"/>
  <circle cx="210" cy="200" r="1" fill="#FFFFFF"/>
  <circle cx="50" cy="100" r="0.5" fill="#FFFFFF"/>
  <circle cx="190" cy="100" r="0.5" fill="#FFFFFF"/>
  <!-- 吸積盤（外層傾斜橢圓）-->
  <ellipse cx="120" cy="150" rx="90" ry="30" fill="url(#disc)" transform="rotate(-15 120 150)"/>
  <ellipse cx="120" cy="150" rx="70" ry="22" fill="url(#disc)" transform="rotate(-15 120 150)"/>
  <!-- 光子球（亮環）-->
  <circle cx="120" cy="150" r="35" fill="none" stroke="#FFD700" stroke-width="2" opacity="0.8"/>
  <!-- 黑洞（黑色圓）-->
  <circle cx="120" cy="150" r="25" fill="#000000"/>
  <!-- 重力透鏡效應（背景星被彎曲成弧）-->
  <path d="M 60 80 Q 100 150 60 220" fill="none" stroke="#FFFFFF" stroke-width="0.5" opacity="0.3"/>
  <path d="M 180 80 Q 140 150 180 220" fill="none" stroke="#FFFFFF" stroke-width="0.5" opacity="0.3"/>
  <text x="120" y="295" text-anchor="middle" fill="#FFA040" font-size="18" font-weight="bold" font-family="sans-serif" letter-spacing="2">BLACK HOLE</text>
</svg>`);

// Andromeda: 傾斜盤狀星系
fs.writeFileSync(path.join(OUT, 'galaxy_and.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0a2a"/><stop offset="100%" stop-color="#000010"/>
    </linearGradient>
    <radialGradient id="ag" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9"/>
      <stop offset="30%" stop-color="#A8C8E8" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#1a3a6a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 旋臂（4 條）-->
  <ellipse cx="120" cy="135" rx="105" ry="40" fill="url(#ag)" transform="rotate(30 120 135)"/>
  <ellipse cx="120" cy="135" rx="90" ry="32" fill="url(#ag)" transform="rotate(30 120 135)"/>
  <!-- 核心 -->
  <circle cx="120" cy="135" r="14" fill="#FFE8A8" opacity="0.95"/>
  <circle cx="120" cy="135" r="8" fill="#FFFFFF" opacity="0.8"/>
  <!-- 散落亮星 -->
  <circle cx="60" cy="60" r="1.5" fill="#FFFFFF"/>
  <circle cx="180" cy="50" r="1" fill="#FFFFFF"/>
  <circle cx="200" cy="200" r="1" fill="#FFFFFF"/>
  <circle cx="40" cy="220" r="1" fill="#FFFFFF"/>
  <text x="120" y="295" text-anchor="middle" fill="#A8C8E8" font-size="16" font-weight="bold" font-family="sans-serif" letter-spacing="1">ANDROMEDA</text>
</svg>`);

// Nebula: 蟹狀星雲（多色雲氣）
fs.writeFileSync(path.join(OUT, 'nebula.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0a2a"/><stop offset="100%" stop-color="#000010"/>
    </linearGradient>
    <radialGradient id="n1" cx="40%" cy="40%">
      <stop offset="0%" stop-color="#FF60A0" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#FF60A0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="n2" cx="60%" cy="60%">
      <stop offset="0%" stop-color="#60A0FF" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#60A0FF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bg)"/>
  <!-- 多色雲氣 -->
  <ellipse cx="120" cy="135" rx="90" ry="80" fill="url(#n1)"/>
  <ellipse cx="100" cy="120" rx="50" ry="40" fill="url(#n2)"/>
  <ellipse cx="140" cy="150" rx="40" ry="30" fill="url(#n1)"/>
  <!-- 纖維狀細線（隨機畫幾條）-->
  <path d="M 60 90 Q 100 130 80 170" fill="none" stroke="#FF80C0" stroke-width="1" opacity="0.5"/>
  <path d="M 180 100 Q 150 140 170 180" fill="none" stroke="#80B0FF" stroke-width="1" opacity="0.5"/>
  <path d="M 90 200 Q 130 160 160 200" fill="none" stroke="#FFFFFF" stroke-width="0.5" opacity="0.4"/>
  <!-- 中心脈衝星（小白點）-->
  <circle cx="120" cy="135" r="3" fill="#FFFFFF"/>
  <circle cx="120" cy="135" r="8" fill="none" stroke="#FFFFFF" stroke-width="0.5" opacity="0.5"/>
  <text x="120" y="295" text-anchor="middle" fill="#FF80C0" font-size="14" font-weight="bold" font-family="sans-serif" letter-spacing="1">CRAB NEBULA</text>
</svg>`);

// ============ 行星類 (7 個空殼) ============
// Sun: 表面 + 火焰舌
fs.writeFileSync(path.join(OUT, 'planet_sun.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sun-g" cx="40%" cy="40%">
      <stop offset="0%" stop-color="#FFFF80"/>
      <stop offset="50%" stop-color="#FFA020"/>
      <stop offset="100%" stop-color="#C84000"/>
    </radialGradient>
  </defs>
  <rect width="240" height="320" fill="#0A0A1A"/>
  <circle cx="120" cy="135" r="75" fill="url(#sun-g)"/>
  <!-- 表面活動（黑子 + 火焰舌）-->
  <ellipse cx="100" cy="120" rx="8" ry="5" fill="#5A2000" opacity="0.6"/>
  <ellipse cx="135" cy="150" rx="6" ry="4" fill="#5A2000" opacity="0.5"/>
  <!-- 日冕（外焰） -->
  <ellipse cx="80" cy="60" rx="10" ry="20" fill="#FFA020" opacity="0.6"/>
  <ellipse cx="160" cy="70" rx="12" ry="22" fill="#FF6020" opacity="0.5"/>
  <ellipse cx="70" cy="180" rx="10" ry="18" fill="#FFA020" opacity="0.5"/>
  <ellipse cx="170" cy="190" rx="14" ry="20" fill="#FF6020" opacity="0.6"/>
  <ellipse cx="190" cy="135" rx="8" ry="14" fill="#FFA020" opacity="0.5"/>
  <ellipse cx="50" cy="135" rx="8" ry="14" fill="#FFA020" opacity="0.5"/>
  <text x="120" y="295" text-anchor="middle" fill="#FFFF80" font-size="20" font-weight="bold" font-family="sans-serif" letter-spacing="2">SUN</text>
</svg>`);

// Mercury: 灰色坑洞行星
fs.writeFileSync(path.join(OUT, 'planet_mercury.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="mer-g" cx="35%" cy="35%">
      <stop offset="0%" stop-color="#BBBBBB"/>
      <stop offset="60%" stop-color="#666666"/>
      <stop offset="100%" stop-color="#222222"/>
    </radialGradient>
  </defs>
  <rect width="240" height="320" fill="#0A0A1A"/>
  <circle cx="120" cy="135" r="70" fill="url(#mer-g)"/>
  <!-- 隕石坑 -->
  <circle cx="90" cy="110" r="6" fill="#444" opacity="0.7"/>
  <circle cx="88" cy="108" r="3" fill="#222" opacity="0.8"/>
  <circle cx="145" cy="125" r="8" fill="#444" opacity="0.7"/>
  <circle cx="143" cy="123" r="4" fill="#222" opacity="0.8"/>
  <circle cx="110" cy="160" r="5" fill="#444" opacity="0.7"/>
  <circle cx="108" cy="158" r="2" fill="#222" opacity="0.8"/>
  <circle cx="155" cy="165" r="4" fill="#444" opacity="0.7"/>
  <circle cx="153" cy="163" r="2" fill="#222" opacity="0.8"/>
  <circle cx="80" cy="155" r="3" fill="#444" opacity="0.6"/>
  <text x="120" y="295" text-anchor="middle" fill="#BBBBBB" font-size="18" font-weight="bold" font-family="sans-serif" letter-spacing="2">MERCURY</text>
</svg>`);

// Venus: 黃色雲層
fs.writeFileSync(path.join(OUT, 'planet_venus.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="ve-g" cx="35%" cy="35%">
      <stop offset="0%" stop-color="#FFE890"/>
      <stop offset="60%" stop-color="#D8A040"/>
      <stop offset="100%" stop-color="#7A4A10"/>
    </radialGradient>
  </defs>
  <rect width="240" height="320" fill="#0A0A1A"/>
  <circle cx="120" cy="135" r="70" fill="url(#ve-g)"/>
  <!-- 雲層波紋 -->
  <ellipse cx="120" cy="105" rx="55" ry="4" fill="#FFF0B0" opacity="0.4"/>
  <ellipse cx="120" cy="120" rx="60" ry="3" fill="#FFE890" opacity="0.5"/>
  <ellipse cx="120" cy="140" rx="55" ry="3" fill="#FFE890" opacity="0.4"/>
  <ellipse cx="120" cy="160" rx="50" ry="4" fill="#FFF0B0" opacity="0.4"/>
  <ellipse cx="120" cy="175" rx="45" ry="3" fill="#FFE890" opacity="0.5"/>
  <text x="120" y="295" text-anchor="middle" fill="#FFE890" font-size="20" font-weight="bold" font-family="sans-serif" letter-spacing="2">VENUS</text>
</svg>`);

// Jupiter: 條紋 + 大紅斑
fs.writeFileSync(path.join(OUT, 'planet_jupiter.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="jup-g" cx="35%" cy="35%">
      <stop offset="0%" stop-color="#E8C890"/>
      <stop offset="100%" stop-color="#6A4818"/>
    </radialGradient>
  </defs>
  <rect width="240" height="320" fill="#0A0A1A"/>
  <circle cx="120" cy="135" r="80" fill="url(#jup-g)"/>
  <!-- 條紋 -->
  <ellipse cx="120" cy="100" rx="78" ry="3" fill="#A87840" opacity="0.5"/>
  <ellipse cx="120" cy="115" rx="78" ry="4" fill="#C89858" opacity="0.4"/>
  <ellipse cx="120" cy="130" rx="80" ry="5" fill="#8A5A28" opacity="0.5"/>
  <ellipse cx="120" cy="148" rx="80" ry="4" fill="#A87840" opacity="0.4"/>
  <ellipse cx="120" cy="165" rx="80" ry="5" fill="#C89858" opacity="0.5"/>
  <ellipse cx="120" cy="180" rx="78" ry="3" fill="#8A5A28" opacity="0.5"/>
  <!-- 大紅斑 -->
  <ellipse cx="145" cy="155" rx="12" ry="6" fill="#C83820" opacity="0.85"/>
  <ellipse cx="145" cy="153" rx="10" ry="4" fill="#E86040" opacity="0.6"/>
  <text x="120" y="295" text-anchor="middle" fill="#E8C890" font-size="18" font-weight="bold" font-family="sans-serif" letter-spacing="2">JUPITER</text>
</svg>`);

// Uranus: 側躺環（淡青色）
fs.writeFileSync(path.join(OUT, 'planet_uranus.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="ur-g" cx="35%" cy="35%">
      <stop offset="0%" stop-color="#A0E0E8"/>
      <stop offset="100%" stop-color="#1A5A60"/>
    </radialGradient>
  </defs>
  <rect width="240" height="320" fill="#0A0A1A"/>
  <!-- 側躺環（垂直橢圓）-->
  <ellipse cx="120" cy="135" rx="40" ry="105" fill="none" stroke="#88C8D0" stroke-width="2" opacity="0.6"/>
  <ellipse cx="120" cy="135" rx="30" ry="95" fill="none" stroke="#A0E0E8" stroke-width="2" opacity="0.7"/>
  <!-- 本體 -->
  <circle cx="120" cy="135" r="55" fill="url(#ur-g)"/>
  <!-- 雲帶 -->
  <ellipse cx="120" cy="110" rx="50" ry="3" fill="#C0F0F8" opacity="0.4"/>
  <ellipse cx="120" cy="160" rx="50" ry="3" fill="#C0F0F8" opacity="0.4"/>
  <text x="120" y="295" text-anchor="middle" fill="#A0E0E8" font-size="18" font-weight="bold" font-family="sans-serif" letter-spacing="2">URANUS</text>
</svg>`);

// Neptune: 深藍風暴
fs.writeFileSync(path.join(OUT, 'planet_neptune.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="ne-g" cx="35%" cy="35%">
      <stop offset="0%" stop-color="#4080E0"/>
      <stop offset="100%" stop-color="#0A1A5A"/>
    </radialGradient>
  </defs>
  <rect width="240" height="320" fill="#0A0A1A"/>
  <circle cx="120" cy="135" r="70" fill="url(#ne-g)"/>
  <!-- 風暴帶 -->
  <ellipse cx="120" cy="110" rx="60" ry="3" fill="#88B0F0" opacity="0.4"/>
  <ellipse cx="120" cy="135" rx="62" ry="4" fill="#A0C8FF" opacity="0.4"/>
  <ellipse cx="120" cy="160" rx="60" ry="3" fill="#88B0F0" opacity="0.4"/>
  <!-- 大暗斑（風暴）-->
  <ellipse cx="140" cy="150" rx="10" ry="6" fill="#000020" opacity="0.6"/>
  <text x="120" y="295" text-anchor="middle" fill="#88B0F0" font-size="18" font-weight="bold" font-family="sans-serif" letter-spacing="2">NEPTUNE</text>
</svg>`);

// Pluto: 棕色冰質 + 心形
fs.writeFileSync(path.join(OUT, 'planet_pluto.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="pl-g" cx="35%" cy="35%">
      <stop offset="0%" stop-color="#C89878"/>
      <stop offset="100%" stop-color="#4A2818"/>
    </radialGradient>
  </defs>
  <rect width="240" height="320" fill="#0A0A1A"/>
  <circle cx="120" cy="135" r="55" fill="url(#pl-g)"/>
  <!-- 心形 Tombaugh Reggio（白）-->
  <path d="M 100 130 Q 100 120 110 120 Q 120 120 120 130 Q 120 120 130 120 Q 140 120 140 130 Q 140 145 120 155 Q 100 145 100 130 Z" fill="#F0F0F0" opacity="0.85"/>
  <!-- 暗斑 -->
  <ellipse cx="90" cy="120" rx="6" ry="4" fill="#3A1A08" opacity="0.6"/>
  <ellipse cx="145" cy="115" rx="5" ry="3" fill="#3A1A08" opacity="0.6"/>
  <text x="120" y="295" text-anchor="middle" fill="#C89878" font-size="18" font-weight="bold" font-family="sans-serif" letter-spacing="2">PLUTO</text>
</svg>`);

// Titan: 橘色霧 + 甲烷湖
fs.writeFileSync(path.join(OUT, 'planet_titan.svg'),
`<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="ti-g" cx="35%" cy="35%">
      <stop offset="0%" stop-color="#FFB060"/>
      <stop offset="100%" stop-color="#6A3008"/>
    </radialGradient>
  </defs>
  <rect width="240" height="320" fill="#0A0A1A"/>
  <circle cx="120" cy="135" r="60" fill="url(#ti-g)"/>
  <!-- 霧層 -->
  <ellipse cx="120" cy="100" rx="58" ry="4" fill="#FFCC88" opacity="0.3"/>
  <ellipse cx="120" cy="130" rx="60" ry="3" fill="#FFB060" opacity="0.4"/>
  <ellipse cx="120" cy="160" rx="55" ry="4" fill="#FFCC88" opacity="0.3"/>
  <!-- 甲烷湖（深色斑點）-->
  <ellipse cx="105" cy="135" rx="8" ry="3" fill="#3A1A08" opacity="0.7"/>
  <ellipse cx="140" cy="125" rx="5" ry="2" fill="#3A1A08" opacity="0.7"/>
  <ellipse cx="130" cy="160" rx="6" ry="2" fill="#3A1A08" opacity="0.7"/>
  <text x="120" y="295" text-anchor="middle" fill="#FFB060" font-size="18" font-weight="bold" font-family="sans-serif" letter-spacing="1">TITAN</text>
</svg>`);

console.log('已生成 ' + fs.readdirSync(OUT).filter(f => f.endsWith('.svg')).length + ' 個 SVG');
console.log('完成。');
