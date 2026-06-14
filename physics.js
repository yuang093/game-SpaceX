/**
 * physics.js - 增強版
 * 負責 Canvas 渲染、重力/推力物理、粒子特效、對接系統
 */

// ================================================
// Canvas 設定
// ================================================
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let canvasWidth, canvasHeight;

// 世界座標
const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 50000; // v3.7.3 放大 5x：旅程時間更長

let cameraY = 0;
const GROUND_Y = WORLD_HEIGHT - 50;

// 著陸墊
const LANDING_PAD = {
    x: WORLD_WIDTH / 2,
    y: GROUND_Y,
    width: 320,    // 加大著陸平台（200→320，便於瞄準）
    height: 20
};

// 發射塔
const LAUNCH_TOWER = {
    x: WORLD_WIDTH / 2,
    y: GROUND_Y,
    width: 20,
    height: 350
};

// ================================================
// 火箭狀態
// ================================================
const rocket = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    fuel: 0,
    maxFuel: 100,
    heat: 0,
    maxHeat: 100,
    hull: 100,
    maxHull: 100,
    thrusting: false,
    thrustingSide: 0,
    braking: false,
    width: 24,
    height: 70,
    phase: 'GROUND',
    dockedStation: null,
    targetReached: false,
    lastY: undefined
};

// ================================================
// 物理常數
// ================================================
const PHYSICS = {
    GRAVITY: 0.06,
    MAX_SAFE_SPEED: 3.5,        // 放寬安全速度（2.5→3.5）
    MAX_SAFE_ANGLE: 25,         // 放寬安全角度（20→25）
    ROTATION_SPEED: 0.05,
    THROTTLE: 0.18,
    SIDE_THRUST: 0.04,
    FUEL_CONSUMPTION: 0.024,  // v3.7.3 配合 5x 世界：每 pixel 燃料消耗降為 1/5
    HEAT_RATE: 0.02,
    HEAT_SPEED_THRESHOLD: 10,
    BRAKE_FORCE: 0.18,          // 加強制動（0.15→0.18）
    LANDING_TOLERANCE: 15       // 新增：著陸容差（px）
};

// ================================================
// 粒子系統
// ================================================
const particles = [];
const MAX_PARTICLES = 300;

// 火箭圖片快取（type → HTMLImageElement）
const rocketImageCache = {};
const ROCKET_IMAGE_BASE = 'assets/rockets/processed/';

// 行星/天體影像快取
const planetImages = {};
const PLANET_IMAGE_BASE = 'assets/planets/';

/**
 * 預先載入行星真實影像
 */
function preloadPlanetImages() {
    const planetFiles = [
        { key: 'earth',      fileName: 'earth_real.jpg'    },
        { key: 'moon',       fileName: 'moon_real.jpg'     },
        { key: 'mars',       fileName: 'mars_real.jpg'     },
        // v3.4 新增真實天體照片（PNG）
        { key: 'mercury',    fileName: 'mercury_real.png'  },
        { key: 'venus',      fileName: 'venus_real.png'    },
        { key: 'jupiter',    fileName: 'jupiter_real.png'  },
        { key: 'saturn',     fileName: 'saturn_real.png'   },
        { key: 'sun',        fileName: 'sun_real.png'      },
        { key: 'neptune',    fileName: 'neptune_real.png'  },
        { key: 'pluto',      fileName: 'pluto_real.png'    },
        { key: 'titan',      fileName: 'titan_real.png'    },
        { key: 'enceladus',  fileName: 'enceladus_real.png'},
        { key: 'phobos',     fileName: 'phobos_real.png'   },
        { key: 'europa',     fileName: 'europa_real.png'   },
        { key: 'ceres',      fileName: 'ceres_real.png'    },
        // v3.7.5 發射台真實照片（NASA SpaceX SLC-40）
        { key: 'launchpad',  fileName: 'launchpad_real.png'}
    ];
    planetFiles.forEach(({ key, fileName }) => {
        const img = new Image();
        img.src = PLANET_IMAGE_BASE + fileName;
        img.onerror = () => console.warn(`行星影像載入失敗: ${fileName}`);
        planetImages[key] = img;
    });
}

/**
 * 預先載入所有火箭圖片（v3.6 真實火箭照片 PNG）
 * 使用與 CONFIG.rocketImages 一致的 key（底線命名）
 */
function preloadRocketImages() {
    // v3.6：所有火箭統一用 rocket_{key}.png 命名規則
    const keys = [
        'scout', 'falcon', 'dragon', 'heavy', 'starship',
        'starship_v2', 'super_heavy', 'tanker', 'lynx',
        'starship_block1', 'starship_block2', 'starship_block3',
        'starship_block4', 'starship_hls', 'starship_mars'
    ];
    keys.forEach((key) => {
        const img = new Image();
        img.src = ROCKET_IMAGE_BASE + 'rocket_' + key + '.png';
        img.onerror = () => console.warn(`火箭圖片載入失敗: rocket_${key}.png`);
        rocketImageCache[key] = img;
    });
}

/**
 * 取得當前選擇火箭的圖片
 */
function getCurrentRocketImage() {
    const rocketData = GameState.rockets[GameState.selectedRocketIndex];
    if (!rocketData) return rocketImageCache['scout'];
    return rocketImageCache[rocketData.type] || rocketImageCache['scout'];
}

class Particle {
    constructor(x, y, vx, vy, type = 'flame') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.type = type;
        this.life = 1.0;
        this.decay = 0.015 + Math.random() * 0.02;
        this.size = type === 'flame' ? 5 + Math.random() * 5 : 3 + Math.random() * 3;
        this.color = this.getColor();
    }

    getColor() {
        if (this.type === 'flame') {
            const colors = ['#ff6b35', '#ff8855', '#ffaa00', '#ff5500', '#ffcc00'];
            return colors[Math.floor(Math.random() * colors.length)];
        } else if (this.type === 'smoke') {
            return `rgba(80, 80, 100, ${0.2 + Math.random() * 0.3})`;
        } else if (this.type === 'exhaust') {
            return `rgba(150, 150, 170, ${0.1 + Math.random() * 0.2})`;
        } else if (this.type === 'explosion') {
            const colors = ['#ff4466', '#ff8855', '#ffaa00', '#ffffff', '#ff5500', '#ff66aa'];
            return colors[Math.floor(Math.random() * colors.length)];
        } else if (this.type === 'spark') {
            return `rgba(255, 255, 200, ${0.5 + Math.random() * 0.5})`;
        }
        return '#ffffff';
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.size *= 0.98;

        if (this.type === 'smoke' || this.type === 'exhaust') {
            this.vx *= 0.98;
            this.vy *= 0.98;
        }

        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function emitFlameParticles(x, y, angle, intensity = 1) {
    const count = Math.floor(4 * intensity);

    for (let i = 0; i < count; i++) {
        if (particles.length >= MAX_PARTICLES) break;

        const spread = (Math.random() - 0.5) * 0.6;
        const speed = 4 + Math.random() * 4;

        const vx = Math.sin(angle + spread) * speed + rocket.vx * 0.2;
        const vy = Math.cos(angle + spread) * speed + rocket.vy * 0.2;

        particles.push(new Particle(x, y, vx, vy, 'flame'));

        if (Math.random() < 0.4) {
            particles.push(new Particle(
                x + (Math.random() - 0.5) * 15,
                y + (Math.random() - 0.5) * 15,
                vx * 0.4 + (Math.random() - 0.5) * 0.5,
                vy * 0.4 + (Math.random() - 0.5) * 0.5,
                'smoke'
            ));
        }
    }
}

function emitExhaustParticles(x, y) {
    if (particles.length >= MAX_PARTICLES || Math.random() > 0.3) return;

    particles.push(new Particle(
        x + (Math.random() - 0.5) * 10,
        y,
        (Math.random() - 0.5) * 0.5,
        0.5 + Math.random() * 0.5,
        'exhaust'
    ));
}

function emitExplosionParticles(x, y) {
    // 主要爆炸粒子
    for (let i = 0; i < 150; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 12;

        particles.push(new Particle(
            x + (Math.random() - 0.5) * 30,
            y + (Math.random() - 0.5) * 30,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            'explosion'
        ));
    }

    // 火花
    for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 5 + Math.random() * 10;

        particles.push(new Particle(
            x + (Math.random() - 0.5) * 20,
            y + (Math.random() - 0.5) * 20,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            'spark'
        ));
    }

    // 濃煙
    for (let i = 0; i < 80; i++) {
        particles.push(new Particle(
            x + (Math.random() - 0.5) * 60,
            y + (Math.random() - 0.5) * 60,
            (Math.random() - 0.5) * 3,
            -2 - Math.random() * 3,
            'smoke'
        ));
    }
}

// ================================================
// 星空背景
// ================================================

/**
 * 根據高度繪製動態太空背景（天空漸層 + 太陽 + 星雲）
 */
function drawSpaceBackground() {
    const rocketY = rocket ? rocket.y : GROUND_Y;
    const altitude = GROUND_Y - rocketY; // 高度越大（正數）= 在太空

    // 背景底色：根據高度從藍天 → 深空過渡
    if (altitude < 500) {
        // 對流層/平流層（0-500m）
        const t = altitude / 500;
        const r = Math.round(5 + t * (3 - 5));
        const g = Math.round(5 + t * (3 - 5));
        const b = Math.round(20 + t * (10 - 20));
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    } else {
        // 深空
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // === 太陽（在高空可見）===
    if (altitude > 200) {
        drawSun(altitude);
    }

    // === 星雲效果（高空深空）===
    if (altitude > 2000) {
        drawNebula(altitude);
    }
}

/**
 * 繪製太陽（高空時出現在畫面右上角）
 */
function drawSun(altitude) {
    const sunX = canvasWidth * 0.88;
    const sunY = 80;
    const sunRadius = 30 + Math.min(altitude / 500, 1) * 10; // 越高越大

    // 太陽本體
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.3, '#ffee88');
    sunGrad.addColorStop(0.7, '#ffcc44');
    sunGrad.addColorStop(1, '#ff8800');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    // 日冕光暈
    ctx.save();
    ctx.globalAlpha = 0.3;
    const coronaGrad = ctx.createRadialGradient(sunX, sunY, sunRadius, sunX, sunY, sunRadius * 3);
    coronaGrad.addColorStop(0, 'rgba(255,220,100,0.6)');
    coronaGrad.addColorStop(0.5, 'rgba(255,180,50,0.2)');
    coronaGrad.addColorStop(1, 'rgba(255,150,0,0)');
    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 光芒
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#ffdd66';
    ctx.lineWidth = 2;
    const rays = 12;
    for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * Math.PI * 2 + Date.now() * 0.0001;
        const innerR = sunRadius + 5;
        const outerR = sunRadius + 20 + Math.sin(Date.now() * 0.003 + i) * 8;
        ctx.beginPath();
        ctx.moveTo(sunX + Math.cos(angle) * innerR, sunY + Math.sin(angle) * innerR);
        ctx.lineTo(sunX + Math.cos(angle) * outerR, sunY + Math.sin(angle) * outerR);
        ctx.stroke();
    }
    ctx.restore();
}

/**
 * 繪製星雲（高空深空背景裝飾）
 */
function drawNebula(altitude) {
    const intensity = Math.min((altitude - 2000) / 4000, 1);
    ctx.save();
    ctx.globalAlpha = intensity * 0.15;

    // 紫色星雲斑塊
    const nebX = canvasWidth * 0.2;
    const nebY = canvasHeight * 0.3;
    const nebGrad = ctx.createRadialGradient(nebX, nebY, 0, nebX, nebY, 200);
    nebGrad.addColorStop(0, '#8844ff');
    nebGrad.addColorStop(0.5, '#4422aa');
    nebGrad.addColorStop(1, 'rgba(30,10,60,0)');
    ctx.fillStyle = nebGrad;
    ctx.beginPath();
    ctx.arc(nebX, nebY, 200, 0, Math.PI * 2);
    ctx.fill();

    // 藍綠色星雲斑塊
    const neb2X = canvasWidth * 0.75;
    const neb2Y = canvasHeight * 0.6;
    const neb2Grad = ctx.createRadialGradient(neb2X, neb2Y, 0, neb2X, neb2Y, 150);
    neb2Grad.addColorStop(0, '#22aacc');
    neb2Grad.addColorStop(0.5, '#116688');
    neb2Grad.addColorStop(1, 'rgba(10,30,50,0)');
    ctx.fillStyle = neb2Grad;
    ctx.beginPath();
    ctx.arc(neb2X, neb2Y, 150, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// v3.0：三層視差星空（遠/中/近 不同速度，營造 3D 飛行感）
const stars = [];
const STAR_LAYERS = [
    { count: 80,  baseSize: 0.5, parallax: 0.2, alpha: 0.4, color: '#ffffff' },  // 遠景
    { count: 120, baseSize: 1.0, parallax: 0.5, alpha: 0.7, color: '#ffffff' },  // 中景
    { count: 80,  baseSize: 1.8, parallax: 1.0, alpha: 1.0, color: '#ffffff' }   // 近景
];

function generateStars() {
    stars.length = 0;
    STAR_LAYERS.forEach((layer, layerIdx) => {
        for (let i = 0; i < layer.count; i++) {
            stars.push({
                x: Math.random() * WORLD_WIDTH,
                y: Math.random() * WORLD_HEIGHT,
                z: layer.parallax,
                size: layer.baseSize * (0.7 + Math.random() * 0.6),
                brightness: layer.alpha * (0.5 + Math.random() * 0.5),
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpeed: 1.5 + Math.random() * 1.5,
                color: layer.color,
                layer: layerIdx
            });
        }
    });
}

function drawStars() {
    const time = Date.now() * 0.001;
    const speed = rocket ? Math.abs(rocket.vy) : 0;
    const trailLength = Math.min(speed * 6, 60);  // 拖尾長度上限 60px

    // 按 z 排序：遠景先繪製（z 小），近景後（z 大）
    const sorted = [...stars].sort((a, b) => a.z - b.z);

    sorted.forEach(star => {
        // 視差：近景跟隨相機較多，遠景較少
        const screenX = star.x;
        const screenY = star.y - cameraY * star.z;

        // 循環：超出畫面就回到頂端/底端
        let finalY = screenY;
        if (finalY < -50) finalY = finalY + WORLD_HEIGHT * star.z;
        if (finalY > canvasHeight + 50) finalY = finalY - WORLD_HEIGHT * star.z;

        // 閃爍
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkle) * 0.3 + 0.7;
        const alpha = star.brightness * twinkle;

        // 速度拖尾（速度大於 1 時繪製）
        if (trailLength > 5 && rocket) {
            const trailY = -rocket.vy * trailLength * star.z;
            ctx.save();
            ctx.strokeStyle = star.color;
            ctx.globalAlpha = alpha * 0.35;
            ctx.lineWidth = star.size * 0.3;
            ctx.beginPath();
            ctx.moveTo(screenX, finalY);
            ctx.lineTo(screenX, finalY + trailY);
            ctx.stroke();
            ctx.restore();
        }

        // 星點
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(screenX, finalY, star.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// 行星/地球（真實衛星紋理）
function drawEarth() {
    const earthY = GROUND_Y - 200 - cameraY;

    if (earthY > canvasHeight + 600) return;
    if (!isFinite(earthY)) return;

    const cx = WORLD_WIDTH / 2;
    const earthRadius = 550;

    // 若已載入真實紋理，優先使用
    const earthImg = planetImages['earth'];
    if (earthImg && earthImg.complete && earthImg.naturalWidth > 0) {
        // 紋理地球
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, earthY, earthRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(earthImg, cx - earthRadius, earthY - earthRadius, earthRadius * 2, earthRadius * 2);
        ctx.restore();
    } else {
        // Fallback：漸層地球
        const gradient = ctx.createRadialGradient(cx, earthY - 100, 100, cx, earthY, earthRadius);
        gradient.addColorStop(0, '#4488ff');
        gradient.addColorStop(0.5, '#2266cc');
        gradient.addColorStop(1, '#113388');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, earthY, earthRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    // 大氣層藍色光暈（內發光）
    ctx.save();
    ctx.globalAlpha = 0.5;
    const atmoInner = ctx.createRadialGradient(cx, earthY, earthRadius * 0.7, cx, earthY, earthRadius + 80);
    atmoInner.addColorStop(0, 'rgba(100, 180, 255, 0.4)');
    atmoInner.addColorStop(1, 'rgba(100, 180, 255, 0)');
    ctx.fillStyle = atmoInner;
    ctx.beginPath();
    ctx.arc(cx, earthY, earthRadius + 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 大氣層外層微光
    ctx.save();
    ctx.globalAlpha = 0.2;
    const atmoOuter = ctx.createRadialGradient(cx, earthY, earthRadius, cx, earthY, earthRadius + 200);
    atmoOuter.addColorStop(0, 'rgba(60, 140, 255, 0.3)');
    atmoOuter.addColorStop(1, 'rgba(60, 140, 255, 0)');
    ctx.fillStyle = atmoOuter;
    ctx.beginPath();
    ctx.arc(cx, earthY, earthRadius + 200, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 白天/黑夜交界線（細微弧線）
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx - 300, earthY, earthRadius, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.stroke();
    ctx.restore();
}

/**
 * 繪製起點天體（依 GameState.currentLocation 切換）
 * 取代原本無條件呼叫 drawEarth()，讓玩家在 moon/mars/jupiter 起飛時看到對應天體
 */
function drawStartingBody() {
    const loc = (typeof GameState !== 'undefined' && GameState.currentLocation) || 'earth';
    const cx = WORLD_WIDTH / 2;
    // 起點天體顯示位置（火箭起飛處 GROUND_Y 上方 200）
    const displayY = GROUND_Y - 200;

    // === 地球 / 地球軌道太空站（顯示地球）===
    if (loc === 'earth' || loc === 'leo' || loc === 'polar' ||
        loc === 'lagrange') {
        drawEarth();
        return;
    }

    // === 太陽能衛星矩陣（顯示太陽 + 矩陣）===
    if (loc === 'solar_satellite') {
        const screenY = displayY - cameraY;
        // 太陽（小型）
        const sunGrad = ctx.createRadialGradient(cx - 200, screenY - 100, 30, cx - 200, screenY - 100, 80);
        sunGrad.addColorStop(0, '#ffffff');
        sunGrad.addColorStop(0.3, '#ffee88');
        sunGrad.addColorStop(0.7, '#ffcc44');
        sunGrad.addColorStop(1, '#ff8800');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(cx - 200, screenY - 100, 80, 0, Math.PI * 2);
        ctx.fill();
        // 太陽光芒
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#ffdd66';
        ctx.lineWidth = 2;
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx - 200 + Math.cos(angle) * 85, screenY - 100 + Math.sin(angle) * 85);
            ctx.lineTo(cx - 200 + Math.cos(angle) * 110, screenY - 100 + Math.sin(angle) * 110);
            ctx.stroke();
        }
        ctx.restore();
        // 太陽能板陣列
        ctx.fillStyle = '#1a3a6e';
        for (let i = -2; i <= 2; i++) {
            ctx.fillRect(cx - 100 + i * 50, screenY - 40, 45, 80);
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 1;
            ctx.strokeRect(cx - 100 + i * 50, screenY - 40, 45, 80);
            // 內部格線
            for (let j = 1; j < 4; j++) {
                ctx.beginPath();
                ctx.moveTo(cx - 100 + i * 50, screenY - 40 + j * 20);
                ctx.lineTo(cx - 100 + i * 50 + 45, screenY - 40 + j * 20);
                ctx.stroke();
            }
        }
        // 中心連接桁架
        ctx.fillStyle = '#888';
        ctx.fillRect(cx - 150, screenY - 3, 300, 6);
        // 標籤
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('☀️ 太陽能衛星矩陣', cx, screenY + 80);
        return;
    }

    // === 月球（顯示月球）===
    if (loc === 'moon' || loc === 'gateway') {
        drawMoon(displayY, 1.5);
        return;
    }

    // === 火星（顯示火星）===
    if (loc === 'mars' || loc === 'phobos') {
        drawMars(displayY, 1.3);
        return;
    }

    // === 金星 ===
    if (loc === 'venus') {
        drawVenus(displayY, 1.3);
        return;
    }

    // === 水星 ===
    if (loc === 'mercury') {
        drawMercury(displayY, 1.2);
        return;
    }

    // === 木星（巨大條紋行星）===
    if (loc === 'jupiter') {
        const screenY = displayY - cameraY;
        const radius = 220;
        const jupGrad = ctx.createRadialGradient(cx - 50, screenY - 30, 30, cx, screenY, radius);
        jupGrad.addColorStop(0, '#ffcc88');
        jupGrad.addColorStop(0.6, '#cc8855');
        jupGrad.addColorStop(1, '#664422');
        ctx.fillStyle = jupGrad;
        ctx.beginPath();
        ctx.arc(cx, screenY, radius, 0, Math.PI * 2);
        ctx.fill();
        // 條紋
        ctx.fillStyle = 'rgba(100,60,30,0.4)';
        for (let i = 0; i < 7; i++) {
            const y = screenY - radius + (i + 1) * (radius * 2 / 8);
            ctx.fillRect(cx - radius, y, radius * 2, 6);
        }
        // 大紅斑
        ctx.fillStyle = 'rgba(200,100,50,0.7)';
        ctx.beginPath();
        ctx.ellipse(cx + radius * 0.4, screenY + radius * 0.2, radius * 0.15, radius * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        return;
    }

    // === 土星（環）===
    if (loc === 'saturn_ring' || loc === 'titan' || loc === 'enceladus') {
        const screenY = displayY - cameraY;
        const radius = 180;
        // 環
        ctx.strokeStyle = '#ddaa77';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.ellipse(cx, screenY, radius * 1.5, radius * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#bb8855';
        ctx.beginPath();
        ctx.ellipse(cx, screenY, radius * 1.7, radius * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
        // 本體
        const satGrad = ctx.createRadialGradient(cx - 20, screenY - 20, 20, cx, screenY, radius);
        satGrad.addColorStop(0, '#ffeebb');
        satGrad.addColorStop(1, '#aa8855');
        ctx.fillStyle = satGrad;
        ctx.beginPath();
        ctx.arc(cx, screenY, radius, 0, Math.PI * 2);
        ctx.fill();
        return;
    }

    // === 歐羅巴（冰藍色）===
    if (loc === 'europa') {
        const screenY = displayY - cameraY;
        const radius = 160;
        const grad = ctx.createRadialGradient(cx - 30, screenY - 30, 20, cx + 150, screenY, radius);
        grad.addColorStop(0, '#ccddee');
        grad.addColorStop(0.7, '#88aacc');
        grad.addColorStop(1, '#446688');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, screenY, radius, 0, Math.PI * 2);
        ctx.fill();
        // 冰裂紋
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.moveTo(cx, screenY);
            const angle = (i / 8) * Math.PI * 2;
            ctx.lineTo(cx + Math.cos(angle) * radius * 0.8, screenY + Math.sin(angle) * radius * 0.8);
            ctx.stroke();
        }
        return;
    }

    // === 海王星（冰藍巨星）===
    if (loc === 'neptune') {
        drawNeptune(displayY, 1.5);
        return;
    }

    // === 冥王星 ===
    if (loc === 'pluto') {
        drawPluto(displayY, 1.3);
        return;
    }

    // === 穀神星 / 小行星帶 ===
    if (loc === 'ceres' || loc === 'asteroid') {
        drawCeres(displayY, 1.3);
        return;
    }

    // === 彗星 ===
    if (loc === 'comet') {
        const screenY = displayY - cameraY;
        // 尾巴
        const tailLen = 250;
        const tailGrad = ctx.createLinearGradient(cx, screenY, cx - tailLen, screenY - 50);
        tailGrad.addColorStop(0, 'rgba(170,238,255,0.7)');
        tailGrad.addColorStop(0.5, 'rgba(170,238,255,0.3)');
        tailGrad.addColorStop(1, 'rgba(170,238,255,0)');
        ctx.fillStyle = tailGrad;
        ctx.beginPath();
        ctx.moveTo(cx, screenY);
        ctx.lineTo(cx - tailLen, screenY - 60);
        ctx.lineTo(cx - tailLen, screenY + 60);
        ctx.closePath();
        ctx.fill();
        // 核心
        ctx.fillStyle = '#ddffff';
        ctx.beginPath();
        ctx.arc(cx, screenY, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, screenY, 18, 0, Math.PI * 2);
        ctx.fill();
        return;
    }

    // === 古柏帶（冰封岩石 + 星光）===
    if (loc === 'kuiper_belt') {
        drawKuiper(displayY, 1.6);
        return;
    }

    // === 預設（未知太空站顯示地球）===
    drawEarth();
}

/**
 * 繪製月球（真實衛星紋理）
 * @param {number} worldY - 月球中心的世界座標 Y
 * @param {number} scale - 縮放比例（預設 1）
 */
function drawMoon(worldY, scale = 1) {
    const screenY = worldY - cameraY;
    const cx = WORLD_WIDTH / 2;
    const radius = 200 * scale;

    if (screenY + radius < -100 || screenY - radius > canvasHeight + 100) return;

    const moonImg = planetImages['moon'];
    if (moonImg && moonImg.complete && moonImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, screenY, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(moonImg, cx - radius, screenY - radius, radius * 2, radius * 2);
        ctx.restore();
    } else {
        // Fallback：灰色漸層
        const grad = ctx.createRadialGradient(cx - radius * 0.3, screenY - radius * 0.3, 0, cx, screenY, radius);
        grad.addColorStop(0, '#dddddd');
        grad.addColorStop(1, '#555555');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, screenY, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // 月球微光
    ctx.save();
    ctx.globalAlpha = 0.2;
    const glow = ctx.createRadialGradient(cx, screenY, radius, cx, screenY, radius + 60);
    glow.addColorStop(0, 'rgba(200, 200, 210, 0.5)');
    glow.addColorStop(1, 'rgba(200, 200, 210, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, screenY, radius + 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

/**
 * 繪製金星（厚重大氣層）
 */
function drawVenus(worldY, scale = 1) {
    const screenY = worldY - cameraY;
    const cx = WORLD_WIDTH / 2;
    const radius = 160 * scale;

    if (screenY + radius < -100 || screenY - radius > canvasHeight + 100) return;

    // 金星厚重雲層
    const grad = ctx.createRadialGradient(cx - radius * 0.3, screenY - radius * 0.3, 0, cx, screenY, radius);
    grad.addColorStop(0, '#ffeecc');
    grad.addColorStop(0.4, '#ddaa66');
    grad.addColorStop(1, '#aa6622');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, screenY, radius, 0, Math.PI * 2);
    ctx.fill();

    // 雲層條紋
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#ffcc88';
    ctx.lineWidth = 4;
    for (let i = 0; i < 5; i++) {
        const yOff = (i - 2) * radius * 0.3;
        ctx.beginPath();
        ctx.arc(cx, screenY + yOff, Math.sqrt(Math.max(0, radius * radius - yOff * yOff)), 0, Math.PI);
        ctx.stroke();
    }
    ctx.restore();

    // 金星微光
    ctx.save();
    ctx.globalAlpha = 0.2;
    const glow = ctx.createRadialGradient(cx, screenY, radius, cx, screenY, radius + 60);
    glow.addColorStop(0, 'rgba(255, 200, 100, 0.5)');
    glow.addColorStop(1, 'rgba(255, 200, 100, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, screenY, radius + 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

/**
 * 繪製水星（隕石坑表面）
 */
function drawMercury(worldY, scale = 1) {
    const screenY = worldY - cameraY;
    const cx = WORLD_WIDTH / 2;
    const radius = 140 * scale;

    if (screenY + radius < -100 || screenY - radius > canvasHeight + 100) return;

    const grad = ctx.createRadialGradient(cx - radius * 0.3, screenY - radius * 0.3, 0, cx, screenY, radius);
    grad.addColorStop(0, '#bbbbbb');
    grad.addColorStop(1, '#555555');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, screenY, radius, 0, Math.PI * 2);
    ctx.fill();

    // 水星隕石坑
    ctx.fillStyle = '#444444';
    const craters = [[-40, -30, 20], [30, 20, 15], [-10, 50, 12], [50, -20, 10], [-50, 10, 8]];
    craters.forEach(([dx, dy, r]) => {
        ctx.beginPath();
        ctx.arc(cx + dx, screenY + dy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#888888';
        ctx.beginPath();
        ctx.arc(cx + dx - 2, screenY + dy - 2, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#444444';
    });

    // 微光
    ctx.save();
    ctx.globalAlpha = 0.15;
    const glow = ctx.createRadialGradient(cx, screenY, radius, cx, screenY, radius + 40);
    glow.addColorStop(0, 'rgba(200, 200, 200, 0.4)');
    glow.addColorStop(1, 'rgba(200, 200, 200, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, screenY, radius + 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

/**
 * 繪製海王星（冰巨星）
 */
function drawNeptune(worldY, scale = 1) {
    const screenY = worldY - cameraY;
    const cx = WORLD_WIDTH / 2;
    const radius = 220 * scale;

    if (screenY + radius < -100 || screenY - radius > canvasHeight + 100) return;

    const grad = ctx.createRadialGradient(cx - radius * 0.3, screenY - radius * 0.3, 0, cx, screenY, radius);
    grad.addColorStop(0, '#6688ff');
    grad.addColorStop(0.5, '#3355cc');
    grad.addColorStop(1, '#112255');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, screenY, radius, 0, Math.PI * 2);
    ctx.fill();

    // 海王星條紋
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#88aaff';
    ctx.lineWidth = 5;
    for (let i = 0; i < 4; i++) {
        const yOff = (i - 1.5) * radius * 0.3;
        ctx.beginPath();
        ctx.arc(cx, screenY + yOff, Math.sqrt(Math.max(0, radius * radius - yOff * yOff)), 0, Math.PI);
        ctx.stroke();
    }
    ctx.restore();

    // 大氣微光
    ctx.save();
    ctx.globalAlpha = 0.25;
    const glow = ctx.createRadialGradient(cx, screenY, radius, cx, screenY, radius + 100);
    glow.addColorStop(0, 'rgba(100, 140, 255, 0.4)');
    glow.addColorStop(1, 'rgba(100, 140, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, screenY, radius + 100, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

/**
 * 繪製冥王星（冰矮星）
 */
function drawPluto(worldY, scale = 1) {
    const screenY = worldY - cameraY;
    const cx = WORLD_WIDTH / 2;
    const radius = 100 * scale;

    if (screenY + radius < -100 || screenY - radius > canvasHeight + 100) return;

    const grad = ctx.createRadialGradient(cx - radius * 0.3, screenY - radius * 0.3, 0, cx, screenY, radius);
    grad.addColorStop(0, '#ddccaa');
    grad.addColorStop(0.5, '#aa8866');
    grad.addColorStop(1, '#664433');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, screenY, radius, 0, Math.PI * 2);
    ctx.fill();

    // 冰冠（冥王星有氮冰冠）
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, screenY - radius * 0.6, radius * 0.4, radius * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 表面紋理
    ctx.fillStyle = '#885533';
    ctx.beginPath();
    ctx.arc(cx - 20, screenY + 20, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 30, screenY - 10, 10, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * 繪製穀神星（小行星帶最大天體）
 */
function drawCeres(worldY, scale = 1) {
    if (!isFinite(worldY) || !isFinite(cameraY)) return;
    const screenY = worldY - cameraY;
    const cx = WORLD_WIDTH / 2;
    const radius = 120 * scale;

    if (screenY + radius < -100 || screenY - radius > canvasHeight + 100) return;

    const grad = ctx.createRadialGradient(cx - radius * 0.3, screenY - radius * 0.3, 0, cx, screenY, radius);
    grad.addColorStop(0, '#aaaaaa');
    grad.addColorStop(1, '#555555');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, screenY, radius, 0, Math.PI * 2);
    ctx.fill();

    // 不規則形狀（稍微變形）
    ctx.fillStyle = '#666666';
    ctx.beginPath();
    ctx.arc(cx - 30, screenY + 20, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 40, screenY - 15, 15, 0, Math.PI * 2);
    ctx.fill();

    // 採礦痕跡
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#ffcc44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, screenY, radius * 0.7, 0, Math.PI * 0.5);
    ctx.stroke();
    ctx.restore();
}

/**
 * 繪製土衛六泰坦（橙色甲烷大氣）
 */
function drawTitan(worldY, scale = 1) {
    const screenY = worldY - cameraY;
    const cx = WORLD_WIDTH / 2;
    const radius = 180 * scale;

    if (screenY + radius < -100 || screenY - radius > canvasHeight + 100) return;

    // 土衛六本體（橙褐色厚重大氣）
    const grad = ctx.createRadialGradient(cx - radius * 0.3, screenY - radius * 0.3, 0, cx, screenY, radius);
    grad.addColorStop(0, '#ddaa66');
    grad.addColorStop(0.5, '#cc8833');
    grad.addColorStop(1, '#885522');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, screenY, radius, 0, Math.PI * 2);
    ctx.fill();

    // 甲烷雲層條紋
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#ffcc88';
    ctx.lineWidth = 5;
    for (let i = 0; i < 4; i++) {
        const yOff = (i - 1.5) * radius * 0.25;
        ctx.beginPath();
        ctx.arc(cx, screenY + yOff, Math.sqrt(Math.max(0, radius * radius - yOff * yOff)), 0, Math.PI);
        ctx.stroke();
    }
    ctx.restore();

    // 厚重大氣光暈
    ctx.save();
    ctx.globalAlpha = 0.3;
    const glow = ctx.createRadialGradient(cx, screenY, radius, cx, screenY, radius + 100);
    glow.addColorStop(0, 'rgba(220, 160, 80, 0.5)');
    glow.addColorStop(1, 'rgba(220, 160, 80, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, screenY, radius + 100, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

/**
 * 繪製土衛二（冰噴射水柱）
 */
function drawEnceladus(worldY, scale = 1) {
    const screenY = worldY - cameraY;
    const cx = WORLD_WIDTH / 2;
    const radius = 130 * scale;

    if (screenY + radius < -100 || screenY - radius > canvasHeight + 100) return;

    // 土衛二本體（冰白色）
    const grad = ctx.createRadialGradient(cx - radius * 0.3, screenY - radius * 0.3, 0, cx, screenY, radius);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.6, '#ddeeff');
    grad.addColorStop(1, '#8899bb');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, screenY, radius, 0, Math.PI * 2);
    ctx.fill();

    // 冰裂紋
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(cx, screenY);
        const angle = (i / 6) * Math.PI * 2;
        ctx.lineTo(cx + Math.cos(angle) * radius * 0.8, screenY + Math.sin(angle) * radius * 0.8);
        ctx.stroke();
    }

    // 水噴射柱（動畫）
    const time = Date.now() * 0.002;
    const jetHeight = 40 + Math.sin(time) * 10;
    ctx.save();
    ctx.globalAlpha = 0.5;
    const jetGrad = ctx.createLinearGradient(cx, screenY - radius, cx, screenY - radius - jetHeight);
    jetGrad.addColorStop(0, 'rgba(200, 230, 255, 0.8)');
    jetGrad.addColorStop(1, 'rgba(200, 230, 255, 0)');
    ctx.fillStyle = jetGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 5, screenY - radius);
    ctx.lineTo(cx - 15, screenY - radius - jetHeight);
    ctx.lineTo(cx + 15, screenY - radius - jetHeight);
    ctx.lineTo(cx + 5, screenY - radius);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

/**
 * 繪製古柏帶天體（冰封岩石 + 星光背景）
 */
function drawKuiper(worldY, scale = 1) {
    const screenY = worldY - cameraY;
    const cx = WORLD_WIDTH / 2;
    const radius = 150 * scale;

    if (screenY + radius < -100 || screenY - radius > canvasHeight + 100) return;

    // 古柏帶天體本體
    const grad = ctx.createRadialGradient(cx - radius * 0.3, screenY - radius * 0.3, 0, cx, screenY, radius);
    grad.addColorStop(0, '#bb99dd');
    grad.addColorStop(0.5, '#7755aa');
    grad.addColorStop(1, '#332255');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, screenY, radius, 0, Math.PI * 2);
    ctx.fill();

    // 冰表面斑塊
    ctx.fillStyle = '#cc99ee';
    ctx.beginPath();
    ctx.arc(cx - 30, screenY - 20, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9988cc';
    ctx.beginPath();
    ctx.arc(cx + 40, screenY + 30, 20, 0, Math.PI * 2);
    ctx.fill();

    // 周圍小岩石
    const rocks = [[-80, -50, 15], [90, -30, 12], [-60, 60, 10], [70, 50, 8]];
    ctx.fillStyle = '#6644aa';
    rocks.forEach(([rx, ry, rr]) => {
        ctx.beginPath();
        ctx.arc(cx + rx, screenY + ry, rr, 0, Math.PI * 2);
        ctx.fill();
    });

    // 深空星光背景
    ctx.save();
    ctx.globalAlpha = 0.6;
    const time = Date.now() * 0.001;
    const kStars = [[-200, -100], [250, -50], [-180, 150], [220, 180], [-100, 250]];
    kStars.forEach(([sx, sy], i) => {
        const twinkle = Math.sin(time * 2 + i) * 0.3 + 0.7;
        ctx.globalAlpha = 0.6 * twinkle;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx + sx, screenY + sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

/**
 * 繪製火星（真實衛星紋理）
 * @param {number} worldY - 火星中心的世界座標 Y
 * @param {number} scale - 縮放比例（預設 1）
 */
function drawMars(worldY, scale = 1) {
    const screenY = worldY - cameraY;
    const cx = WORLD_WIDTH / 2;
    const radius = 180 * scale;

    if (screenY + radius < -100 || screenY - radius > canvasHeight + 100) return;

    const marsImg = planetImages['mars'];
    if (marsImg && marsImg.complete && marsImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, screenY, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(marsImg, cx - radius, screenY - radius, radius * 2, radius * 2);
        ctx.restore();
    } else {
        // Fallback：紅色漸層
        const grad = ctx.createRadialGradient(cx - radius * 0.3, screenY - radius * 0.3, 0, cx, screenY, radius);
        grad.addColorStop(0, '#ee9966');
        grad.addColorStop(1, '#662200');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, screenY, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // 火星大氣微光
    ctx.save();
    ctx.globalAlpha = 0.25;
    const glow = ctx.createRadialGradient(cx, screenY, radius, cx, screenY, radius + 80);
    glow.addColorStop(0, 'rgba(200, 100, 60, 0.4)');
    glow.addColorStop(1, 'rgba(200, 100, 60, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, screenY, radius + 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// ================================================
// 地面與設施
// ================================================
function drawGround() {
    const groundY = GROUND_Y - cameraY;

    if (!isFinite(groundY) || groundY > canvasHeight + 100) return;

    // 地面
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, groundY, canvasWidth, canvasHeight - groundY + 100);

    // 地面漸層
    if (isFinite(groundY)) {
        const gradient = ctx.createLinearGradient(0, groundY, 0, groundY + 30);
        gradient.addColorStop(0, '#2a2a4e');
        gradient.addColorStop(1, '#1a1a2e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, groundY, canvasWidth, 30);
    }

    // 地面線
    ctx.strokeStyle = '#3a3a5e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvasWidth, groundY);
    ctx.stroke();

    // 地面紋理
    ctx.fillStyle = '#252540';
    for (let i = 0; i < canvasWidth; i += 40) {
        ctx.fillRect(i, groundY + 5, 20, 2);
    }
}

/**
 * 繪製真實發射塔（依 GameState.currentLocation 切換風格）
 * - earth  : 肯尼迪 39A 風格（深灰金屬 + 4 層平台 + 服務臂）
 * - moon   : 輕量鋁合金支架 + 月岩基座（無大服務臂）
 * - mars   : 紅色隔熱金屬 + 圓頂觀察艙
 * - 其他   : 通用太空站精簡發射架
 */
function drawLaunchTower() {
    const towerX = LAUNCH_TOWER.x - LAUNCH_TOWER.width / 2;
    const towerTop = LAUNCH_TOWER.y - LAUNCH_TOWER.height - cameraY;
    const towerBottom = LAUNCH_TOWER.y - cameraY;

    if (towerBottom < -50 || towerTop > canvasHeight + 50) return;

    // 取得玩家當前位置（預設地球）
    const loc = (typeof GameState !== 'undefined' && GameState.currentLocation) || 'earth';

    // === 地球（預設 39A 風格）===
    if (loc === 'earth' || loc === 'leo' || loc === 'polar' || loc === 'solar_satellite' || loc === 'lagrange') {
        // 塔架本體（深灰色金屬）
        ctx.fillStyle = '#3a3a50';
        ctx.fillRect(towerX, towerTop, LAUNCH_TOWER.width, LAUNCH_TOWER.height);

        // X 型斜撐
        ctx.strokeStyle = '#5a5a70';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(towerX, towerTop);
        ctx.lineTo(towerX + LAUNCH_TOWER.width, towerTop + LAUNCH_TOWER.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(towerX + LAUNCH_TOWER.width, towerTop);
        ctx.lineTo(towerX, towerTop + LAUNCH_TOWER.height);
        ctx.stroke();

        // 4 層水平平台
        const numPlatforms = 4;
        for (let i = 0; i < numPlatforms; i++) {
            const py = towerTop + (LAUNCH_TOWER.height / numPlatforms) * (i + 0.5);
            ctx.fillStyle = '#4a4a65';
            ctx.fillRect(towerX - 30, py - 4, LAUNCH_TOWER.width + 60, 8);
            ctx.strokeStyle = '#5a5a78';
            ctx.lineWidth = 1;
            for (let j = 0; j < 8; j++) {
                const px = towerX - 30 + j * ((LAUNCH_TOWER.width + 60) / 8);
                ctx.beginPath();
                ctx.moveTo(px, py - 4);
                ctx.lineTo(px, py + 4);
                ctx.stroke();
            }
        }

        // 爬梯軌道
        ctx.strokeStyle = '#6a6a85';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(towerX + 3, towerTop);
        ctx.lineTo(towerX + 3, towerBottom);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(towerX + LAUNCH_TOWER.width - 3, towerTop);
        ctx.lineTo(towerX + LAUNCH_TOWER.width - 3, towerBottom);
        ctx.stroke();

        // 頂部服務臂
        const armY = towerTop + 20;
        ctx.fillStyle = '#5a5a70';
        ctx.fillRect(towerX - 40, armY, LAUNCH_TOWER.width + 80, 10);
        ctx.fillStyle = '#707088';
        ctx.beginPath();
        ctx.arc(towerX - 40, armY + 5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(towerX + LAUNCH_TOWER.width + 40, armY + 5, 5, 0, Math.PI * 2);
        ctx.fill();

        // 警示燈
        const blink = Math.sin(Date.now() * 0.005) > 0;
        ctx.fillStyle = blink ? '#ff3344' : '#661122';
        ctx.beginPath();
        ctx.arc(LAUNCH_TOWER.x, towerTop + 5, 5, 0, Math.PI * 2);
        ctx.fill();
        if (blink) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            const glowR = ctx.createRadialGradient(LAUNCH_TOWER.x, towerTop + 5, 0, LAUNCH_TOWER.x, towerTop + 5, 20);
            glowR.addColorStop(0, '#ff3344');
            glowR.addColorStop(1, 'rgba(255,50,68,0)');
            ctx.fillStyle = glowR;
            ctx.beginPath();
            ctx.arc(LAUNCH_TOWER.x, towerTop + 5, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 地面基座
        ctx.fillStyle = '#2a2a40';
        ctx.fillRect(LANDING_PAD.x - 80, towerBottom - 8, 160, 12);
        ctx.fillStyle = '#3a3a55';
        ctx.fillRect(LANDING_PAD.x - 75, towerBottom - 5, 150, 6);
        ctx.fillStyle = '#1a1a30';
        ctx.fillRect(LANDING_PAD.x - 40, towerBottom + 4, 80, 15);
    }
    // === 月球（輕量鋁合金支架 + 月岩基座）===
    else if (loc === 'moon' || loc === 'gateway') {
        // 銀白色鋁合金塔架
        ctx.fillStyle = '#b8b8c8';
        ctx.fillRect(towerX, towerTop, LAUNCH_TOWER.width, LAUNCH_TOWER.height);

        // 細 X 型斜撐
        ctx.strokeStyle = '#d8d8e8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(towerX, towerTop);
        ctx.lineTo(towerX + LAUNCH_TOWER.width, towerTop + LAUNCH_TOWER.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(towerX + LAUNCH_TOWER.width, towerTop);
        ctx.lineTo(towerX, towerTop + LAUNCH_TOWER.height);
        ctx.stroke();

        // 3 層精簡平台
        const numPlatforms = 3;
        for (let i = 0; i < numPlatforms; i++) {
            const py = towerTop + (LAUNCH_TOWER.height / numPlatforms) * (i + 0.5);
            ctx.fillStyle = '#c8c8d8';
            ctx.fillRect(towerX - 20, py - 3, LAUNCH_TOWER.width + 40, 6);
        }

        // 月岩基座（灰色岩石）
        ctx.fillStyle = '#6a6a78';
        ctx.beginPath();
        ctx.moveTo(LANDING_PAD.x - 90, towerBottom - 4);
        ctx.lineTo(LANDING_PAD.x - 75, towerBottom - 18);
        ctx.lineTo(LANDING_PAD.x - 40, towerBottom - 22);
        ctx.lineTo(LANDING_PAD.x, towerBottom - 25);
        ctx.lineTo(LANDING_PAD.x + 40, towerBottom - 22);
        ctx.lineTo(LANDING_PAD.x + 75, towerBottom - 18);
        ctx.lineTo(LANDING_PAD.x + 90, towerBottom - 4);
        ctx.closePath();
        ctx.fill();
        // 岩石陰影
        ctx.fillStyle = '#4a4a58';
        ctx.beginPath();
        ctx.moveTo(LANDING_PAD.x - 60, towerBottom - 8);
        ctx.lineTo(LANDING_PAD.x - 30, towerBottom - 18);
        ctx.lineTo(LANDING_PAD.x + 20, towerBottom - 16);
        ctx.lineTo(LANDING_PAD.x + 50, towerBottom - 10);
        ctx.closePath();
        ctx.fill();

        // 小型警示燈（藍色，因為月球沒有空氣折射）
        const blink = Math.sin(Date.now() * 0.005) > 0;
        ctx.fillStyle = blink ? '#44aaff' : '#224466';
        ctx.beginPath();
        ctx.arc(LAUNCH_TOWER.x, towerTop + 5, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    // === 火星（紅色隔熱金屬 + 圓頂觀察艙）===
    else if (loc === 'mars' || loc === 'phobos' || loc === 'venus' || loc === 'mercury') {
        // 紅色金屬塔架
        ctx.fillStyle = '#8a3a30';
        ctx.fillRect(towerX, towerTop, LAUNCH_TOWER.width, LAUNCH_TOWER.height);

        // 暗紅色 X 型斜撐
        ctx.strokeStyle = '#aa5544';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(towerX, towerTop);
        ctx.lineTo(towerX + LAUNCH_TOWER.width, towerTop + LAUNCH_TOWER.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(towerX + LAUNCH_TOWER.width, towerTop);
        ctx.lineTo(towerX, towerTop + LAUNCH_TOWER.height);
        ctx.stroke();

        // 3 層平台
        const numPlatforms = 3;
        for (let i = 0; i < numPlatforms; i++) {
            const py = towerTop + (LAUNCH_TOWER.height / numPlatforms) * (i + 0.5);
            ctx.fillStyle = '#a04840';
            ctx.fillRect(towerX - 25, py - 4, LAUNCH_TOWER.width + 50, 8);
        }

        // 圓頂觀察艙（頂部）
        const domeY = towerTop + 12;
        ctx.fillStyle = '#cc6655';
        ctx.beginPath();
        ctx.arc(LAUNCH_TOWER.x, domeY, 18, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#dd7766';
        ctx.beginPath();
        ctx.arc(LAUNCH_TOWER.x - 6, domeY - 4, 6, 0, Math.PI * 2);
        ctx.fill();

        // 火星地表基座（紅色岩石）
        ctx.fillStyle = '#6a2a20';
        ctx.fillRect(LANDING_PAD.x - 85, towerBottom - 8, 170, 12);
        ctx.fillStyle = '#8a3a30';
        ctx.fillRect(LANDING_PAD.x - 80, towerBottom - 5, 160, 6);

        // 警示燈（橘紅）
        const blink = Math.sin(Date.now() * 0.005) > 0;
        ctx.fillStyle = blink ? '#ff8844' : '#883322';
        ctx.beginPath();
        ctx.arc(LAUNCH_TOWER.x, domeY - 8, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    // === 通用太空站（精簡發射架）===
    else {
        // 太空站精簡塔架（較矮、輕量）
        const shortHeight = LAUNCH_TOWER.height * 0.5;
        const shortTop = towerBottom - shortHeight;

        ctx.fillStyle = '#5588aa';
        ctx.fillRect(towerX, shortTop, LAUNCH_TOWER.width, shortHeight);

        // 細 X 型斜撐
        ctx.strokeStyle = '#77aacc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(towerX, shortTop);
        ctx.lineTo(towerX + LAUNCH_TOWER.width, shortTop + shortHeight);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(towerX + LAUNCH_TOWER.width, shortTop);
        ctx.lineTo(towerX, shortTop + shortHeight);
        ctx.stroke();

        // 2 層精簡平台
        for (let i = 0; i < 2; i++) {
            const py = shortTop + (shortHeight / 2) * (i + 0.5);
            ctx.fillStyle = '#6699bb';
            ctx.fillRect(towerX - 15, py - 3, LAUNCH_TOWER.width + 30, 6);
        }

        // 太空站金屬甲板基座
        ctx.fillStyle = '#446688';
        ctx.fillRect(LANDING_PAD.x - 70, towerBottom - 6, 140, 10);
        ctx.fillStyle = '#5588aa';
        ctx.fillRect(LANDING_PAD.x - 65, towerBottom - 3, 130, 5);

        // 小型綠色警示燈
        const blink = Math.sin(Date.now() * 0.005) > 0;
        ctx.fillStyle = blink ? '#44ff88' : '#226644';
        ctx.beginPath();
        ctx.arc(LAUNCH_TOWER.x, shortTop + 5, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // === 位置標籤（每個塔都畫）===
    // 取得對應的圖示與文字
    const locInfo = {
        earth:           { icon: '🌍', name: '地球 KSC 39A',          color: '#88ddff' },
        leo:             { icon: '🛰', name: '近地軌道站',            color: '#88ddff' },
        polar:           { icon: '🧊', name: '極地觀測站',            color: '#aaddff' },
        solar_satellite: { icon: '☀️', name: '太陽能衛星矩陣',         color: '#ffcc00' },
        gateway:         { icon: '🌙', name: '月球門戶 Gateway',       color: '#aaddff' },
        moon:            { icon: '🌕', name: '月球前哨站',            color: '#ffaa00' },
        lagrange:        { icon: '⚖️', name: '拉格朗日點站',           color: '#ff88cc' },
        comet:           { icon: '☄️', name: '哈雷彗星追蹤站',         color: '#aaeeff' },
        phobos:          { icon: '🛰', name: '火衛一中繼站',           color: '#cc6644' },
        mars:            { icon: '🔴', name: '火星基地',              color: '#ff4466' },
        asteroid:        { icon: '☄️', name: '小行星採礦站',           color: '#aa8866' },
        ceres:           { icon: '⚫', name: '穀神星殖民地',           color: '#aaaaaa' },
        venus:           { icon: '♀️', name: '金星軌道研究站',         color: '#ffcc88' },
        mercury:         { icon: '☿️', name: '水星前哨站',             color: '#bbbbbb' },
        europa:          { icon: '🧊', name: '歐羅巴冰下基地',         color: '#aaddff' },
        titan:           { icon: '🌫', name: '土衛六泰坦基地',         color: '#cc9944' },
        enceladus:       { icon: '💧', name: '土衛二噴泉觀測站',       color: '#88ccff' },
        saturn_ring:     { icon: '🪐', name: '土星環採礦站',           color: '#ffddaa' },
        jupiter:         { icon: '♃', name: '木星軌道基地',           color: '#ddaa66' },
        kuiper_belt:     { icon: '🌌', name: '古柏帶探測點',           color: '#9966ff' },
        pluto:           { icon: '♇', name: '冥王星探測站',           color: '#ccaa88' },
        neptune:         { icon: '♆', name: '海王星深空基地',         color: '#5577ff' }
    };
    const info = locInfo[loc] || { icon: '🚀', name: '太空站', color: '#88ddff' };

    // 標籤背景框
    const labelText = `${info.icon} ${info.name}`;
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    const textW = ctx.measureText(labelText).width;
    const labelX = LANDING_PAD.x + 100;
    const labelY = towerTop - 8;

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(labelX - 6, labelY - 16, textW + 12, 22);
    ctx.strokeStyle = info.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(labelX - 6, labelY - 16, textW + 12, 22);

    ctx.fillStyle = info.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, labelX, labelY - 5);
}

/**
 * 繪製真實著陸平台（H 標記 + 排焰槽 + 夜間照明）
 */
function drawLandingPad() {
    const padX = LANDING_PAD.x - LANDING_PAD.width / 2;
    const padY = LANDING_PAD.y - cameraY;

    if (padY < -50 || padY > canvasHeight + 50) return;

    // v3.7.5 優先使用真實發射台照片（NASA SpaceX SLC-40 發射台景觀）
    const launchImg = planetImages['launchpad'];
    if (launchImg && launchImg.complete && launchImg.naturalWidth > 0) {
        const targetW = LANDING_PAD.width * 1.5;  // 比 H 標記略寬
        const targetH = targetW * (launchImg.naturalHeight / launchImg.naturalWidth);
        const imgX = LANDING_PAD.x - targetW / 2;
        const imgY = padY - targetH;
        ctx.drawImage(launchImg, imgX, imgY, targetW, targetH);
    } else {
        // Fallback：混凝土基座
        ctx.fillStyle = '#2a2a40';
        ctx.fillRect(padX - 20, padY, LANDING_PAD.width + 40, LANDING_PAD.height + 5);

        // 排焰/散熱槽格柵
        ctx.fillStyle = '#1a1a30';
        ctx.fillRect(padX - 10, padY, LANDING_PAD.width + 20, 8);
        ctx.strokeStyle = '#3a3a55';
        ctx.lineWidth = 1;
        for (let i = 0; i < 16; i++) {
            ctx.beginPath();
            ctx.moveTo(padX - 10 + i * 10, padY);
            ctx.lineTo(padX - 10 + i * 10, padY + 8);
            ctx.stroke();
        }

        // 著陸墊表面（深灰）
        ctx.fillStyle = '#3a3a55';
        ctx.fillRect(padX, padY + 8, LANDING_PAD.width, 10);
    }

    // H 白色外框
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(LANDING_PAD.x - 55, padY + 9, 110, 2);
    ctx.fillRect(LANDING_PAD.x - 55, padY + 16, 110, 2);
    ctx.fillRect(LANDING_PAD.x - 5, padY + 9, 4, 9);  // H 直桿

    // H 標記（青色發光）
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('H', LANDING_PAD.x, padY + 30);

    // H 標記微光
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('H', LANDING_PAD.x, padY + 30);
    ctx.restore();

    // 四角導引燈（藍色）
    const cornerLights = [
        [padX + 10, padY + 10],
        [padX + LANDING_PAD.width - 10, padY + 10],
        [padX + 10, padY + 15],
        [padX + LANDING_PAD.width - 10, padY + 15]
    ];
    ctx.fillStyle = '#00aaff';
    cornerLights.forEach(([lx, ly]) => {
        ctx.beginPath();
        ctx.arc(lx, ly, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    // 安全進場引導錐（從天而降的虛線錐）
    drawApproachGuide(padX, padY);
}

/**
 * 安全進場引導（虛線錐狀）
 */
function drawApproachGuide(padX, padY) {
    const guideTop = -100; // 從螢幕頂部開始
    const guideHeight = canvasHeight;
    const cx = LANDING_PAD.x;
    const guideWidth = LANDING_PAD.width + 100; // 略寬於平台

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);

    // 左引導線
    ctx.beginPath();
    ctx.moveTo(cx - guideWidth / 2, guideTop);
    ctx.lineTo(cx - LANDING_PAD.width / 2 - 5, padY);
    ctx.stroke();

    // 右引導線
    ctx.beginPath();
    ctx.moveTo(cx + guideWidth / 2, guideTop);
    ctx.lineTo(cx + LANDING_PAD.width / 2 + 5, padY);
    ctx.stroke();

    // 中線
    ctx.beginPath();
    ctx.moveTo(cx, guideTop);
    ctx.lineTo(cx, padY);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.restore();

    // 中央「SAFE ZONE」標籤
    ctx.fillStyle = 'rgba(0, 255, 136, 0.4)';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('▼ 安全進場區 ▼', cx, padY - 60);
}

// ================================================
// 目標繪製系統（依任務顯示對應太空站/天體）
// ================================================
function drawDestination() {
    if (!GameState.currentMission) {
        drawFreeFlightHint();
        return;
    }

    const station = GameState.currentMission.station;
    const targetWorldY = station.targetAltitude;
    const screenY = targetWorldY - cameraY;

    // 太遠或太近就不畫（但要確保目標指示器始終可見）
    if (screenY > canvasHeight + 1000) return;

    // 繪製天體背景（火星、月球等大目標）
    drawCelestialBody(station, targetWorldY);

    // 繪製太空站本體
    drawStationByType(station, targetWorldY);

    // 目標標示線（從火箭到目標的虛線）
    drawTargetIndicator(station, targetWorldY);
}

function drawFreeFlightHint() {
    // 自由飛行：不需額外繪製（地球由 drawEarth 處理，pad 由 drawLandingPad 處理）
}

/**
 * 繪製天體背景（行星、月球等）
 * 可選參數 opts：{ xOffset, yOffset, sizeScale, omitLabel }
 *   - xOffset/yOffset：相對於 cx 的世界座標偏移（衛星擺動用）
 *   - sizeScale：縮放倍率（中途天體用較小尺寸）
 *   - omitLabel：不繪製底部標籤（避免與太空站標籤重疊）
 */
function drawCelestialBody(station, worldY, opts = {}) {
    const xOffset = opts.xOffset || 0;
    const yOffset = opts.yOffset || 0;
    const sizeScale = opts.sizeScale || 1;
    const omitLabel = opts.omitLabel || false;
    const screenY = worldY - cameraY;
    const cx = WORLD_WIDTH / 2 + xOffset;
    const size = (station.size || 1) * 100 * sizeScale;

    if (sizeScale !== 1 || xOffset !== 0 || yOffset !== 0) {
        ctx.save();
        ctx.translate(xOffset, yOffset);
        drawCelestialBodyInner(station, worldY, screenY, cx, size, omitLabel);
        ctx.restore();
    } else {
        drawCelestialBodyInner(station, worldY, screenY, cx, size, omitLabel);
    }
}

function drawCelestialBodyInner(station, worldY, screenY, cx, size, omitLabel) {
    // v3.4 天體照片對照表（type → { 照片 key, 標籤 }）
    // 優先使用真實照片渲染，缺照片時 fallback 至 switch 程序繪製
    const CELESTIAL_PHOTO = {
        'moon_base':       { key: 'moon',      label: '🌙 月球基地' },
        'mars_base':       { key: 'mars',      label: '🔴 火星基地' },
        'venus_base':      { key: 'venus',     label: '🌼 金星基地' },
        'mercury_base':    { key: 'mercury',   label: '☿ 水星基地' },
        'europa_base':     { key: 'europa',    label: '🧊 歐羅巴'   },
        'jupiter_station': { key: 'jupiter',   label: '🪐 木星'     },
        'saturn_station':  { key: 'saturn',    label: '🪐 土星'     },
        'neptune_station': { key: 'neptune',   label: '🔵 海王星基地' },
        'pluto_station':   { key: 'pluto',     label: '🪐 冥王星基地' },
        'titan_base':      { key: 'titan',     label: '🌑 土衛六基地' },
        'enceladus_station': { key: 'enceladus', label: '🧊 土衛二' },
        'phobos_station':  { key: 'phobos',    label: '🪨 火衛一'   },
        'ceres_station':   { key: 'ceres',     label: '⛏️ 穀神星礦區' }
    };
    const photoEntry = CELESTIAL_PHOTO[station.type];
    if (photoEntry) {
        const img = planetImages[photoEntry.key];
        if (img && img.complete && img.naturalWidth > 0) {
            // 統一照片繪製：圓形剪裁 + 微光
            // v3.7.2 土星特殊處理：橢圓 clip 容納光環（比例匹配圖片 968:696）
            const isSaturn = photoEntry.key === 'saturn';
            const radius = size;
            // 土星橢圓：rx 1.4, ry 1.0（寬高比 1.4 匹配圖片）
            const saturnRx = radius * 1.4;
            const saturnRy = radius;
            ctx.save();
            ctx.beginPath();
            if (isSaturn) {
                ctx.ellipse(cx, screenY, saturnRx, saturnRy, 0, 0, Math.PI * 2);
            } else {
                ctx.arc(cx, screenY, radius, 0, Math.PI * 2);
            }
            ctx.clip();
            if (isSaturn) {
                ctx.drawImage(img, cx - saturnRx, screenY - saturnRy, saturnRx * 2, saturnRy * 2);
            } else {
                ctx.drawImage(img, cx - radius, screenY - radius, radius * 2, radius * 2);
            }
            ctx.restore();
            // 大氣微光（依體型）
            if (size > 30) {
                ctx.save();
                ctx.globalAlpha = 0.18;
                const glow = ctx.createRadialGradient(cx, screenY, radius, cx, screenY, radius + radius * 0.4);
                glow.addColorStop(0, 'rgba(150,200,255,0.4)');
                glow.addColorStop(1, 'rgba(150,200,255,0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(cx, screenY, radius + radius * 0.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            // 標籤
            if (!omitLabel) {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(photoEntry.label, cx, screenY + radius + 15);
            }
            return;
        }
    }
    switch (station.type) {
        case 'moon_base':
            // 月球（真實衛星紋理 + 縮放）
            drawMoon(worldY, (station.size || 1) * 1.2);
            // 標籤
            if (!omitLabel) {
                ctx.fillStyle = '#ffee88';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('🌙 月球基地', cx, screenY + (station.size || 1) * 240 + 20);
            }
            break;
        case 'mars_base':
            // 火星（真實衛星紋理 + 縮放）
            drawMars(worldY, (station.size || 1) * 1.1);
            // 標籤
            if (!omitLabel) {
                ctx.fillStyle = '#ff8866';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('🔴 火星基地', cx, screenY + (station.size || 1) * 200 + 20);
            }
            break;
        case 'europa_base':
            // 歐羅巴（冰藍色）
            const europaGrad = ctx.createRadialGradient(cx - 30, screenY - 30, 20, cx + 150, screenY, size);
            europaGrad.addColorStop(0, '#ccddee');
            europaGrad.addColorStop(0.7, '#88aacc');
            europaGrad.addColorStop(1, '#446688');
            ctx.fillStyle = europaGrad;
            ctx.beginPath();
            ctx.arc(cx + 150, screenY, size, 0, Math.PI * 2);
            ctx.fill();
            // 冰裂紋
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
                ctx.beginPath();
                ctx.moveTo(cx + 150, screenY);
                const angle = (i / 6) * Math.PI * 2;
                ctx.lineTo(cx + 150 + Math.cos(angle) * size * 0.8, screenY + Math.sin(angle) * size * 0.8);
                ctx.stroke();
            }
            ctx.fillStyle = '#fff';
            if (!omitLabel) ctx.fillText('🧊 歐羅巴', cx + 150, screenY + size + 15);
            break;
        case 'jupiter_station':
            // 木星（巨大條紋）
            const jupGrad = ctx.createRadialGradient(cx - 50, screenY - 30, 30, cx + 200, screenY, size * 1.4);
            jupGrad.addColorStop(0, '#ffcc88');
            jupGrad.addColorStop(0.6, '#cc8855');
            jupGrad.addColorStop(1, '#664422');
            ctx.fillStyle = jupGrad;
            ctx.beginPath();
            ctx.arc(cx + 200, screenY, size * 1.4, 0, Math.PI * 2);
            ctx.fill();
            // 條紋
            ctx.fillStyle = 'rgba(100,60,30,0.4)';
            for (let i = 0; i < 5; i++) {
                const y = screenY - size * 1.2 + (i + 1) * (size * 2.4 / 6);
                ctx.fillRect(cx + 200 - size * 1.4, y, size * 2.8, 8);
            }
            // 大紅斑
            ctx.fillStyle = 'rgba(200,100,50,0.7)';
            ctx.beginPath();
            ctx.ellipse(cx + 200 + size * 0.5, screenY + size * 0.3, size * 0.2, size * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            if (!omitLabel) ctx.fillText('🪐 木星', cx + 200, screenY + size * 1.4 + 15);
            break;
        case 'saturn_station':
            // 土星（環）
            // 環
            ctx.strokeStyle = '#ddaa77';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.ellipse(cx + 150, screenY, size * 1.5, size * 0.3, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#bb8855';
            ctx.beginPath();
            ctx.ellipse(cx + 150, screenY, size * 1.7, size * 0.35, 0, 0, Math.PI * 2);
            ctx.stroke();
            // 行星本體
            const satGrad = ctx.createRadialGradient(cx + 130, screenY - 20, 20, cx + 150, screenY, size);
            satGrad.addColorStop(0, '#ffeebb');
            satGrad.addColorStop(1, '#aa8855');
            ctx.fillStyle = satGrad;
            ctx.beginPath();
            ctx.arc(cx + 150, screenY, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            if (!omitLabel) ctx.fillText('🪐 土星', cx + 150, screenY + size + 25);
            break;
        case 'asteroid':
            // 小行星（不規則岩石）
            ctx.fillStyle = '#886644';
            ctx.beginPath();
            ctx.moveTo(cx + 100, screenY - 30);
            ctx.lineTo(cx + 130, screenY - 50);
            ctx.lineTo(cx + 160, screenY - 20);
            ctx.lineTo(cx + 170, screenY + 20);
            ctx.lineTo(cx + 150, screenY + 50);
            ctx.lineTo(cx + 110, screenY + 40);
            ctx.lineTo(cx + 90, screenY + 10);
            ctx.closePath();
            ctx.fill();
            // 坑洞
            ctx.fillStyle = '#553322';
            ctx.beginPath();
            ctx.arc(cx + 130, screenY - 10, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + 145, screenY + 20, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            if (!omitLabel) ctx.fillText('☄️ 小行星', cx + 130, screenY + 70);
            break;
        case 'comet':
            // 彗星（核心 + 尾巴）
            // 尾巴（漸層拖曳）
            const tailLen = 200;
            const tailGrad = ctx.createLinearGradient(cx, screenY, cx - tailLen, screenY - 30);
            tailGrad.addColorStop(0, 'rgba(170,238,255,0.7)');
            tailGrad.addColorStop(0.5, 'rgba(170,238,255,0.3)');
            tailGrad.addColorStop(1, 'rgba(170,238,255,0)');
            ctx.fillStyle = tailGrad;
            ctx.beginPath();
            ctx.moveTo(cx, screenY);
            ctx.lineTo(cx - tailLen, screenY - 40);
            ctx.lineTo(cx - tailLen, screenY + 40);
            ctx.closePath();
            ctx.fill();
            // 核心
            ctx.fillStyle = '#ddffff';
            ctx.beginPath();
            ctx.arc(cx, screenY, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx, screenY, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            if (!omitLabel) ctx.fillText('☄️ 彗星', cx, screenY + 40);
            break;
        case 'venus_base':
            // 金星基地（厚重雲層行星）
            drawVenus(worldY, (station.size || 1) * 1.0);
            ctx.fillStyle = '#ffcc88';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            if (!omitLabel) ctx.fillText('🌼 金星基地', cx, screenY + 180);
            break;
        case 'mercury_base':
            // 水星基地（隕石坑行星）
            drawMercury(worldY, (station.size || 1) * 1.0);
            ctx.fillStyle = '#cccccc';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            if (!omitLabel) ctx.fillText('☿ 水星基地', cx, screenY + 160);
            break;
        case 'neptune_station':
            // 海王星軌道站（冰巨星）
            drawNeptune(worldY, (station.size || 1) * 1.5);
            ctx.fillStyle = '#88aaff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            if (!omitLabel) ctx.fillText('🔵 海王星基地', cx, screenY + 350);
            break;
        case 'pluto_station':
            // 冥王星基地（冰矮星）
            drawPluto(worldY, (station.size || 1) * 1.0);
            ctx.fillStyle = '#ccaa88';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            if (!omitLabel) ctx.fillText('🪐 冥王星基地', cx, screenY + 120);
            break;
        case 'ceres_station':
            // 穀神星採礦站（小行星帶）
            drawCeres(worldY, (station.size || 1) * 1.0);
            ctx.fillStyle = '#aaaaaa';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            if (!omitLabel) ctx.fillText('⛏️ 穀神星礦區', cx, screenY + 140);
            break;
    }
}

/**
 * 依類型繪製太空站
 */
function drawStationByType(station, worldY) {
    const screenY = worldY - cameraY;
    if (screenY < -200 || screenY > canvasHeight + 200) return;

    const cx = WORLD_WIDTH / 2;
    const size = station.size || 1;
    const color = station.color || '#00d4ff';

    ctx.save();
    ctx.translate(cx, screenY);

    switch (station.type) {
        case 'space_station':
            // 太空站（中心模組 + 太陽能板）
            ctx.fillStyle = '#d0d0d0';
            ctx.fillRect(-15 * size, -10 * size, 30 * size, 20 * size);
            // 窗戶
            ctx.fillStyle = color;
            ctx.fillRect(-10 * size, -6 * size, 20 * size, 12 * size);
            // 太陽能板
            ctx.fillStyle = '#1a3a6e';
            ctx.fillRect(-60 * size, -12 * size, 40 * size, 24 * size);
            ctx.fillRect(20 * size, -12 * size, 40 * size, 24 * size);
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.5;
            ctx.strokeRect(-60 * size, -12 * size, 40 * size, 24 * size);
            ctx.strokeRect(20 * size, -12 * size, 40 * size, 24 * size);
            // 桁架
            ctx.fillStyle = '#888';
            ctx.fillRect(-20 * size, -2 * size, 40 * size, 4 * size);
            break;
        case 'solar_array':
            // 太陽能陣列（多塊面板）
            ctx.fillStyle = '#1a3a6e';
            for (let i = -2; i <= 2; i++) {
                ctx.fillRect(i * 25 * size - 12 * size, -15 * size, 24 * size, 30 * size);
                ctx.strokeStyle = color;
                ctx.strokeRect(i * 25 * size - 12 * size, -15 * size, 24 * size, 30 * size);
            }
            // 中心連接
            ctx.fillStyle = '#888';
            ctx.fillRect(-50 * size, -3 * size, 100 * size, 6 * size);
            break;
        case 'moon_base':
        case 'mars_base':
        case 'europa_base':
        case 'phobos_station':
            // 行星基地（圓頂 + 太陽能板 + 著陸墊）
            // 圓頂
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, 25 * size, Math.PI, 0);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
            // 透明圓頂
            ctx.fillStyle = `rgba(100,200,255,0.3)`;
            ctx.beginPath();
            ctx.arc(0, -2 * size, 20 * size, Math.PI, 0);
            ctx.fill();
            // 太陽能板
            ctx.fillStyle = '#1a3a6e';
            ctx.fillRect(-50 * size, 0, 20 * size, 15 * size);
            ctx.fillRect(30 * size, 0, 20 * size, 15 * size);
            // 著陸墊
            ctx.fillStyle = '#888';
            ctx.fillRect(-15 * size, 18 * size, 30 * size, 4 * size);
            ctx.fillStyle = '#00ff88';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('H', 0, 22 * size);
            break;
        case 'titan_base':
            // 土衛六基地（橙褐色甲烷湖 + 天然氣）
            drawTitan(worldY, (station.size || 1) * 1.5);
            ctx.fillStyle = '#cc9944';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🌑 土衛六基地', cx, screenY + 250);
            break;
        case 'enceladus_station':
            // 土衛二噴泉站（冰噴射）
            drawEnceladus(worldY, (station.size || 1) * 1.2);
            ctx.fillStyle = '#88ccff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('💧 土衛二觀測站', cx, screenY + 200);
            break;
        case 'kuiper_station':
            // 古柏帶站（冰封岩石 + 星光）
            drawKuiper(worldY, (station.size || 1) * 1.8);
            ctx.fillStyle = '#9966ff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('⭐ 古柏帶探測站', cx, screenY + 280);
            break;
        case 'lagrange_point':
            // 拉格朗日點（特殊標記 + 太空站）
            // 暈環
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(0, 0, 40 * size, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            // 太空站
            ctx.fillStyle = '#d0d0d0';
            ctx.fillRect(-10 * size, -10 * size, 20 * size, 20 * size);
            ctx.fillStyle = color;
            ctx.fillRect(-6 * size, -6 * size, 12 * size, 12 * size);
            // 標籤
            ctx.fillStyle = color;
            ctx.font = '8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('L2', 0, 35 * size);
            break;
        case 'asteroid':
            // 小行星採礦站（與天體一同繪製）
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(-8 * size, -8 * size, 16 * size, 16 * size);
            ctx.fillStyle = '#fff';
            ctx.font = '8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('M', 0, 3 * size);
            break;
        case 'comet':
            // 採樣標記
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, 30 * size, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            break;
        case 'jupiter_station':
        case 'saturn_station':
            // v3.7.7 完全不繪製太空站結構（避免擋住天體照片）
            // 大型天體（木星/土星）由 photoEntry 渲染，結構會破壞真實感
            break;
    }
    ctx.restore();

    // 目標標題
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(station.name, cx, screenY - 35 * size);

    // 高度標籤
    ctx.fillStyle = color;
    ctx.font = '9px Arial';
    const altText = station.altitude > 0 ? `${(station.altitude / 1000).toFixed(0)}k km` : '深空';
    ctx.fillText(altText, cx, screenY - 22 * size);
}

/**
 * 目標指示線（從火箭畫到目標的虛線 + 距離）
 */
function drawTargetIndicator(station, worldY) {
    if (!GameState.currentMission) return;
    const rocketY = rocket.y - cameraY;
    const targetY = worldY - cameraY;
    if (targetY < -50 || targetY > canvasHeight + 50) return;

    const cx = WORLD_WIDTH / 2;
    const color = station.color || '#00d4ff';

    // 虛線
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, rocketY);
    ctx.lineTo(cx, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 目標圓圈
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, targetY, 25, 0, Math.PI * 2);
    ctx.stroke();

    // 已達標記
    if (rocket.y <= worldY) {
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('✓ 已達標', cx + 50, targetY);
    }
}

// ================================================
// 火箭繪製
// ================================================
function drawRocket() {
    if (rocket.phase === 'EXPLODED') return;

    const screenX = rocket.x;
    const screenY = rocket.y - cameraY;

    if (screenY < -100 || screenY > canvasHeight + 100) return;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(rocket.angle);

    const w = rocket.width;
    const h = rocket.height;

    // 陰影（橢圓，在箭體下方）
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(3, h / 2 + 5, w / 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 取得當前火箭圖片
    const img = getCurrentRocketImage();
    let drawW = w, drawH = h;
    if (img && img.complete && img.naturalWidth > 0) {
        // v3.6 真實火箭照片（PNG 600x1200）
        // 火箭物理尺寸 24x70，計算縮放比例
        // 以寬度為基準，確保圖片符合 rocket.width
        // v3.6 優化：3x → 5x（誇張放大，飛行時更壯觀）
        const scale = (w * 5) / img.naturalWidth; // 5x 讓照片版火箭超顯眼
        drawW = img.naturalWidth * scale;
        drawH = img.naturalHeight * scale;
        // 繪製在 (-drawW/2, -drawH/2) 為左上角
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
        // 圖片未載入完成，使用後備形狀
        drawFallbackRocket(w, h);
    }

    // 熱量效果（覆蓋在圖片上）
    if (rocket.heat > 0) {
        const heatRatio = Math.min(rocket.heat / rocket.maxHeat, 1);
        ctx.fillStyle = `rgba(255, ${Math.round(100 * (1 - heatRatio))}, 0, ${0.2 + heatRatio * 0.5})`;
        ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
    }

    // 損傷效果
    if (rocket.hull < rocket.maxHull) {
        const damageRatio = 1 - rocket.hull / rocket.maxHull;
        ctx.fillStyle = `rgba(0, 0, 0, ${damageRatio * 0.5})`;
        const seed = Math.floor(rocket.y);
        for (let i = 0; i < 5; i++) {
            const dx = ((seed * (i + 1) * 7) % drawW) - drawW / 2;
            const dy = ((seed * (i + 1) * 13) % drawH) - drawH / 2;
            ctx.beginPath();
            ctx.arc(dx, dy, 2 + damageRatio * 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();

    // 引擎火焰（從箭體底部）
    if (rocket.thrusting && rocket.fuel > 0 && rocket.phase !== 'LANDED' && rocket.phase !== 'DOCKED') {
        const flameX = screenX + Math.sin(rocket.angle) * (rocket.height / 2 + 8);
        const flameY = screenY + Math.cos(rocket.angle) * (rocket.height / 2 + 8);
        emitFlameParticles(flameX, flameY, rocket.angle, 1.8);
    }

    // 側向噴射
    if (rocket.thrustingSide !== 0 && rocket.fuel > 0) {
        const sideX = screenX - rocket.thrustingSide * rocket.width;
        const sideY = screenY;
        for (let i = 0; i < 2; i++) {
            particles.push(new Particle(
                sideX + (Math.random() - 0.5) * 5,
                sideY + (Math.random() - 0.5) * 20,
                -rocket.thrustingSide * (2 + Math.random() * 2),
                (Math.random() - 0.5) * 2,
                'flame'
            ));
        }
    }

    // 排放尾跡
    if (rocket.phase === 'ORBIT' || rocket.phase === 'DESCENDING') {
        emitExhaustParticles(screenX, screenY + rocket.height / 2);
    }
}

/**
 * 後備火箭繪製（圖片未載入時使用）
 */
function drawFallbackRocket(w, h) {
    // 箭體
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, -h / 4);
    ctx.lineTo(w / 2, h / 3);
    ctx.lineTo(-w / 2, h / 3);
    ctx.lineTo(-w / 2, -h / 4);
    ctx.closePath();
    ctx.fill();

    // 頭錐（紅色）
    ctx.fillStyle = '#ff4466';
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2 - 3, -h / 4);
    ctx.lineTo(-w / 2 + 3, -h / 4);
    ctx.closePath();
    ctx.fill();

    // SpaceX 標誌
    ctx.fillStyle = '#00aaff';
    ctx.fillRect(-w / 2 + 3, -h / 5, w - 6, 6);

    // 引擎段
    ctx.fillStyle = '#666666';
    ctx.fillRect(-w / 3, h / 3, w * 2 / 3, 10);
}

// ================================================
// 物理更新
// ================================================
function updatePhysics() {
    // 完全停止物理更新
    if (GameState.phase === 'PREP' || GameState.phase === 'SUCCESS' || GameState.phase === 'CRASH') return;
    if (rocket.phase === 'LANDED' || rocket.phase === 'EXPLODED' || rocket.phase === 'DOCKED') return;

    // v3.3 重力助推：飛越大天體時燃料效率暫時提升
    let boostFactor = 1;
    if (rocket.fuelEfficiencyBoost) {
        if (Date.now() < rocket.fuelEfficiencyBoost.expiresAt) {
            boostFactor = rocket.fuelEfficiencyBoost.factor; // 0.5 = 50% 燃料
        } else {
            rocket.fuelEfficiencyBoost = null;
        }
    }

    // 重力
    rocket.vy += PHYSICS.GRAVITY;

    // 緊急制動
    if (rocket.braking && rocket.vy > 0) {
        rocket.vy -= PHYSICS.BRAKE_FORCE;
        if (rocket.vy < 0) rocket.vy = 0;
    }

    // 主引擎
    if (rocket.thrusting && rocket.fuel > 0) {
        const thrustMultiplier = getThrustMultiplier();
        const thrust = PHYSICS.THROTTLE * thrustMultiplier;

        rocket.vx -= Math.sin(rocket.angle) * thrust;
        rocket.vy -= Math.cos(rocket.angle) * thrust;

        // 燃料消耗：外太空無重力阻力，燃料效率更高
        // 高度越高，消耗越低（最低 30% 基礎消耗）
        const altitude = GROUND_Y - rocket.y; // 世界高度
        const spaceEfficiency = 0.3 + 0.7 / (1 + altitude / 3000);
        const adjustedFuelConsumption = PHYSICS.FUEL_CONSUMPTION * spaceEfficiency * boostFactor;
        rocket.fuel -= adjustedFuelConsumption;
        if (rocket.fuel < 0) rocket.fuel = 0;
    }

    // 側向推力
    if (rocket.thrustingSide !== 0) {
        rocket.angularVelocity += rocket.thrustingSide * PHYSICS.ROTATION_SPEED;
        rocket.vx += rocket.thrustingSide * PHYSICS.SIDE_THRUST;
        // 側向推力也消耗燃料（但較少）
        const altitude = GROUND_Y - rocket.y;
        const spaceEfficiency = 0.3 + 0.7 / (1 + altitude / 3000);
        rocket.fuel -= PHYSICS.FUEL_CONSUMPTION * 0.3 * spaceEfficiency * boostFactor;
        if (rocket.fuel < 0) rocket.fuel = 0;
    }

    // 阻尼
    rocket.angularVelocity *= 0.94;
    rocket.angle += rocket.angularVelocity;
    rocket.angle = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, rocket.angle));

    // 位置更新
    rocket.x += rocket.vx;
    rocket.y += rocket.vy;

    // 熱量計算
    const speed = Math.sqrt(rocket.vx ** 2 + rocket.vy ** 2);
    if (speed > PHYSICS.HEAT_SPEED_THRESHOLD && rocket.vy > 0) {
        rocket.heat += (speed - PHYSICS.HEAT_SPEED_THRESHOLD) * PHYSICS.HEAT_RATE;
    } else {
        rocket.heat *= 0.98;
    }

    // 熱量摧毀
    if (rocket.heat >= rocket.maxHeat) {
        triggerCrash('高溫摧毀！隔熱盾失效！');
        return;
    }

    // 邊界
    rocket.x = Math.max(rocket.width, Math.min(WORLD_WIDTH - rocket.width, rocket.x));

    // 碰撞檢測
    checkCollisions();

    // 相機
    updateCamera();
}

function getThrustMultiplier() {
    const rocketData = GameState.rockets[GameState.selectedRocketIndex];
    if (!rocketData) return 1;

    const levels = [0, 15, 30, 50, 75, 100];
    const bonus = levels[rocketData.engine - 1] || 0;
    return 1 + bonus / 100;
}

function checkCollisions() {
    // 只在 FLIGHT 或 LANDING 階段檢測碰撞
    if (GameState.phase !== 'FLIGHT' && GameState.phase !== 'LANDING') return;

    // 著陸墊碰撞
    const rocketBottom = rocket.y + rocket.height / 2;

    // 著陸台
    const padLeft = LANDING_PAD.x - LANDING_PAD.width / 2;
    const padRight = LANDING_PAD.x + LANDING_PAD.width / 2;
    const padTop = LANDING_PAD.y;

    if (rocket.x >= padLeft && rocket.x <= padRight && rocketBottom >= padTop - PHYSICS.LANDING_TOLERANCE) {
        handleLanding(padTop, true);
        return;
    }

    // 地面
    if (rocketBottom >= GROUND_Y) {
        handleLanding(GROUND_Y, false);
        return;
    }

    // 任務目標對接（v3.0：抵達目標即任務完成，自動吸附）
    if (GameState.currentMission && rocket.phase !== 'DOCKED' && rocket.phase !== 'LANDED' && rocket.phase !== 'EXPLODED') {
        const station = GameState.currentMission.station;
        const targetY = station.targetAltitude;
        const yTolerance = 200;        // 放寬 y 容差
        const xTolerance = 200;        // 放寬 x 容差

        // 穿越式檢測：記錄上一幀 y，偵測跨越目標線
        if (rocket.lastY === undefined) rocket.lastY = rocket.y;
        const crossedTarget = (rocket.lastY > targetY && rocket.y <= targetY) ||
                              (rocket.lastY < targetY && rocket.y >= targetY);
        const inZone = Math.abs(rocket.x - WORLD_WIDTH / 2) < xTolerance;
        const reachedZone = (crossedTarget || Math.abs(rocket.y - targetY) < yTolerance) && inZone;

        if (reachedZone) {
            if (!rocket.targetReached) {
                rocket.targetReached = true;
                if (typeof UI !== 'undefined' && UI.toast) {
                    UI.toast(`🎯 已抵達 ${station.name}！對接中…`, 'success');
                }
            }
            // 自動吸附：吸附到太空站位置
            handleDocking(station);
            return;
        }
        rocket.lastY = rocket.y;
    }

    // v3.3 飛越中途天體偵測（火箭由下往上爬升經過 y 較小的 waypoint）
    if (GameState.currentMission?.waypoints && rocket.phase !== 'EXPLODED') {
        if (!rocket._passedWaypoints) rocket._passedWaypoints = new Set();
        if (!rocket._nearestWaypoint) rocket._nearestWaypoint = null;
        let nearest = null;
        let nearestDist = Infinity;
        for (const wp of GameState.currentMission.waypoints) {
            const distY = rocket.y - wp.y; // 火箭 y - waypoint y（火箭還在 waypoint 下方時為正）
            if (distY > -100 && distY < nearestDist) {
                nearestDist = distY;
                nearest = wp;
            }
        }
        // 穿越偵測：上一幀在 waypoint 下方，這幀已到或過了
        if (rocket.lastY !== undefined) {
            for (const wp of GameState.currentMission.waypoints) {
                if (rocket._passedWaypoints.has(wp.id)) continue;
                if (rocket.lastY > wp.y && rocket.y <= wp.y + 60) {
                    rocket._passedWaypoints.add(wp.id);
                    onWaypointPass(wp);
                }
            }
        }
        // 更新 HUD 路線指示為「目前最接近的 waypoint」
        if (nearest !== rocket._nearestWaypoint) {
            rocket._nearestWaypoint = nearest;
            if (typeof UI !== 'undefined' && UI.updateRouteIndicator) {
                UI.updateRouteIndicator(nearest, GameState.currentMission?.station?.name);
            }
        }
    }

    // 轉換為下降階段
    if (rocket.phase === 'ASCENDING' && rocket.vy > 0) {
        rocket.phase = 'DESCENDING';
    }
}

function handleLanding(surfaceY, onPad) {
    rocket.y = surfaceY - rocket.height / 2;
    rocket.vy = 0;
    rocket.vx = 0;

    const speed = Math.sqrt(rocket.vx ** 2 + rocket.vy ** 2) * 10;
    const angleDeg = Math.abs((rocket.angle * 180) / Math.PI);

    const safeSpeed = PHYSICS.MAX_SAFE_SPEED * 10;
    const safeAngle = PHYSICS.MAX_SAFE_ANGLE;

    if (speed <= safeSpeed && angleDeg <= safeAngle && onPad) {
        rocket.phase = 'LANDED';
        rocket.hull = Math.max(0, rocket.hull - speed * 2);

        // v3.0：抵達目標就完成任務。若任務未抵達目標但已返回地球，視為「飛行結束」（無任務獎勵）
        // 移除「必須 targetReached」檢查 — 自由飛行返回地球也視為成功
        StateMachine.enterSuccess({
            fuel: rocket.fuel,
            maxFuel: rocket.maxFuel,
            hull: rocket.hull,
            maxHull: rocket.maxHull
        });
    } else {
        let reason = '著陸失敗！';
        if (!onPad) reason = '偏離著陸點！';
        else if (speed > safeSpeed) reason = `速度過快！（${Math.round(speed)} > ${safeSpeed}）`;
        else if (angleDeg > safeAngle) reason = `傾斜過度！（${Math.round(angleDeg)}° > ${safeAngle}°）`;

        // 結構損傷
        rocket.hull -= (speed - safeSpeed) * 5;
        if (rocket.hull <= 0) {
            triggerCrash(reason);
        } else {
            triggerCrash(reason);
        }
    }
}

function handleDocking(station) {
    // v3.0：吸附到太空站位置
    rocket.y = station.targetAltitude;  // 鎖定到目標高度
    rocket.x = WORLD_WIDTH / 2;          // 置中對接
    rocket.vx = 0;
    rocket.vy = 0;
    rocket.angle = 0;
    rocket.phase = 'DOCKED';
    rocket.dockedStation = station;

    // 任務成功（在太空站完成任務）
    if (typeof UI !== 'undefined' && UI.toast) {
        UI.toast(`🚀 對接 ${station.name} 成功！`, 'success');
    }

    // 1.5 秒後才彈出成功面板（讓玩家看到吸附動畫）
    setTimeout(() => {
        if (typeof StateMachine !== 'undefined' && StateMachine.enterSuccess) {
            StateMachine.enterSuccess({
                fuel: rocket.fuel,
                maxFuel: rocket.maxFuel,
                hull: rocket.hull,
                maxHull: rocket.maxHull,
                docked: true,
                station: station
            });
        }
    }, 1500);
}

function triggerCrash(reason) {
    rocket.phase = 'EXPLODED';
    emitExplosionParticles(rocket.x, rocket.y);

    // 結構損傷
    rocket.hull = 0;

    StateMachine.enterCrash({
        reason: reason,
        mission: GameState.currentMission ?
            `${CONFIG.missionTypes[GameState.currentMission.type].name} - ${GameState.currentMission.station.name}` : ''
    });
}

// v3.0：相機震動（主引擎啟動時輕微抖動）
let cameraShakeX = 0;
let cameraShakeY = 0;

function updateCamera() {
    // v3.7.5 guard：若 canvasHeight/rocket.y/cameraY 非有限，跳過本幀避免 NaN 傳播
    if (!isFinite(canvasHeight) || !isFinite(rocket.y)) {
        // 等待 canvas resize 完成
        return;
    }
    if (!isFinite(cameraY)) {
        cameraY = WORLD_HEIGHT - canvasHeight;
    }
    const targetY = rocket.y - canvasHeight * 0.6;
    cameraY += (targetY - cameraY) * 0.08;
    // clamp（用 if 而非 Math.max 避免 NaN 污染）
    if (cameraY < 0) cameraY = 0;
    if (cameraY > WORLD_HEIGHT - canvasHeight) cameraY = WORLD_HEIGHT - canvasHeight;

    // 主引擎震動：根據 rocket.thrusting 屬性判斷
    let isThrusting = false;
    if (typeof window !== 'undefined' && window.keys) {
        isThrusting = window.keys.thrust || window.keys.up;
    }
    if (!isThrusting && rocket) {
        isThrusting = rocket.thrusting === true;
    }
    if (isThrusting) {
        cameraShakeX = (Math.random() - 0.5) * 3;
        cameraShakeY = (Math.random() - 0.5) * 3;
    } else {
        cameraShakeX *= 0.85;
        cameraShakeY *= 0.85;
    }
}

function applyCameraShake() {
    if (Math.abs(cameraShakeX) > 0.05 || Math.abs(cameraShakeY) > 0.05) {
        ctx.translate(cameraShakeX, cameraShakeY);
    }
}

// ================================================
// v3.3 任務中途天體渲染
// 火箭飛行時，自動顯示位於起點與終點之間的所有天體
// 衛星（Phobos, Europa, Titan, Enceladus, Moon, Gateway）會輕微軌道擺動
// ================================================
function drawAllCelestialBodies() {
    if (!GameState.currentMission || !CONFIG || !CONFIG.stationsMap) return;
    const originId = GameState.currentMission.originStation;
    const targetId = GameState.currentMission.station.id;
    const originStation = originId === 'earth' ? null : CONFIG.stationsMap[originId];
    const originY = originStation ? originStation.targetAltitude : GROUND_Y;
    const targetY = GameState.currentMission.station.targetAltitude;
    const lo = Math.min(originY, targetY);
    const hi = Math.max(originY, targetY);
    const margin = 1400; // 預先繪製範圍

    for (const s of CONFIG.stations) {
        if (s.id === originId || s.id === targetId) continue; // 起點終點另畫
        if (s.realDistance === 0) continue;
        const y = s.targetAltitude;
        if (y < lo - margin || y > hi + margin) continue;
        const screenY = y - cameraY;
        if (screenY < -400 || screenY > canvasHeight + 400) continue;

        // 衛星：相對母體擺動
        if (s.parentBody && CONFIG.stationsMap[s.parentBody]) {
            const t = Date.now() / 3000;
            const phase = (s.id.charCodeAt(0) || 1) * 0.5;
            const radius = s.orbitalRadius || 80;
            const dx = Math.cos(t + phase) * radius;
            const dy = Math.sin(t + phase) * 25;
            drawCelestialBody(s, y, { xOffset: dx, yOffset: dy, sizeScale: 0.5, omitLabel: true });
        } else {
            // 一般行星：天體用較小尺寸當背景
            drawCelestialBody(s, y, { sizeScale: 0.55, omitLabel: true });
        }
    }
}

/**
 * v3.3 飛越中途天體觸發：
 * 1. 顯示 toast「飛越 XXX！」
 * 2. 若該天體有助推資格（boostEligible），套用 5 秒燃料效率加成（-50% 燃料消耗）
 */
function onWaypointPass(wp) {
    if (typeof UI !== 'undefined') {
        if (UI.toast) UI.toast(`🌌 飛越 ${wp.name}！`, 'info', 2500);
        if (wp.boostEligible) {
            rocket.fuelEfficiencyBoost = { factor: 0.5, expiresAt: Date.now() + 5000 };
            if (UI.toast) UI.toast('✨ 重力助推！燃料效率 +50%（5 秒）', 'success', 2500);
        }
    }
}

// ================================================
// 粒子更新
// ================================================
function updateAndDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        if (!particles[i].update()) {
            particles.splice(i, 1);
        } else {
            particles[i].draw(ctx);
        }
    }
}

// ================================================
// 遊戲循環
// ================================================
let animationId = null;
let lastTime = 0;

function gameLoop(timestamp) {
    try {
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        // 根據火箭高度動態調整天空顏色（從地面到大氣層到深空）
        drawSpaceBackground();

        // v3.0：套用相機震動到世界層
        ctx.save();
        applyCameraShake();

        drawStars();
        drawStartingBody();
        drawAllCelestialBodies();
        drawDestination();
        drawGround();
        drawLaunchTower();
        drawLandingPad();

        updatePhysics();

        if (GameState.phase !== 'PREP' && UI) {
            UI.updateHUD(rocket);
        }

        drawRocket();
        updateAndDrawParticles();

        ctx.restore();
    } catch (e) {
        console.warn('Game loop error:', e.message);
    }

    animationId = requestAnimationFrame(gameLoop);
}

// ================================================
// 初始化
// ================================================
const Physics = {
    init() {
        const gameArea = document.getElementById('game-area');

        // 延遲到 DOM 完成 layout 後再初始化 canvas
        // 使用雙 rAF 確保 layout 完成
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.resizeCanvas();
                generateStars();
                preloadRocketImages();
                preloadPlanetImages();
                this.setupControls();
                this.drawInitialScene();
            });
        });

        // ResizeObserver 監聽 game-area 尺寸變化（含面板開合）
        // 用 debounce 避免過渡動畫期間連環觸發（250ms 動畫內可能觸發 20+ 次）
        if (window.ResizeObserver) {
            let resizeTimer = null;
            const ro = new ResizeObserver(() => {
                if (resizeTimer) clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    this.resizeCanvas();
                    if (GameState.phase === 'PREP') this.drawInitialScene();
                }, 150);
            });
            ro.observe(gameArea);
        }

        window.addEventListener('resize', () => setTimeout(() => this.resizeCanvas(), 50));
        window.addEventListener('orientationchange', () => setTimeout(() => this.resizeCanvas(), 100));
    },

    /**
     * 重新計算 canvas 尺寸（依 game-area 實際寬高）
     * 公開方法，可由 UI 主動呼叫（例如側邊欄收合時）
     */
    resizeCanvas() {
        const gameArea = document.getElementById('game-area');
        if (!gameArea) return;
        const canvas = document.getElementById('game-canvas');
        if (!canvas) return;

        const rect = gameArea.getBoundingClientRect();
        canvasWidth = Math.max(100, Math.floor(rect.width));
        canvasHeight = Math.max(100, Math.floor(rect.height));

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        canvas.style.width = canvasWidth + 'px';
        canvas.style.height = canvasHeight + 'px';

        // 重繪場景避免黑屏
        if (GameState && GameState.phase === 'PREP') {
            this.drawInitialScene();
        } else if (GameState && GameState.phase === 'FLIGHT' && rocket) {
            // 飛行中重置鏡頭以新尺寸重新繪製
            cameraY = Math.max(0, Math.min(rocket.y - canvasHeight / 2, WORLD_HEIGHT - canvasHeight));
        }

        console.log(`Canvas resized: ${canvasWidth}x${canvasHeight}`);
    },

    drawInitialScene() {
        // v3.7.5 guard：canvasHeight 還沒 resize 時跳過，避免 cameraY = NaN
        if (!isFinite(canvasHeight) || !isFinite(canvasWidth)) return;
        cameraY = WORLD_HEIGHT - canvasHeight;

        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        drawStars();
        drawStartingBody();
        drawAllCelestialBodies();
        drawDestination();
        drawGround();
        drawLaunchTower();
        drawLandingPad();
    },

    initRocket() {
        const rocketData = GameState.rockets[GameState.selectedRocketIndex];
        if (!rocketData) return;

        // 計算屬性（與 ui-state.js 同步，避免燃料/隔熱容量不一致）
        // 燃料容量使用共用 getFuelCapacity 函式（含升級等級 + 裝備加成）
        // 隔熱容量：基礎 100 + 等級加成
        const shieldLevels = [0, 50, 100, 180, 280, 400];
        const shieldBonus = shieldLevels[rocketData.shield - 1] || 0;

        rocket.x = LAUNCH_TOWER.x;
        rocket.y = LAUNCH_TOWER.y - LAUNCH_TOWER.height - rocket.height / 2;
        rocket.vx = 0;
        rocket.vy = -6;
        rocket.angle = 0;
        rocket.angularVelocity = 0;
        // 使用共用函式確保與 UI 顯示一致
        const fuelCap = (typeof getFuelCapacity === 'function')
            ? getFuelCapacity(rocketData)
            : 100;
        rocket.maxFuel = fuelCap;
        rocket.fuel = rocket.maxFuel;
        rocket.maxHeat = 100 + shieldBonus;
        rocket.heat = 0;
        rocket.hull = rocketData.hull;
        rocket.maxHull = rocketData.maxHull;
        rocket.thrusting = false;
        rocket.thrustingSide = 0;
        rocket.braking = false;
        rocket.phase = 'ASCENDING';
        rocket.dockedStation = null;
        rocket.targetReached = false;
        rocket.lastY = undefined;

        cameraY = Math.max(0, rocket.y - canvasHeight * 0.7);
    },

    setupControls() {
        // 鍵盤控制（桌機）
        document.addEventListener('keydown', (e) => {
            if (GameState.phase !== 'FLIGHT' && GameState.phase !== 'LANDING') return;

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    rocket.thrusting = true;
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    rocket.thrustingSide = -1;
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    rocket.thrustingSide = 1;
                    e.preventDefault();
                    break;
                case ' ':
                    rocket.braking = true;
                    e.preventDefault();
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    rocket.thrusting = false;
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (rocket.thrustingSide === -1) rocket.thrustingSide = 0;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (rocket.thrustingSide === 1) rocket.thrustingSide = 0;
                    break;
                case ' ':
                    rocket.braking = false;
                    break;
            }
        });

        // 觸控虛擬按鈕（手機）
        this.setupVirtualControls();
    },

    /**
     * 虛擬按鈕綁定（多點觸控 + 觸覺回饋）
     */
    setupVirtualControls() {
        const vcButtons = document.querySelectorAll('#virtual-controls .vc-btn');
        const activeActions = new Set();

        const press = (action) => {
            if (GameState.phase !== 'FLIGHT' && GameState.phase !== 'LANDING') return;

            if (action === 'thrust') {
                rocket.thrusting = true;
            } else if (action === 'brake') {
                rocket.braking = true;
            } else if (action === 'left') {
                rocket.thrustingSide = -1;
            } else if (action === 'right') {
                rocket.thrustingSide = 1;
            } else if (action === 'abort') {
                if (confirm('放棄任務？')) {
                    StateMachine.transition('PREP');
                }
            }

            // 觸覺回饋
            if (navigator.vibrate) {
                navigator.vibrate(20);
            }
        };

        const release = (action) => {
            if (action === 'thrust') {
                rocket.thrusting = false;
            } else if (action === 'brake') {
                rocket.braking = false;
            } else if (action === 'left') {
                if (rocket.thrustingSide === -1) rocket.thrustingSide = 0;
            } else if (action === 'right') {
                if (rocket.thrustingSide === 1) rocket.thrustingSide = 0;
            }
        };

        vcButtons.forEach(btn => {
            const action = btn.dataset.action;
            if (!action) return;

            // 使用 pointerdown/up 統一處理觸控 + 滑鼠
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                btn.classList.add('pressed');
                activeActions.add(action);
                press(action);
            });

            btn.addEventListener('pointerup', (e) => {
                e.preventDefault();
                btn.classList.remove('pressed');
                activeActions.delete(action);
                release(action);
            });

            btn.addEventListener('pointercancel', (e) => {
                btn.classList.remove('pressed');
                activeActions.delete(action);
                release(action);
            });

            btn.addEventListener('pointerleave', (e) => {
                // 若滑鼠離開按鈕才放開（觸控不會觸發）
                if (e.pointerType === 'mouse') {
                    btn.classList.remove('pressed');
                    activeActions.delete(action);
                    release(action);
                }
            });

            // 防止 context menu
            btn.addEventListener('contextmenu', (e) => e.preventDefault());
        });

        // 全域釋放：手指滑出按鈕時
        document.addEventListener('pointerup', () => {
            activeActions.forEach(release);
            activeActions.clear();
            document.querySelectorAll('#virtual-controls .vc-btn.pressed')
                .forEach(b => b.classList.remove('pressed'));
        });
    },

    /**
     * 顯示/隱藏虛擬按鈕
     */
    showVirtualControls(show) {
        const vc = document.getElementById('virtual-controls');
        if (!vc) return;

        if (show) {
            vc.classList.remove('hidden');
            // 桌機自動隱藏（CSS @media 控制），手機/平板自動顯示
            requestAnimationFrame(() => vc.classList.add('active'));
        } else {
            vc.classList.add('hidden');
            vc.classList.remove('active');
        }
    },

    startLoop() {
        if (!animationId) {
            lastTime = performance.now();
            animationId = requestAnimationFrame(gameLoop);
        }
    },

    stopLoop() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        rocket.thrusting = false;
        rocket.thrustingSide = 0;
        rocket.braking = false;
    },

    reset() {
        rocket.phase = 'GROUND';
        rocket.thrusting = false;
        rocket.thrustingSide = 0;
        rocket.braking = false;
        particles.length = 0;
        this.drawInitialScene();
    },

    showExplosion() {
        emitExplosionParticles(rocket.x, rocket.y);
    }
};

window.Physics = Physics;
