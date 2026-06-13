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

// 軌道設施位置
const ORBITAL_STATIONS = [
    { id: 'leo', name: '近地軌道站', altitude: 4000, width: 80, height: 40, color: '#00d4ff' },
    { id: 'moon', name: '月球前哨', altitude: 3800000, width: 60, height: 30, color: '#ffaa00' },
    { id: 'mars', name: '火星基地', altitude: 2250000000, width: 50, height: 25, color: '#ff4466' }
];

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
    dockedStation: null
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

function drawOrbitalStations() {
    ORBITAL_STATIONS.forEach(station => {
        const stationY = WORLD_HEIGHT - station.altitude - cameraY;

        if (stationY < -100 || stationY > canvasHeight + 100) return;

        // 站體
        ctx.fillStyle = station.color;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(
            WORLD_WIDTH / 2 - station.width / 2,
            stationY - station.height / 2,
            station.width,
            station.height
        );

        // 光暈
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = station.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(
            WORLD_WIDTH / 2 - station.width / 2 - 5,
            stationY - station.height / 2 - 5,
            station.width + 10,
            station.height + 10
        );

        ctx.globalAlpha = 1;

        // 標籤
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(station.name, WORLD_WIDTH / 2, stationY + station.height / 2 + 15);

        // 到達指示線
        if (GameState.currentMission && GameState.currentMission.station.id === station.id) {
            const rocketY = rocket.y - cameraY;
            ctx.strokeStyle = station.color;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(WORLD_WIDTH / 2, stationY);
            ctx.lineTo(WORLD_WIDTH / 2, rocketY);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    });
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

    // 陰影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(3, h / 2 + 5, w / 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();

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

    // 箭體紋理
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 2, -h / 6);
    ctx.lineTo(w / 2 - 2, -h / 6);
    ctx.moveTo(-w / 2 + 2, 0);
    ctx.lineTo(w / 2 - 2, 0);
    ctx.stroke();

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

    // 鰭片
    ctx.fillStyle = '#999999';
    ctx.beginPath();
    ctx.moveTo(-w / 2, h / 5);
    ctx.lineTo(-w / 2 - 10, h / 2);
    ctx.lineTo(-w / 2, h / 3);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w / 2, h / 5);
    ctx.lineTo(w / 2 + 10, h / 2);
    ctx.lineTo(w / 2, h / 3);
    ctx.closePath();
    ctx.fill();

    // 熱量效果
    if (rocket.heat > 0) {
        const heatRatio = Math.min(rocket.heat / rocket.maxHeat, 1);
        ctx.fillStyle = `rgba(255, ${Math.round(100 * (1 - heatRatio))}, 0, ${0.2 + heatRatio * 0.5})`;
        ctx.fillRect(-w / 2, -h / 4, w, h * 0.6);
    }

    // 損傷效果
    if (rocket.hull < rocket.maxHull) {
        const damageRatio = 1 - rocket.hull / rocket.maxHull;
        ctx.fillStyle = `rgba(0, 0, 0, ${damageRatio * 0.5})`;
        // 隨機損傷斑點
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

    // 引擎火焰
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

    // 軌道設施對接
    ORBITAL_STATIONS.forEach(station => {
        const stationY = WORLD_HEIGHT - station.altitude;
        const stationTop = stationY - station.height / 2;
        const stationBottom = stationY + station.height / 2;

        if (rocketBottom >= stationTop - 10 && rocketBottom <= stationBottom + 10 &&
            rocket.x >= WORLD_WIDTH / 2 - station.width / 2 - 20 &&
            rocket.x <= WORLD_WIDTH / 2 + station.width / 2 + 20 &&
            Math.abs(rocket.vy) < 5) {

            // 成功對接
            handleDocking(station);
        }
    });

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
        drawOrbitalStations();

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
            canvasWidth = Math.max(400, rect.width);
            canvasHeight = Math.max(300, rect.height);

            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            canvas.style.width = canvasWidth + 'px';
            canvas.style.height = canvasHeight + 'px';

            console.log(`Canvas: ${canvasWidth}x${canvasHeight}`);
        };

        resizeCanvas();
        generateStars();
        this.setupControls();
        this.drawInitialScene();

        window.addEventListener('resize', resizeCanvas);
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
        drawOrbitalStations();
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
