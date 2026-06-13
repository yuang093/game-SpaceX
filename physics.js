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
const WORLD_HEIGHT = 10000; // 更大的世界

let cameraY = 0;
const GROUND_Y = WORLD_HEIGHT - 50;

// 著陸墊
const LANDING_PAD = {
    x: WORLD_WIDTH / 2,
    y: GROUND_Y,
    width: 200,
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
    targetReached: false
};

// ================================================
// 物理常數
// ================================================
const PHYSICS = {
    GRAVITY: 0.06,
    MAX_SAFE_SPEED: 2.5,
    MAX_SAFE_ANGLE: 20,
    ROTATION_SPEED: 0.05,
    THROTTLE: 0.18,
    SIDE_THRUST: 0.04,
    FUEL_CONSUMPTION: 0.12,
    HEAT_RATE: 0.02,
    HEAT_SPEED_THRESHOLD: 10,
    BRAKE_FORCE: 0.15
};

// ================================================
// 粒子系統
// ================================================
const particles = [];
const MAX_PARTICLES = 300;

// 火箭圖片快取（type → HTMLImageElement）
const rocketImageCache = {};
const ROCKET_IMAGE_BASE = 'assets/rockets/';

/**
 * 預先載入所有火箭 SVG 圖片
 * 使用與 CONFIG.rocketImages 一致的 key（底線命名）
 */
function preloadRocketImages() {
    // key 對應 GameState.rockets[].type，fileName 對應 SVG 檔名
    const mapping = [
        { key: 'scout', fileName: 'scout' },
        { key: 'falcon', fileName: 'falcon-9' },
        { key: 'dragon', fileName: 'dragon' },
        { key: 'heavy', fileName: 'falcon-heavy' },
        { key: 'starship', fileName: 'starship' },
        { key: 'starship_v2', fileName: 'starship-v2' },
        { key: 'super_heavy', fileName: 'super-heavy' },
        { key: 'tanker', fileName: 'tanker' },
        { key: 'lynx', fileName: 'lynx' },
        // Starship 全系列
        { key: 'starship_block1', fileName: 'starship-block1' },
        { key: 'starship_block2', fileName: 'starship-block2' },
        { key: 'starship_block3', fileName: 'starship-block3' },
        { key: 'starship_block4', fileName: 'starship-block4' },
        { key: 'starship_hls', fileName: 'starship-hls' },
        { key: 'starship_mars', fileName: 'starship-mars' }
    ];
    mapping.forEach(({ key, fileName }) => {
        const img = new Image();
        img.src = ROCKET_IMAGE_BASE + fileName + '.svg';
        img.onerror = () => console.warn(`火箭圖片載入失敗: ${fileName}`);
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
const stars = [];
const STAR_COUNT = 300;

function generateStars() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * WORLD_WIDTH,
            y: Math.random() * WORLD_HEIGHT,
            size: 0.5 + Math.random() * 2.5,
            brightness: 0.3 + Math.random() * 0.7,
            twinkle: Math.random() * Math.PI * 2,
            color: Math.random() > 0.8 ? (Math.random() > 0.5 ? '#ffdd88' : '#aaccff') : '#ffffff'
        });
    }
}

function drawStars() {
    const time = Date.now() * 0.001;

    stars.forEach(star => {
        const screenX = star.x;
        const screenY = star.y - cameraY;

        if (screenY < -10 || screenY > canvasHeight + 10) return;

        const twinkle = Math.sin(time * 2 + star.twinkle) * 0.3 + 0.7;
        const alpha = star.brightness * twinkle;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, star.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// 行星/地球
function drawEarth() {
    const earthY = GROUND_Y - 200 - cameraY;

    if (earthY > canvasHeight + 500) return;
    if (!isFinite(earthY)) return; // 防止非有限值

    // 地球曲率
    const gradient = ctx.createRadialGradient(
        WORLD_WIDTH / 2, Math.max(-500, earthY + 300),
        200,
        WORLD_WIDTH / 2, Math.max(-500, earthY + 300),
        800
    );
    gradient.addColorStop(0, '#4488ff');
    gradient.addColorStop(0.5, '#2266cc');
    gradient.addColorStop(1, '#113388');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(WORLD_WIDTH / 2, Math.max(-500, earthY + 500), 800, 0, Math.PI * 2);
    ctx.fill();

    // 大氣層光暈
    ctx.save();
    ctx.globalAlpha = 0.3;
    const safeY = Math.max(-500, earthY + 500);
    const atmoGradient = ctx.createRadialGradient(
        WORLD_WIDTH / 2, safeY,
        750,
        WORLD_WIDTH / 2, safeY,
        850
    );
    atmoGradient.addColorStop(0, 'rgba(100, 180, 255, 0.5)');
    atmoGradient.addColorStop(1, 'rgba(100, 180, 255, 0)');
    ctx.fillStyle = atmoGradient;
    ctx.beginPath();
    ctx.arc(WORLD_WIDTH / 2, earthY + 500, 850, 0, Math.PI * 2);
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

function drawLaunchTower() {
    const towerX = LAUNCH_TOWER.x - LAUNCH_TOWER.width / 2;
    const towerTop = LAUNCH_TOWER.y - LAUNCH_TOWER.height - cameraY;
    const towerBottom = LAUNCH_TOWER.y - cameraY;

    if (towerBottom < -50 || towerTop > canvasHeight + 50) return;

    // 主結構
    ctx.fillStyle = '#5a5a7e';
    ctx.fillRect(towerX, towerTop, LAUNCH_TOWER.width, LAUNCH_TOWER.height);

    // 框架
    ctx.strokeStyle = '#7a7a9e';
    ctx.lineWidth = 2;
    const numSections = 7;
    for (let i = 1; i < numSections; i++) {
        const y = towerTop + (LAUNCH_TOWER.height / numSections) * i;
        ctx.beginPath();
        ctx.moveTo(towerX, y);
        ctx.lineTo(towerX + LAUNCH_TOWER.width, y);
        ctx.stroke();
    }

    // 警示燈
    ctx.fillStyle = '#ff4466';
    ctx.beginPath();
    ctx.arc(LAUNCH_TOWER.x, towerTop + 5, 4, 0, Math.PI * 2);
    ctx.fill();

    // 發射台
    ctx.fillStyle = '#4a4a6e';
    ctx.fillRect(LANDING_PAD.x - 50, towerBottom - 10, 100, 10);
}

function drawLandingPad() {
    const padX = LANDING_PAD.x - LANDING_PAD.width / 2;
    const padY = LANDING_PAD.y - cameraY;

    if (padY < -50 || padY > canvasHeight + 50) return;

    // 著陸台
    ctx.fillStyle = '#3a3a5e';
    ctx.fillRect(padX - 10, padY, LANDING_PAD.width + 20, LANDING_PAD.height);

    // 著陸墊表面
    ctx.fillStyle = '#4a4a6e';
    ctx.fillRect(padX, padY, LANDING_PAD.width, 8);

    // H 標記
    ctx.fillStyle = '#00d4ff';
    ctx.fillRect(LANDING_PAD.x - 40, padY - 3, 80, 3);

    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('H', LANDING_PAD.x, padY - 10);
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
    // 自由飛行：顯示地球在底部
    const earthY = GROUND_Y - 200 - cameraY;
    if (earthY > canvasHeight + 500 || !isFinite(earthY)) return;

    const gradient = ctx.createRadialGradient(
        WORLD_WIDTH / 2, Math.max(-500, earthY + 300),
        200,
        WORLD_WIDTH / 2, Math.max(-500, earthY + 300),
        800
    );
    gradient.addColorStop(0, '#4488ff');
    gradient.addColorStop(0.5, '#2266cc');
    gradient.addColorStop(1, '#113388');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(WORLD_WIDTH / 2, Math.max(-500, earthY + 500), 800, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * 繪製天體背景（行星、月球等）
 */
function drawCelestialBody(station, worldY) {
    const screenY = worldY - cameraY;
    const cx = WORLD_WIDTH / 2;
    const size = (station.size || 1) * 100;

    switch (station.type) {
        case 'moon_base':
            // 月球（灰色，有隕石坑）
            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.arc(cx + 150, screenY, size, 0, Math.PI * 2);
            ctx.fill();
            // 隕石坑
            ctx.fillStyle = '#555';
            for (let i = 0; i < 5; i++) {
                const angle = i * (Math.PI * 2 / 5);
                ctx.beginPath();
                ctx.arc(cx + 150 + Math.cos(angle) * size * 0.4, screenY + Math.sin(angle) * size * 0.4, size * 0.1, 0, Math.PI * 2);
                ctx.fill();
            }
            // 標籤
            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🌙 月球', cx + 150, screenY + size + 15);
            break;
        case 'mars_base':
            // 火星（紅色）
            const marsGrad = ctx.createRadialGradient(cx - 30, screenY - 30, 20, cx + 150, screenY, size);
            marsGrad.addColorStop(0, '#ee7755');
            marsGrad.addColorStop(0.7, '#cc4422');
            marsGrad.addColorStop(1, '#552200');
            ctx.fillStyle = marsGrad;
            ctx.beginPath();
            ctx.arc(cx + 150, screenY, size, 0, Math.PI * 2);
            ctx.fill();
            // 極冠
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.beginPath();
            ctx.ellipse(cx + 150, screenY - size * 0.9, size * 0.3, size * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillText('🔴 火星', cx + 150, screenY + size + 15);
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
            ctx.fillText('🧊 歐羅巴', cx + 150, screenY + size + 15);
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
            ctx.fillText('🪐 木星', cx + 200, screenY + size * 1.4 + 15);
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
            ctx.fillText('🪐 土星', cx + 150, screenY + size + 25);
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
            ctx.fillText('☄️ 小行星', cx + 130, screenY + 70);
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
            ctx.fillText('☄️ 彗星', cx, screenY + 40);
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
            // 軌道站（圓頂 + 多模組）
            ctx.fillStyle = '#d0d0d0';
            ctx.fillRect(-20 * size, -10 * size, 40 * size, 20 * size);
            ctx.fillStyle = color;
            ctx.fillRect(-15 * size, -6 * size, 30 * size, 12 * size);
            // 多個對接模組
            ctx.fillStyle = '#888';
            ctx.fillRect(-35 * size, -5 * size, 10 * size, 10 * size);
            ctx.fillRect(25 * size, -5 * size, 10 * size, 10 * size);
            // 大型太陽能板
            ctx.fillStyle = '#1a3a6e';
            ctx.fillRect(-70 * size, -15 * size, 30 * size, 30 * size);
            ctx.fillRect(40 * size, -15 * size, 30 * size, 30 * size);
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
    if (img && img.complete && img.naturalWidth > 0) {
        // SVG 圖片：viewBox 200x400 或 300x400
        // 火箭物理尺寸 24x70，計算縮放比例
        // 以寬度為基準，確保圖片符合 rocket.width
        const scale = (w * 1.5) / img.naturalWidth; // 1.5x 讓圖片更顯眼
        const drawW = img.naturalWidth * scale;
        const drawH = img.naturalHeight * scale;
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
        ctx.fillRect(-w / 2, -h / 2, w, h);
    }

    // 損傷效果
    if (rocket.hull < rocket.maxHull) {
        const damageRatio = 1 - rocket.hull / rocket.maxHull;
        ctx.fillStyle = `rgba(0, 0, 0, ${damageRatio * 0.5})`;
        const seed = Math.floor(rocket.y);
        for (let i = 0; i < 5; i++) {
            const dx = ((seed * (i + 1) * 7) % w) - w / 2;
            const dy = ((seed * (i + 1) * 13) % h) - h / 2;
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

        rocket.fuel -= PHYSICS.FUEL_CONSUMPTION;
        if (rocket.fuel < 0) rocket.fuel = 0;
    }

    // 側向推力
    if (rocket.thrustingSide !== 0) {
        rocket.angularVelocity += rocket.thrustingSide * PHYSICS.ROTATION_SPEED;
        rocket.vx += rocket.thrustingSide * PHYSICS.SIDE_THRUST;
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

    if (rocket.x >= padLeft && rocket.x <= padRight && rocketBottom >= padTop - 5) {
        handleLanding(padTop, true);
        return;
    }

    // 地面
    if (rocketBottom >= GROUND_Y) {
        handleLanding(GROUND_Y, false);
        return;
    }

    // 任務目標對接（若有指派任務）
    if (GameState.currentMission) {
        const station = GameState.currentMission.station;
        const targetY = station.targetAltitude;
        const tolerance = 30;

        // 抵達目標高度且速度低、x 接近中心
        if (Math.abs(rocket.y - targetY) < tolerance &&
            Math.abs(rocket.x - WORLD_WIDTH / 2) < 40 &&
            Math.abs(rocket.vy) < 5) {

            // 標記已抵達目標
            if (!rocket.targetReached) {
                rocket.targetReached = true;
                if (typeof UI !== 'undefined' && UI.toast) {
                    UI.toast(`🎯 已抵達 ${station.name}！`, 'success');
                }
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

        // 若有任務但未抵達目標，任務失敗
        if (GameState.currentMission && !rocket.targetReached) {
            const station = GameState.currentMission.station;
            triggerCrash(`未抵達目標！應抵達 ${station.name}（${Math.round(station.targetAltitude/10)}m）`);
            return;
        }

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
    rocket.y = WORLD_HEIGHT - station.altitude + station.height / 2 + rocket.height / 2;
    rocket.vx = 0;
    rocket.vy = 0;
    rocket.phase = 'DOCKED';
    rocket.dockedStation = station;

    // 如果是任務目標站，給予獎勵
    if (GameState.currentMission && GameState.currentMission.station.id === station.id) {
        const bonus = Math.floor(GameState.currentMission.reward * 0.5);
        GameState.credits += bonus;
        console.log(`對接成功！獲得 bonuses: $${bonus}`);
    }

    StateMachine.enterSuccess({
        fuel: rocket.fuel,
        maxFuel: rocket.maxFuel,
        hull: rocket.hull,
        maxHull: rocket.maxHull
    });
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

function updateCamera() {
    const targetY = rocket.y - canvasHeight * 0.6;
    cameraY += (targetY - cameraY) * 0.08;
    cameraY = Math.max(0, Math.min(WORLD_HEIGHT - canvasHeight, cameraY));
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

        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        drawStars();
        drawEarth();
        drawGround();
        drawLaunchTower();
        drawLandingPad();
        drawDestination();

        updatePhysics();

        if (GameState.phase !== 'PREP' && UI) {
            UI.updateHUD(rocket);
        }

        drawRocket();
        updateAndDrawParticles();
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

        const resizeCanvas = () => {
            const rect = gameArea.getBoundingClientRect();
            canvasWidth = Math.max(100, Math.floor(rect.width));
            canvasHeight = Math.max(100, Math.floor(rect.height));

            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            canvas.style.width = canvasWidth + 'px';
            canvas.style.height = canvasHeight + 'px';

            console.log(`Canvas: ${canvasWidth}x${canvasHeight}`);
        };

        // 延遲到 DOM 完成 layout 後再初始化 canvas
        // 使用雙 rAF 確保 layout 完成
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resizeCanvas();
                generateStars();
                preloadRocketImages();
                this.setupControls();
                this.drawInitialScene();
            });
        });

        // ResizeObserver 監聽 game-area 尺寸變化（含面板開合）
        if (window.ResizeObserver) {
            const ro = new ResizeObserver(() => {
                resizeCanvas();
                // 重繪以避免黑屏
                if (GameState.phase === 'PREP') this.drawInitialScene();
            });
            ro.observe(gameArea);
        }

        window.addEventListener('resize', () => setTimeout(resizeCanvas, 50));
        window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 100));
    },

    drawInitialScene() {
        cameraY = WORLD_HEIGHT - canvasHeight;

        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        drawStars();
        drawEarth();
        drawGround();
        drawLaunchTower();
        drawLandingPad();
        drawDestination();
    },

    initRocket() {
        const rocketData = GameState.rockets[GameState.selectedRocketIndex];
        if (!rocketData) return;

        // 計算屬性
        const fuelLevels = [0, 30, 70, 120, 180, 250];
        const shieldLevels = [0, 50, 100, 180, 280, 400];

        const fuelBonus = fuelLevels[rocketData.fuel - 1] || 0;
        const shieldBonus = shieldLevels[rocketData.shield - 1] || 0;

        rocket.x = LAUNCH_TOWER.x;
        rocket.y = LAUNCH_TOWER.y - LAUNCH_TOWER.height - rocket.height / 2;
        rocket.vx = 0;
        rocket.vy = -6;
        rocket.angle = 0;
        rocket.angularVelocity = 0;
        rocket.maxFuel = 100 + fuelBonus;
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
