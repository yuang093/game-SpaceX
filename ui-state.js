/**
 * ui-state.js - v2.0 完整版
 * 包含任務系統、升級系統、裝備系統、科技樹、UI/UX 優化、虛擬控制整合
 */

// ================================================
// 全域遊戲狀態
// ================================================
const GameState = {
    phase: 'PREP',
    credits: 15000,
    research: 0,
    reputation: 0,
    techLevel: 1,
    achievements: [],

    stats: {
        launches: 0,
        successfulLandings: 0,
        failures: 0,
        totalDistance: 0,
        cargoDelivered: 0,
        crewSaved: 0,
        perfectLandings: 0
    },

    // 連勝與探索紀錄
    missionStreak: 0,
    visitedStations: [],

    currentMission: null,
    maxAltitude: 0,

    rockets: [],
    selectedRocketIndex: 0,

    crew: [],
    hiredCrewCount: 0,

    stations: [],
    unlockedStations: ['leo'],

    availableMissions: [],

    // 已解鎖的科技
    unlockedTech: ['basic_engine', 'basic_fuel', 'basic_shield'],

    // SPCX 股票持股（任務成功獎勵）
    stocks: {
        SPCX: {
            shares: 0,            // 持有股數
            totalCost: 0,         // 總成本（用於計算平均成本）
            history: [],          // 價格歷史（最近 30 筆）
            lastFetch: 0,         // 上次抓取時間
            currentPrice: 0,      // 當前 SPCX 真實股價
            lastRealSymbol: '',   // 上次抓取的對標股票
            source: 'init'        // 'real' = 抓取成功, 'sim' = 模擬
        }
    },

    // 裝備槽位
    equipment: {
        engine: null,
        fuelTank: null,
        heatShield: null,
        cargoModule: null,
        lifeSupport: null,
        solarPanel: null,
        communications: null,
        navigation: null
    },

    // 卡片收藏
    cardCollection: [],
    cardStats: {
        totalPulls: 0,
        lastPull: null,
        lastPullTime: 0
    },

    // 玩家當前所在位置（'earth' = 地球，'moon'/'mars'... = 太空站 ID）
    currentLocation: 'earth'
};

// ================================================
// 遊戲配置
// ================================================
const CONFIG = {

    // 火箭類型
    rocketTypes: {
        scout: {
            name: ' Scout-1  scout火箭',
            description: '輕型偵察火箭，適合近距離任務',
            basePrice: 0,
            stats: { hull: 80, engine: 1, fuel: 1, shield: 1, cargo: 1 },
            slots: { engine: 1, fuel: 1, shield: 1, cargo: 1 },
            hasLifeSupport: false
        },
        falcon: {
            name: ' Falcon-9 獵鷹火箭',
            description: '標準中型火箭，可執行多種任務',
            basePrice: 15000,
            stats: { hull: 100, engine: 2, fuel: 2, shield: 2, cargo: 2 },
            slots: { engine: 2, fuel: 2, shield: 2, cargo: 2, solar: 1 },
            hasLifeSupport: false
        },
        dragon: {
            name: ' Dragon-X 載人飛船',
            description: '載人專用，配備完善的生命維持系統',
            basePrice: 25000,
            stats: { hull: 90, engine: 2, fuel: 2, shield: 3, cargo: 1 },
            slots: { engine: 2, fuel: 2, shield: 2, cargo: 1, lifeSupport: 1, solar: 1 },
            hasLifeSupport: true
        },
        heavy: {
            name: ' Heavy-Lift 重型火箭',
            description: '重型貨運火箭，超大載貨量',
            basePrice: 35000,
            stats: { hull: 150, engine: 3, fuel: 3, shield: 2, cargo: 4 },
            slots: { engine: 3, fuel: 3, shield: 2, cargo: 4, solar: 2 },
            hasLifeSupport: false
        },
        starship: {
            name: ' Starship 星際飛船',
            description: '旗艦級火箭，可執行深空任務',
            basePrice: 80000,
            stats: { hull: 200, engine: 5, fuel: 5, shield: 5, cargo: 5 },
            slots: { engine: 5, fuel: 4, shield: 4, cargo: 5, lifeSupport: 1, solar: 2, comm: 1, nav: 1 },
            hasLifeSupport: true
        },
        // v2.0 新增火箭
        starship_v2: {
            name: ' Starship V2 旗艦升級',
            description: 'Starship 升級版，更大推力、更遠航程',
            basePrice: 150000,
            stats: { hull: 280, engine: 7, fuel: 7, shield: 6, cargo: 6 },
            slots: { engine: 7, fuel: 6, shield: 5, cargo: 6, lifeSupport: 2, solar: 3, comm: 2, nav: 2 },
            hasLifeSupport: true
        },
        super_heavy: {
            name: ' Super Heavy 超級重型',
            description: '史上最強運載火箭，巨型貨物專用',
            basePrice: 250000,
            stats: { hull: 400, engine: 8, fuel: 8, shield: 5, cargo: 10 },
            slots: { engine: 8, fuel: 8, shield: 5, cargo: 10, solar: 4, comm: 2 },
            hasLifeSupport: false
        },
        tanker: {
            name: ' Tanker 軌道加油船',
            description: '專為軌道加油設計，可延長任務航程',
            basePrice: 120000,
            stats: { hull: 180, engine: 4, fuel: 10, shield: 4, cargo: 3 },
            slots: { engine: 4, fuel: 10, shield: 4, cargo: 3, solar: 2, comm: 1, nav: 1 },
            hasLifeSupport: false
        },
        lynx: {
            name: ' Lynx 太空旅遊船',
            description: '亞軌道旅遊專用，舒適安全',
            basePrice: 95000,
            stats: { hull: 120, engine: 3, fuel: 4, shield: 4, cargo: 2 },
            slots: { engine: 3, fuel: 4, shield: 4, cargo: 2, lifeSupport: 1, solar: 1, comm: 1 },
            hasLifeSupport: true
        },
        // ===== Starship 全系列（基於 Wikipedia 公開資料）=====
        starship_block1: {
            name: '🚀 Starship Block 1',
            description: '121.3m 全不鏽鋼火箭，已退役於 IFT-6',
            basePrice: 180000,
            stats: { hull: 250, engine: 6, fuel: 6, shield: 5, cargo: 4 },
            slots: { engine: 6, fuel: 6, shield: 5, cargo: 4, lifeSupport: 1, solar: 2, comm: 1 },
            hasLifeSupport: true
        },
        starship_block2: {
            name: '🚀 Starship Block 2',
            description: '123.3m，更薄襟翼，25% 更多燃料，35t LEO',
            basePrice: 250000,
            stats: { hull: 280, engine: 7, fuel: 8, shield: 6, cargo: 5 },
            slots: { engine: 7, fuel: 8, shield: 6, cargo: 5, lifeSupport: 1, solar: 2, comm: 1 },
            hasLifeSupport: true
        },
        starship_block3: {
            name: '🚀 Starship Block 3',
            description: '124.4m，Raptor 3 引擎，3 個格柵翼，100t LEO',
            basePrice: 400000,
            stats: { hull: 320, engine: 9, fuel: 10, shield: 7, cargo: 8 },
            slots: { engine: 9, fuel: 10, shield: 7, cargo: 8, lifeSupport: 2, solar: 3, comm: 2 },
            hasLifeSupport: true
        },
        starship_block4: {
            name: '🚀 Starship Block 4',
            description: '142m 超巨型，6 個真空引擎，200t LEO（規劃中）',
            basePrice: 800000,
            stats: { hull: 400, engine: 12, fuel: 15, shield: 9, cargo: 15 },
            slots: { engine: 12, fuel: 15, shield: 9, cargo: 15, lifeSupport: 3, solar: 4, comm: 2 },
            hasLifeSupport: true
        },
        starship_hls: {
            name: '🌙 Starship HLS 月球版',
            description: 'NASA Artemis 載人月著陸器，無熱盾/襟翼，4 著陸腿',
            basePrice: 500000,
            stats: { hull: 200, engine: 5, fuel: 7, shield: 2, cargo: 3 },
            slots: { engine: 5, fuel: 7, shield: 2, cargo: 3, lifeSupport: 2, solar: 2, comm: 2 },
            hasLifeSupport: true
        },
        starship_mars: {
            name: '🔴 Starship 火星運輸船',
            description: '100t 火星載貨，紅色 regolith 隔熱塗裝',
            basePrice: 350000,
            stats: { hull: 300, engine: 8, fuel: 9, shield: 8, cargo: 12 },
            slots: { engine: 8, fuel: 9, shield: 8, cargo: 12, lifeSupport: 1, solar: 3, comm: 2 },
            hasLifeSupport: true
        }
    },

    // 升級系統
    upgradeCategories: {
        engine: {
            name: '引擎',
            icon: '🔧',
            maxLevel: 10,
            costs: [1000, 2000, 4000, 8000, 15000, 25000, 40000, 60000, 85000, 120000],
            bonusPerLevel: [0, 10, 22, 36, 52, 70, 90, 112, 136, 162, 190]
        },
        fuel: {
            name: '燃料槽',
            icon: '⛽',
            maxLevel: 10,
            costs: [800, 1600, 3200, 6400, 12000, 20000, 32000, 48000, 68000, 96000],
            bonusPerLevel: [0, 20, 45, 75, 110, 150, 195, 245, 300, 360, 425]
        },
        shield: {
            name: '隔熱盾',
            icon: '🛡️',
            maxLevel: 10,
            costs: [1200, 2400, 4800, 9600, 18000, 30000, 48000, 72000, 102000, 144000],
            bonusPerLevel: [0, 40, 85, 140, 205, 280, 365, 460, 565, 680, 805]
        },
        cargo: {
            name: '貨艙',
            icon: '📦',
            maxLevel: 10,
            costs: [1500, 3000, 6000, 12000, 22500, 37500, 60000, 90000, 127500, 180000],
            bonusPerLevel: [0, 15, 35, 60, 90, 125, 165, 210, 260, 315, 375]
        }
    },

    // 裝備系統
    equipmentItems: {
        // 引擎
        engine_t1: { name: '離子推進器', type: 'engine', tier: 1, price: 5000, bonus: { thrust: 15 }, desc: '+15% 推力' },
        engine_t2: { name: '等離子引擎', type: 'engine', tier: 2, price: 15000, bonus: { thrust: 35 }, desc: '+35% 推力', requires: 'engine_t1' },
        engine_t3: { name: '核熱火箭', type: 'engine', tier: 3, price: 40000, bonus: { thrust: 60 }, desc: '+60% 推力', requires: 'engine_t2' },
        engine_t4: { name: '離子推進器 Mk.II', type: 'engine', tier: 4, price: 100000, bonus: { thrust: 100 }, desc: '+100% 推力', requires: 'engine_t3' },

        // 燃料槽
        fuel_t1: { name: '加大燃料槽', type: 'fuelTank', tier: 1, price: 4000, bonus: { fuelCapacity: 30 }, desc: '+30 燃料容量' },
        fuel_t2: { name: '輕量化燃料槽', type: 'fuelTank', tier: 2, price: 12000, bonus: { fuelCapacity: 70 }, desc: '+70 燃料容量', requires: 'fuel_t1' },
        fuel_t3: { name: '低溫燃料罐', type: 'fuelTank', tier: 3, price: 35000, bonus: { fuelCapacity: 120 }, desc: '+120 燃料容量', requires: 'fuel_t2' },

        // 隔熱盾
        shield_t1: { name: '增強隔熱瓦', type: 'heatShield', tier: 1, price: 6000, bonus: { heatResist: 50 }, desc: '+50 熱量耐受' },
        shield_t2: { name: '碳化碳隔熱盾', type: 'heatShield', tier: 2, price: 18000, bonus: { heatResist: 120 }, desc: '+120 熱量耐受', requires: 'shield_t1' },
        shield_t3: { name: '電漿偏轉盾', type: 'heatShield', tier: 3, price: 50000, bonus: { heatResist: 250 }, desc: '+250 熱量耐受', requires: 'shield_t2' },

        // 貨艙模組
        cargo_t1: { name: '壓縮貨艙', type: 'cargoModule', tier: 1, price: 3000, bonus: { cargoCapacity: 20 }, desc: '+20 貨艙容量' },
        cargo_t2: { name: '真空貨艙', type: 'cargoModule', tier: 2, price: 10000, bonus: { cargoCapacity: 50 }, desc: '+50 貨艙容量', requires: 'cargo_t1' },
        cargo_t3: { name: '軌道貨艙', type: 'cargoModule', tier: 3, price: 30000, bonus: { cargoCapacity: 100 }, desc: '+100 貨艙容量', requires: 'cargo_t2' },

        // 生命維持
        life_t1: { name: '基礎生命維持', type: 'lifeSupport', tier: 1, price: 8000, bonus: { crewCapacity: 2 }, desc: '容納 2 名太空人' },
        life_t2: { name: ' Extended Life 支持', type: 'lifeSupport', tier: 2, price: 25000, bonus: { crewCapacity: 4 }, desc: '容納 4 名太空人', requires: 'life_t1' },
        life_t3: { name: '星際生命艙', type: 'lifeSupport', tier: 3, price: 70000, bonus: { crewCapacity: 8 }, desc: '容納 8 名太空人', requires: 'life_t2' },

        // 太陽能板
        solar_t1: { name: '柔性太陽能板', type: 'solarPanel', tier: 1, price: 2000, bonus: { fuelEfficiency: 5 }, desc: '+5% 燃料效率' },
        solar_t2: { name: '高效太陽能陣列', type: 'solarPanel', tier: 2, price: 8000, bonus: { fuelEfficiency: 12 }, desc: '+12% 燃料效率', requires: 'solar_t1' },

        // 通訊
        comm_t1: { name: '定向天線', type: 'communications', tier: 1, price: 1500, bonus: { missionBonus: 5 }, desc: '+5% 任務獎勵' },
        comm_t2: { name: '量子通訊模組', type: 'communications', tier: 2, price: 12000, bonus: { missionBonus: 15 }, desc: '+15% 任務獎勵', requires: 'comm_t1' },

        // 導航
        nav_t1: { name: '慣性導航', type: 'navigation', tier: 1, price: 3000, bonus: { landingAccuracy: 10 }, desc: '+10% 著陸精度' },
        nav_t2: { name: 'GPS 輔助系統', type: 'navigation', tier: 2, price: 15000, bonus: { landingAccuracy: 25 }, desc: '+25% 著陸精度', requires: 'nav_t1' }
    },

    // 太空站
    // targetAltitude 是世界座標高度（玩家必須飛到的 y 座標）
    // 使用對數刻度：近的低、遠的高
    stations: [
        {
            id: 'leo', name: '近地軌道站 LEO', altitude: 400, targetAltitude: 2200, difficulty: 1,
            fuelRequired: 30,  // 燃料需求（真實比例：400km 只需要很少燃料）
            needs: ['食物', '水', '醫療物資'], supply: ['太陽能板', '零件'],
            reward: { base: 1000, multiplier: 1.0 },
            unlockReputation: 0,
            type: 'space_station',
            color: '#00d4ff',
            size: 1.0
        },
        {
            id: 'polar', name: '極地觀測站', altitude: 600, targetAltitude: 2800, difficulty: 2,
            fuelRequired: 35,
            needs: ['科研設備', '食物'], supply: ['觀測數據'],
            reward: { base: 1500, multiplier: 1.3 },
            unlockReputation: 50,
            type: 'space_station',
            color: '#88ddff',
            size: 0.9
        },
        {
            id: 'solar_satellite', name: '太陽能衛星矩陣', altitude: 1500000, targetAltitude: 3600, difficulty: 4,
            fuelRequired: 60,
            needs: ['太陽能板', '維修零件', '通訊設備'], supply: ['清潔能源', '軌道數據'],
            reward: { base: 5000, multiplier: 3.5 },
            unlockReputation: 150,
            type: 'solar_array',
            color: '#ffcc00',
            size: 1.2
        },
        {
            id: 'gateway', name: '月球門戶 Gateway', altitude: 384000, targetAltitude: 4500, difficulty: 6,
            fuelRequired: 150,
            needs: ['科研設備', '太陽能板', '氧氣', '食物'], supply: ['中繼數據', '軌道科研'],
            reward: { base: 8000, multiplier: 4.0 },
            unlockReputation: 300,
            type: 'space_station',
            color: '#aaddff',
            size: 1.4
        },
        {
            id: 'moon', name: '月球前哨站', altitude: 384000, targetAltitude: 5200, difficulty: 5,
            fuelRequired: 150,  // 月球 38.4 萬公里，所需燃料約 LEO 的 5 倍
            needs: ['重型設備', '食物', '人員'], supply: ['月岩樣本', '氦-3'],
            reward: { base: 5000, multiplier: 3.0 },
            unlockReputation: 200,
            type: 'moon_base',
            color: '#ffaa00',
            size: 1.0
        },
        {
            id: 'lagrange', name: '拉格朗日點站', altitude: 1500000, targetAltitude: 5800, difficulty: 7,
            fuelRequired: 70,
            needs: ['科研設備', '太陽能板', '食物'], supply: ['稀有元素'],
            reward: { base: 12000, multiplier: 5.5 },
            unlockReputation: 500,
            type: 'lagrange_point',
            color: '#ff88cc',
            size: 1.1
        },
        {
            id: 'phobos', name: '火衛一中繼站 Phobos', altitude: 230000000, targetAltitude: 6500, difficulty: 8,
            fuelRequired: 260,  // 火星軌道前哨
            needs: ['通訊設備', '燃料', '食物'], supply: ['火星中繼數據', '礦石樣本'],
            reward: { base: 15000, multiplier: 6.5 },
            unlockReputation: 800,
            type: 'phobos_station',
            color: '#cc6644',
            size: 0.8
        },
        {
            id: 'mars', name: '火星基地', altitude: 225000000, targetAltitude: 7200, difficulty: 10,
            fuelRequired: 280,  // 火星 2.25 億公里，需要 Falcon 等大型火箭
            needs: ['重型設備', '食物', '人員', '醫療物資'], supply: ['土壤樣本', '水冰'],
            reward: { base: 25000, multiplier: 10.0 },
            unlockReputation: 1000,
            type: 'mars_base',
            color: '#ff4466',
            size: 1.3
        },
        {
            id: 'asteroid', name: '小行星採礦站', altitude: 450000000, targetAltitude: 7800, difficulty: 12,
            fuelRequired: 300,  // 小行星帶
            needs: ['採礦設備', '食物', '燃料'], supply: ['稀有金屬', '貴金屬'],
            reward: { base: 50000, multiplier: 18.0 },
            unlockReputation: 2000,
            type: 'asteroid',
            color: '#aa8866',
            size: 1.5
        },
        {
            id: 'europa', name: '歐羅巴冰下基地', altitude: 628000000, targetAltitude: 8200, difficulty: 11,
            fuelRequired: 340,  // 木星衛星
            needs: ['核燃料', '高級科研設備', '潛水器'], supply: ['冰下樣本', '外星微生物證據'],
            reward: { base: 35000, multiplier: 12.0 },
            unlockReputation: 1500,
            type: 'europa_base',
            color: '#aaddff',
            size: 1.0
        },
        {
            id: 'saturn_ring', name: '土星環採礦站', altitude: 1400000000, targetAltitude: 8600, difficulty: 13,
            fuelRequired: 400,  // 土星 14 億公里
            needs: ['採礦設備', '燃料', '食物', '零件'], supply: ['稀有金屬', '水冰', '貴金屬'],
            reward: { base: 60000, multiplier: 22.0 },
            unlockReputation: 3000,
            type: 'saturn_station',
            color: '#ffddaa',
            size: 1.2
        },
        {
            id: 'jupiter', name: '木星軌道基地', altitude: 2200000000, targetAltitude: 9000, difficulty: 15,
            fuelRequired: 420,  // 木星 22 億公里
            needs: ['核燃料', '高級設備', '人員'], supply: ['氦-3', '科研數據'],
            reward: { base: 100000, multiplier: 35.0 },
            unlockReputation: 5000,
            type: 'jupiter_station',
            color: '#ddaa66',
            size: 1.4
        },
        // 特殊目標：彗星（無固定太空站，動態出現）
        {
            id: 'comet', name: '哈雷彗星', altitude: 0, targetAltitude: 6800, difficulty: 9,
            fuelRequired: 180,  // 動態距離，平均火星軌道級別
            needs: ['採樣設備'], supply: ['彗星樣本', '冰晶'],
            reward: { base: 30000, multiplier: 8.0 },
            unlockReputation: 600,
            type: 'comet',
            color: '#aaeeff',
            size: 1.0
        },
        // v2.2 新增深空站點
        {
            id: 'titan', name: '土衛六泰坦基地', altitude: 1400000000, targetAltitude: 8400, difficulty: 14,
            fuelRequired: 395,  // 土星系統
            needs: ['甲烷燃料', '低溫防護', '科研設備'], supply: ['甲烷冰晶', '碳氫化合物'],
            reward: { base: 80000, multiplier: 22.0 },
            unlockReputation: 2500,
            type: 'titan_base',
            color: '#cc9944',
            size: 1.6
        },
        {
            id: 'enceladus', name: '土衛二噴泉觀測站', altitude: 1400000000, targetAltitude: 8800, difficulty: 15,
            fuelRequired: 397,
            needs: ['深海探測器', '低溫設備', '樣本密封器'], supply: ['冰下海洋樣本', '微生物化石'],
            reward: { base: 120000, multiplier: 28.0 },
            unlockReputation: 3500,
            type: 'enceladus_station',
            color: '#88ccff',
            size: 1.4
        },
        {
            id: 'kuiper_belt', name: '古柏帶探測點', altitude: 6000000000, targetAltitude: 9500, difficulty: 18,
            fuelRequired: 500,  // 古柏帶 60 億公里
            needs: ['核能電池', '長程通訊', '冷凍樣本艙'], supply: ['原始星塵', '未知礦物'],
            reward: { base: 250000, multiplier: 45.0 },
            unlockReputation: 6000,
            type: 'kuiper_station',
            color: '#9966ff',
            size: 1.8
        },
        // v2.5 新增太陽系站點
        {
            id: 'venus', name: '金星軌道研究站', altitude: 110000000, targetAltitude: 7500, difficulty: 11,
            fuelRequired: 230,  // 金星 1.1 億公里
            needs: ['耐腐蝕材料', '散熱系統', '科研設備'], supply: ['大氣數據', '地質樣本'],
            reward: { base: 40000, multiplier: 14.0 },
            unlockReputation: 1800,
            type: 'venus_base',
            color: '#ffcc88',
            size: 1.0
        },
        {
            id: 'mercury', name: '水星前哨站', altitude: 58000000, targetAltitude: 7000, difficulty: 12,
            fuelRequired: 210,  // 水星 5800 萬公里
            needs: ['高溫隔熱', '太陽能板', '散熱器'], supply: ['稀有金屬', '太陽風數據'],
            reward: { base: 55000, multiplier: 16.0 },
            unlockReputation: 2200,
            type: 'mercury_base',
            color: '#bbbbbb',
            size: 0.9
        },
        {
            id: 'neptune', name: '海王星深空基地', altitude: 4500000000, targetAltitude: 9800, difficulty: 20,
            fuelRequired: 550,  // 海王星 45 億公里
            needs: ['核能電池', '長程通訊', '極端低溫設備'], supply: ['冰巨星數據', '未知化合物'],
            reward: { base: 500000, multiplier: 60.0 },
            unlockReputation: 10000,
            type: 'neptune_station',
            color: '#5577ff',
            size: 2.0
        },
        {
            id: 'pluto', name: '冥王星探測站', altitude: 7500000000, targetAltitude: 9600, difficulty: 17,
            fuelRequired: 520,  // 冥王星 75 億公里
            needs: ['核能電池', '低溫樣本艙', '遠距操控'], supply: ['冰氮樣本', '古老化學數據'],
            reward: { base: 180000, multiplier: 38.0 },
            unlockReputation: 7000,
            type: 'pluto_station',
            color: '#ccaa88',
            size: 1.0
        },
        {
            id: 'ceres', name: '穀神星採礦殖民地', altitude: 415000000, targetAltitude: 8000, difficulty: 10,
            fuelRequired: 310,  // 小行星帶 4.15 億公里
            needs: ['採礦設備', '冶煉工廠', '太陽能板'], supply: ['鐵鎳礦石', '水冰', '稀有金屬'],
            reward: { base: 30000, multiplier: 9.0 },
            unlockReputation: 1200,
            type: 'ceres_station',
            color: '#aaaaaa',
            size: 1.2
        }
    ],

    // 任務類型
    missionTypes: {
        supply: { name: '補給任務', icon: '📦', color: '#66aaff', baseReward: 1.0 },
        crew: { name: '載人任務', icon: '👨‍🚀', color: '#00ff88', baseReward: 1.5 },
        rescue: { name: '救援任務', icon: '🚑', color: '#ff4466', baseReward: 2.0 },
        construction: { name: '建設任務', icon: '🏗️', color: '#ffaa00', baseReward: 1.8 },
        mining: { name: '採礦任務', icon: '💎', color: '#aa66ff', baseReward: 2.5 },
        scientific: { name: '科研任務', icon: '🔬', color: '#00d4ff', baseReward: 2.2 },
        military: { name: '軍事任務', icon: '🛡️', color: '#ff6600', baseReward: 3.0 },
        exploration: { name: '探索任務', icon: '🌟', color: '#ffdd00', baseReward: 4.0 },
        // v2.0 新增任務
        satellite_deploy: { name: '衛星部署', icon: '🛰️', color: '#88ddff', baseReward: 1.3 },
        space_tourism: { name: '太空旅遊', icon: '🎒', color: '#ff88cc', baseReward: 1.6 },
        repair: { name: '太空維修', icon: '🔧', color: '#ffcc66', baseReward: 1.4 },
        comet_sample: { name: '彗星採樣', icon: '☄️', color: '#cc88ff', baseReward: 3.5 },
        // v2.2 新增任務
        asteroid_mining: { name: '小行星採礦', icon: '⛏️', color: '#ccaa66', baseReward: 4.0 },
        quantum_experiment: { name: '量子實驗', icon: '⚛️', color: '#66ffcc', baseReward: 3.2 },
        alien_signal: { name: '外星訊號追蹤', icon: '👽', color: '#66ff66', baseReward: 5.0 },
        // v2.5 新增任務
        ice_mining: { name: '冰層開採', icon: '🧊', color: '#aaddff', baseReward: 2.8 },
        deep_space_probe: { name: '深空探測', icon: '🔭', color: '#dd88ff', baseReward: 3.8 },
        solar_observation: { name: '太陽觀測', icon: '☀️', color: '#ffdd44', baseReward: 2.5 },
        first_contact: { name: '首次接觸', icon: '🤝', color: '#44ffaa', baseReward: 6.0 }
    },

    // 乘員職銜
    crewRanks: ['見習', '初級', '中級', '高級', '資深', '專家', '指揮官'],
    crewNames: [
        '張明', '王芳', '李偉', '陳曉', '劉洋', '黃美', '周杰', '吳欣',
        '鄭強', '孫麗', '林濤', '黃雲', '楊帆', '趙敏', '孫悟空', '周杰倫'
    ],

    // 乘員升級經驗值（指數成長：每級約 1.5x）
    // 等級 0→1: 100 XP, 1→2: 180, 2→3: 270, ... 6→7: 1840
    rankUpXP: [100, 180, 270, 405, 610, 915, 1370, 1840],

    // 火箭圖片對照表（type → SVG 檔案）
    rocketImages: {
        scout: 'assets/rockets/scout.svg',
        falcon: 'assets/rockets/falcon-9.svg',
        dragon: 'assets/rockets/dragon.svg',
        heavy: 'assets/rockets/falcon-heavy.svg',
        starship: 'assets/rockets/starship.svg',
        starship_v2: 'assets/rockets/starship-v2.svg',
        super_heavy: 'assets/rockets/super-heavy.svg',
        tanker: 'assets/rockets/tanker.svg',
        lynx: 'assets/rockets/lynx.svg',
        // Starship 全系列
        starship_block1: 'assets/rockets/starship-block1.svg',
        starship_block2: 'assets/rockets/starship-block2.svg',
        starship_block3: 'assets/rockets/starship-block3.svg',
        starship_block4: 'assets/rockets/starship-block4.svg',
        starship_hls: 'assets/rockets/starship-hls.svg',
        starship_mars: 'assets/rockets/starship-mars.svg'
    },

    // 太空人頭像（依姓名 hash 對應固定 SVG）
    astronautPortraits: [
        'assets/astronauts/astronaut-1.svg',
        'assets/astronauts/astronaut-2.svg',
        'assets/astronauts/astronaut-3.svg',
        'assets/astronauts/astronaut-4.svg',
        'assets/astronauts/astronaut-5.svg',
        'assets/astronauts/astronaut-6.svg',
        'assets/astronauts/astronaut-7.svg',
        'assets/astronauts/astronaut-8.svg'
    ],

    // 太空人真實照片 URL（NASA 公共領域，下載後可替換 SVG）
    // 完整清單見 assets/astronauts/PHOTO_SOURCES.md
    astronautPhotoSources: {
        male_suit_white: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Astronaut-EVA.jpg/240px-Astronaut-EVA.jpg',
        female_suit: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Stephanie_Wilson_official_portrait.jpg/240px-Stephanie_Wilson_official_portrait.jpg',
        male_portrait: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Buzz_Aldrin_Apollo_11_original.jpg/240px-Buzz_Aldrin_Apollo_11_original.jpg',
        crew_portrait: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Astronaut_Group_18.jpg/320px-Astronaut_Group_18.jpg'
    },

    // 聲譽獲得管道（公式透明化）
    reputationSources: {
        missionSuccess: (difficulty) => difficulty * 5,           // 任務成功（5-75 點）
        freeFlight: () => 10,                                      // 自由飛行
        firstStationVisit: (stationId) => 50,                      // 首次到站
        crewRankUp: (newRank) => newRank * 20,                    // 乘員升級（20-120 點）
        missionStreak: (streak) => Math.min(streak * 10, 100),    // 連勝獎勵（最高 100）
        allStations: () => 200,                                    // 解鎖所有太空站
        perfectLanding: () => 30                                  // 完美著陸
    },

    // 聲譽等級（每 100 點 = 1 等）
    reputationLevels: [
        { level: 1, name: '菜鳥', min: 0 },
        { level: 2, name: '飛行員', min: 100 },
        { level: 3, name: '資深飛行員', min: 300 },
        { level: 4, name: '指揮官', min: 600 },
        { level: 5, name: '王牌', min: 1000 },
        { level: 6, name: '傳奇', min: 2000 },
        { level: 7, name: '太空英雄', min: 5000 }
    ],

    // 科技樹
    techTree: {
        propulsion: {
            name: '推進技術',
            icon: '🔬',
            tiers: [
                { name: '化學火箭', cost: 0, unlocks: ['engine_t1'] },
                { name: '離子推進', cost: 5000, requires: 100 },
                { name: '核熱火箭', cost: 20000, requires: 500 },
                { name: '電漿推進', cost: 80000, requires: 2000 }
            ]
        },
        materials: {
            name: '材料學',
            icon: '⚗️',
            tiers: [
                { name: '鈦合金', cost: 0, unlocks: ['shield_t1'] },
                { name: '碳化碳', cost: 8000, requires: 200 },
                { name: '超級合金', cost: 35000, requires: 800 },
                { name: '力場材料', cost: 150000, requires: 5000 }
            ]
        },
        life_support: {
            name: '生命保障',
            icon: '🌱',
            tiers: [
                { name: '基礎生命支持', cost: 0, unlocks: ['life_t1'] },
                { name: ' Extended Life', cost: 15000, requires: 300 },
                { name: ' Closed 生態系統', cost: 60000, requires: 1500 }
            ]
        },
        cargo: {
            name: '貨運技術',
            icon: '📦',
            tiers: [
                { name: '標準貨艙', cost: 0, unlocks: ['cargo_t1'] },
                { name: '真空壓縮', cost: 10000, requires: 250 },
                { name: '軌道轉運', cost: 45000, requires: 1200 }
            ]
        }
    },

    // ================================================
    // 抽卡系統（卡片池）
    // ================================================
    // 稀有度配色
    rarityColors: {
        N:   '#888888',  // 灰
        R:   '#4488FF',  // 藍
        SR:  '#FF4444',  // 紅
        SSR: '#FFD700',  // 金
        UR:  '#B026FF'   // 紫
    },

    // 稀有度權重（N 25% / R 30% / SR 25% / SSR 15% / UR 5%）
    rarityWeights: { N: 25, R: 30, SR: 25, SSR: 15, UR: 5 },

    // 卡片池（55 張）
    cards: [
        // 人物 (12 張)
        { id: 'elon_musk',     name: '伊隆·馬斯克',          rarity: 'UR',  category: 'person', image: 'assets/cards/person_elon_musk.svg',     desc: 'SpaceX、Tesla、xAI 創辦人，推動人類成為多行星物種' },
        { id: 'neil_armstrong', name: '尼爾·阿姆斯壯',       rarity: 'SSR', category: 'person', image: 'assets/cards/person_neil_armstrong.svg', desc: '1969 年首位登月太空人「個人一小步，人類一大步」' },
        { id: 'yuri_gagarin',   name: '尤里·加加林',         rarity: 'SSR', category: 'person', image: 'assets/cards/person_yuri_gagarin.svg',   desc: '1961 年首位進入太空的人類' },
        { id: 'buzz_aldrin',    name: '巴茲·奧爾德林',       rarity: 'SR',  category: 'person', image: 'assets/cards/person_buzz_aldrin.svg',    desc: '阿波羅 11 號登月艙駕駛員' },
        { id: 'sally_ride',     name: '薩利·賴德',           rarity: 'SR',  category: 'person', image: 'assets/cards/person_sally_ride.svg',     desc: '美國首位進入太空的女性' },
        { id: 'valentina',      name: '瓦倫京娜·捷列什科娃',  rarity: 'SR',  category: 'person', image: 'assets/cards/person_valentina.svg',      desc: '1963 年首位進入太空的女性' },
        { id: 'john_glenn',     name: '約翰·葛倫',           rarity: 'R',   category: 'person', image: 'assets/cards/person_john_glenn.svg',     desc: '美國首位環繞地球的太空人' },
        { id: 'chris_hadfield', name: '克里斯·哈德菲爾德',   rarity: 'R',   category: 'person', image: 'assets/cards/person_chris_hadfield.svg', desc: '加拿大首位太空站指揮官，太空吉他手' },
        { id: 'wang_yaping',    name: '王亞平',              rarity: 'R',   category: 'person', image: 'assets/cards/person_wang_yaping.svg',    desc: '中國首位太空授課女太空人' },
        { id: 'mae_jemison',    name: '梅·傑米森',           rarity: 'R',   category: 'person', image: 'assets/cards/person_mae_jemison.svg',    desc: '首位進入太空的非裔美國女性' },
        { id: 'jose_hernandez', name: '荷西·赫南德茲',       rarity: 'N',   category: 'person', image: 'assets/cards/person_jose_hernandez.svg', desc: '墨裔美籍太空人，勵志典範' },
        { id: 'tim_peake',      name: '提姆·皮克',           rarity: 'N',   category: 'person', image: 'assets/cards/person_tim_peake.svg',      desc: '英國 ESA 太空人，2015-2016 駐站' },

        // 公司/品牌 (8 張)
        { id: 'spacex_logo',    name: 'SpaceX',               rarity: 'SSR', category: 'company', image: 'assets/cards/spacex.svg',    desc: '可重複使用火箭的革命先驅' },
        { id: 'tesla_logo',     name: 'TESLA 特斯拉',         rarity: 'SR',  category: 'company', image: 'assets/cards/tesla.svg',     desc: '電動車與能源革命的領導者' },
        { id: 'xai_logo',       name: 'xAI',                  rarity: 'SR',  category: 'company', image: 'assets/cards/xai.svg',       desc: '馬斯克創辦的人工智慧公司' },
        { id: 'neuralink_logo', name: 'Neuralink',            rarity: 'SR',  category: 'company', image: 'assets/cards/neuralink.svg', desc: '腦機介面先驅' },
        { id: 'spcx_logo',      name: 'SPCX 太空指數',        rarity: 'UR',  category: 'company', image: 'assets/cards/spcx.svg',      desc: '太空探索指數，真實上市公司股票' },
        { id: 'nasa_logo',      name: 'NASA',                 rarity: 'SR',  category: 'company', image: 'assets/cards/nasa.svg',      desc: '美國國家航空暨太空總署' },
        { id: 'esa_logo',       name: 'ESA 歐洲太空總署',      rarity: 'N',   category: 'company', image: 'assets/cards/esa.svg',       desc: '歐洲多國合作的太空機構' },
        { id: 'cnsa_logo',      name: 'CNSA 中國國家航天局',   rarity: 'N',   category: 'company', image: 'assets/cards/cnsa.svg',      desc: '中國載人航天的幕後推手' },

        // 火箭 (10 張)
        { id: 'falcon1',        name: '🚀 Falcon 1',          rarity: 'R',   category: 'rocket',   image: 'assets/cards/rocket_falcon1.svg',  desc: 'SpaceX 處女作，獵鷹系列起點' },
        { id: 'falcon9',        name: '🚀 Falcon 9',          rarity: 'SR',  category: 'rocket',   image: 'assets/cards/rocket_falcon9.svg',  desc: '可重複使用的中型運載火箭' },
        { id: 'falcon_heavy',   name: '🚀 Falcon Heavy',      rarity: 'SR',  category: 'rocket',   image: 'assets/cards/rocket_fh.svg',       desc: '現役最強運載火箭之一' },
        { id: 'starship',       name: '🚀 Starship',          rarity: 'SSR', category: 'rocket',   image: 'assets/cards/rocket_starship.svg', desc: '史上最大火箭，目標火星' },
        { id: 'starship_hls',   name: '🌙 Starship HLS',      rarity: 'SSR', category: 'rocket',   image: 'assets/cards/rocket_hls.svg',      desc: 'Artemis 計畫月球著陸器' },
        { id: 'dragon',         name: '🐉 Dragon',            rarity: 'R',   category: 'rocket',   image: 'assets/cards/rocket_dragon.svg',   desc: '首艘商業載人太空船' },
        { id: 'sls',            name: '🚀 SLS',               rarity: 'R',   category: 'rocket',   image: 'assets/cards/rocket_sls.svg',      desc: 'NASA 太空發射系統' },
        { id: 'soyuz',          name: '🚀 Soyuz 聯合號',       rarity: 'N',   category: 'rocket',   image: 'assets/cards/rocket_soyuz.svg',    desc: '蘇聯傳奇載人火箭系列' },
        { id: 'ariane',         name: '🚀 Ariane 5',          rarity: 'N',   category: 'rocket',   image: 'assets/cards/rocket_ariane.svg',   desc: '歐洲主力運載火箭' },
        { id: 'electron',       name: '🚀 Electron',          rarity: 'N',   category: 'rocket',   image: 'assets/cards/rocket_electron.svg', desc: 'Rocket Lab 小型發射服務' },

        // 星球/天體 (12 張)
        { id: 'sun',            name: '☀️ 太陽',               rarity: 'SSR', category: 'planet',   image: 'assets/cards/planet_sun.svg',      desc: '太陽系中心，地球的能量源' },
        { id: 'mercury',        name: '☿️ 水星',              rarity: 'R',   category: 'planet',   image: 'assets/cards/planet_mercury.svg',  desc: '離太陽最近的行星' },
        { id: 'venus',          name: '♀️ 金星',              rarity: 'R',   category: 'planet',   image: 'assets/cards/planet_venus.svg',    desc: '太陽系最熱的行星' },
        { id: 'earth',          name: '🌍 地球',              rarity: 'SSR', category: 'planet',   image: 'assets/cards/planet_earth.svg',    desc: '人類的家園' },
        { id: 'moon',           name: '🌕 月球',              rarity: 'SR',  category: 'planet',   image: 'assets/cards/planet_moon.svg',     desc: '地球唯一天然衛星' },
        { id: 'mars',           name: '🔴 火星',              rarity: 'SSR', category: 'planet',   image: 'assets/cards/planet_mars.svg',     desc: '人類下一個登陸目標' },
        { id: 'jupiter',        name: '♃ 木星',              rarity: 'SR',  category: 'planet',   image: 'assets/cards/planet_jupiter.svg',  desc: '太陽系最大行星' },
        { id: 'saturn',         name: '🪐 土星',              rarity: 'SR',  category: 'planet',   image: 'assets/cards/planet_saturn.svg',   desc: '以壯麗光環聞名' },
        { id: 'uranus',         name: '⛢ 天王星',            rarity: 'N',   category: 'planet',   image: 'assets/cards/planet_uranus.svg',   desc: '側躺旋轉的冰巨星' },
        { id: 'neptune',        name: '♆ 海王星',            rarity: 'R',   category: 'planet',   image: 'assets/cards/planet_neptune.svg',  desc: '風速最快的行星' },
        { id: 'pluto',          name: '♇ 冥王星',            rarity: 'N',   category: 'planet',   image: 'assets/cards/planet_pluto.svg',    desc: '矮行星，神秘的古柏帶' },
        { id: 'titan',          name: '🌫 土衛六 Titan',      rarity: 'N',   category: 'planet',   image: 'assets/cards/planet_titan.svg',    desc: '土星最大衛星，有甲烷湖' },

        // 星系/天體 (4 張)
        { id: 'milky_way',      name: '🌌 銀河系',            rarity: 'SSR', category: 'galaxy',   image: 'assets/cards/galaxy_mw.svg',       desc: '我們所在的棒旋星系' },
        { id: 'andromeda',      name: '🌌 仙女座星系',        rarity: 'R',   category: 'galaxy',   image: 'assets/cards/galaxy_and.svg',      desc: '離銀河系最近的大星系' },
        { id: 'black_hole',     name: '🕳 黑洞',              rarity: 'SSR', category: 'galaxy',   image: 'assets/cards/blackhole.svg',       desc: '時空扭曲的極端天體' },
        { id: 'nebula',         name: '💫 蟹狀星雲',          rarity: 'R',   category: 'galaxy',   image: 'assets/cards/nebula.svg',          desc: '1054 年超新星爆炸的殘骸' },

        // 太空船/探測器 (6 張)
        { id: 'voyager1',       name: '🛸 Voyager 1',         rarity: 'SSR', category: 'spacecraft', image: 'assets/cards/voyager1.svg',      desc: '1977 年發射，目前最遠人造物體' },
        { id: 'voyager2',       name: '🛸 Voyager 2',         rarity: 'SR',  category: 'spacecraft', image: 'assets/cards/voyager2.svg',      desc: '唯一造訪過四大外行星的探測器' },
        { id: 'cassini',        name: '🛸 Cassini',           rarity: 'R',   category: 'spacecraft', image: 'assets/cards/cassini.svg',       desc: '土星探測傳奇，2017 年壯烈犧牲' },
        { id: 'new_horizons',   name: '🛸 New Horizons',      rarity: 'R',   category: 'spacecraft', image: 'assets/cards/horizons.svg',      desc: '首艘造訪冥王星的探測器' },
        { id: 'jwst',           name: '🔭 詹姆斯韋伯太空望遠鏡', rarity: 'SSR', category: 'spacecraft', image: 'assets/cards/jwst.svg',        desc: '史上最強紅外線太空望遠鏡' },
        { id: 'hubble',         name: '🔭 哈伯太空望遠鏡',      rarity: 'SR',  category: 'spacecraft', image: 'assets/cards/hubble.svg',        desc: '改變人類宇宙觀的經典望遠鏡' },

        // 太空站 (4 張)
        { id: 'iss',            name: '🛰 國際太空站 ISS',     rarity: 'SR',  category: 'station', image: 'assets/cards/iss.svg',             desc: '人類最大太空建築，1998 年起運作' },
        { id: 'tiangong',       name: '🛰 天宮太空站',         rarity: 'R',   category: 'station', image: 'assets/cards/tiangong.svg',        desc: '中國自主太空站' },
        { id: 'mir',            name: '🛰 和平號 Mir',         rarity: 'N',   category: 'station', image: 'assets/cards/mir.svg',             desc: '蘇聯傳奇太空站，1986-2001' },
        { id: 'gateway',        name: '🛰 月球門戶 Gateway',   rarity: 'R',   category: 'station', image: 'assets/cards/gateway.svg',         desc: 'NASA 計畫中的月球軌道站' }
    ]
};

// ================================================
// 燃料容量計算（共用，物理與 UI 必須一致）
// ================================================
// 升級等級 1-10 對應的燃料容量加成
// 曲線設計：Lv.5 可達月球 (180)，Lv.7 可達木星 (504)，Lv.8 可達海王星 (660)
const FUEL_LEVEL_BONUS = [0, 50, 120, 220, 350, 500, 680, 880, 1100, 1400];

function getFuelCapacity(rocket) {
    if (!rocket) return 100;
    // 1) 基礎容量 100
    // 2) 升級等級加成
    const levelBonus = FUEL_LEVEL_BONUS[rocket.fuel - 1] || 0;
    // 3) 裝備燃料槽加成
    const fuelTankId = GameState.equipment && GameState.equipment.fuelTank;
    const tankItem = fuelTankId ? CONFIG.equipmentItems[fuelTankId] : null;
    const equipBonus = tankItem && tankItem.bonus && tankItem.bonus.fuelCapacity
        ? tankItem.bonus.fuelCapacity : 0;
    return 100 + levelBonus + equipBonus;
}

// ================================================
// 初始化遊戲
// ================================================
function initGame() {
    // 創建初始火箭
    GameState.rockets.push(createRocket('scout'));

    // 初始化太空站
    GameState.stations = CONFIG.stations.map(s => ({ ...s }));

    // 初始化乘員
    GameState.crew.push(createCrewMember());

    // 生成初始任務
    generateAllAvailableMissions();

    // 更新 UI
    UI.updateAll();

    // 設定事件監聽
    setupEventListeners();

    console.log('🚀 SpaceX 完整版初始化完成！');
}

// ================================================
// 創建火箭
// ================================================
function createRocket(type) {
    const template = CONFIG.rocketTypes[type];
    return {
        id: Date.now() + Math.random(),
        type: type,
        name: template.name,
        hull: template.stats.hull,
        maxHull: template.stats.hull,
        engine: template.stats.engine,
        fuel: template.stats.fuel,
        shield: template.stats.shield,
        cargo: template.stats.cargo,
        slots: { ...template.slots },
        hasLifeSupport: template.hasLifeSupport,
        status: 'ready',
        equipment: {}
    };
}

// ================================================
// 創建乘員
// ================================================
function createCrewMember() {
    const name = CONFIG.crewNames[Math.floor(Math.random() * CONFIG.crewNames.length)];
    // 用姓名 hash 對應固定頭像（同名同頭像）
    const nameHash = name.split('').reduce((h, c) => h * 31 + c.charCodeAt(0), 0);
    const portrait = CONFIG.astronautPortraits[Math.abs(nameHash) % CONFIG.astronautPortraits.length];
    return {
        id: Date.now() + Math.random(),
        name: name,
        rank: CONFIG.crewRanks[0],
        rankIndex: 0,
        command: Math.floor(Math.random() * 20) + 15,
        engineering: Math.floor(Math.random() * 20) + 15,
        piloting: Math.floor(Math.random() * 20) + 15,
        experience: 0,
        portrait: portrait
    };
}

// 取得乘員升級所需經驗值
function getRankUpXP(currentRankIndex) {
    return CONFIG.rankUpXP[currentRankIndex] || Infinity;
}

// 取得乘員到下一級所需經驗
function getXPToNextRank(crew) {
    if (crew.rankIndex >= CONFIG.crewRanks.length - 1) return 0;
    const need = getRankUpXP(crew.rankIndex);
    return Math.max(0, need - crew.experience);
}

// 取得聲譽等級資訊
function getReputationLevel(reputation) {
    let level = CONFIG.reputationLevels[0];
    for (const lvl of CONFIG.reputationLevels) {
        if (reputation >= lvl.min) level = lvl;
    }
    return level;
}

// ================================================
// 生成任務（v3.0：單一起點、限制數量 10 個）
// ================================================

const MISSION_TARGET_COUNT = 10;  // 任務數量上限

/**
 * 動態產生 10 個任務
 * - 起點：GameState.currentLocation（地球或太空站）
 * - 終點：已解鎖的太空站（不可等於起點）
 * - 為每個目標站配 1-2 個任務類型
 * - 補足到剛好 10 個；超過則隨機取 10
 */
function generateAllAvailableMissions() {
    GameState.availableMissions = [];
    const currentLoc = GameState.currentLocation || 'earth';
    const originStation = currentLoc === 'earth'
        ? { id: 'earth', name: '地球', targetAltitude: 0, difficulty: 1, fuelRequired: 0, reward: { base: 0, multiplier: 1.0 }, needs: [], unlockReputation: 0, color: '#88ddff', size: 1 }
        : GameState.stations.find(s => s.id === currentLoc);

    if (!originStation) return;

    // 目標站：已解鎖 + 不是自己
    const targets = GameState.stations.filter(s =>
        s.id !== currentLoc && GameState.reputation >= s.unlockReputation
    );
    if (targets.length === 0) {
        targets.push(GameState.stations[0]);
    }

    const typeKeys = Object.keys(CONFIG.missionTypes);
    const targetStations = [...targets];

    // 為每個目標站配 1-2 個任務類型
    targetStations.forEach(target => {
        const count = Math.random() < 0.6 ? 2 : 1;  // 60% 機率 2 個
        const shuffled = typeKeys.slice().sort(() => Math.random() - 0.5);
        shuffled.slice(0, count).forEach(type => {
            GameState.availableMissions.push(
                generateMissionByOriginAndTarget(originStation, target, type)
            );
        });
    });

    // 補足到剛好 10 個
    while (GameState.availableMissions.length < MISSION_TARGET_COUNT) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        const type = typeKeys[Math.floor(Math.random() * typeKeys.length)];
        GameState.availableMissions.push(
            generateMissionByOriginAndTarget(originStation, target, type)
        );
    }

    // 超過則隨機取 10
    if (GameState.availableMissions.length > MISSION_TARGET_COUNT) {
        GameState.availableMissions = GameState.availableMissions
            .sort(() => Math.random() - 0.5)
            .slice(0, MISSION_TARGET_COUNT);
    }
}

/**
 * 依指定起點與終點產生任務
 */
function generateMissionByOriginAndTarget(origin, target, type) {
    if (type === 'comet_sample' && target.id !== 'comet') {
        const comet = GameState.stations.find(s => s.id === 'comet');
        if (comet) target = comet;
    }
    const typeInfo = CONFIG.missionTypes[type];
    const difficulty = Math.min(10, Math.max(1, target.difficulty + Math.floor(Math.random() * 3) - 1));
    const cargo = generateCargo(type, target, difficulty);
    const baseReward = Math.floor(target.reward.base * target.reward.multiplier * typeInfo.baseReward * (1 + difficulty * 0.2));
    return {
        id: Date.now() + Math.random() + Math.random(),
        type: type,
        originStation: origin.id,
        station: target,
        difficulty: difficulty,
        cargo: cargo,
        reward: baseReward,
        requirements: getMissionRequirements(type, target, difficulty)
    };
}

/**
 * 依指定類型與太空站產生任務（向後相容，預設地球起點）
 */
function generateMissionByTypeAndStation(type, station) {
    const earth = { id: 'earth', name: '地球' };
    return generateMissionByOriginAndTarget(earth, station, type);
}

function generateMissions(count) {
    GameState.availableMissions = [];
    for (let i = 0; i < count; i++) {
        GameState.availableMissions.push(generateSingleMission());
    }
}

function generateSingleMission() {
    // 過濾可用的太空站
    const availableStations = GameState.stations.filter(
        s => GameState.reputation >= s.unlockReputation
    );

    if (availableStations.length === 0) {
        availableStations.push(GameState.stations[0]);
    }

    // 選擇任務類型（特定類型對應特定太空站）
    const typeKeys = Object.keys(CONFIG.missionTypes);
    let type = typeKeys[Math.floor(Math.random() * typeKeys.length)];
    let station;

    // 彗星採樣任務固定以彗星為目標
    if (type === 'comet_sample') {
        const cometStation = availableStations.find(s => s.id === 'comet');
        station = cometStation || availableStations[Math.floor(Math.random() * availableStations.length)];
    } else {
        station = availableStations[Math.floor(Math.random() * availableStations.length)];
    }

    const typeInfo = CONFIG.missionTypes[type];

    // 計算難度
    const difficulty = Math.min(10, Math.max(1, station.difficulty + Math.floor(Math.random() * 3) - 1));

    // 生成貨物需求
    const cargo = generateCargo(type, station, difficulty);

    // 計算獎勵
    const baseReward = Math.floor(station.reward.base * station.reward.multiplier * typeInfo.baseReward * (1 + difficulty * 0.2));

    return {
        id: Date.now() + Math.random(),
        type: type,
        originStation: GameState.currentLocation || 'earth',
        station: station,
        difficulty: difficulty,
        cargo: cargo,
        reward: baseReward,
        requirements: getMissionRequirements(type, station, difficulty)
    };
}

function generateCargo(type, station, difficulty) {
    const items = [];
    let capacity = 0;

    const needCount = Math.min(station.needs.length, Math.floor(difficulty / 2) + 1);
    const selectedNeeds = station.needs.slice(0, needCount + Math.floor(Math.random() * 2));

    selectedNeeds.forEach(need => {
        const quantity = Math.floor((10 + difficulty * 10) * (0.8 + Math.random() * 0.4));
        items.push({ name: need, quantity: quantity });
        capacity += quantity;
    });

    if (type === 'crew') {
        items.push({ name: '太空人', quantity: Math.floor(1 + difficulty / 3) });
        capacity += items[items.length - 1].quantity;
    }

    return { items, capacity };
}

function getMissionRequirements(type, station, difficulty) {
    // 燃料需求 = 站點真實燃料需求 + 安全邊際 20%
    const fuelRequired = Math.ceil((station.fuelRequired || 30) * 1.2);
    return {
        minEngine: Math.ceil(difficulty / 3),
        minFuelLevel: Math.ceil(difficulty / 3),  // 等級需求（決定可攜帶多少燃料）
        minFuelCapacity: fuelRequired,           // 燃料容量需求（實際燃料單位）
        minShield: Math.ceil(difficulty / 4),
        minCargo: Math.ceil(difficulty / 2),
        needsLifeSupport: type === 'crew',
        minCrew: type === 'crew' ? 1 : 0
    };
}

// ================================================
// DOM 元素快取
// ================================================
const DOM = {};

function cacheDOM() {
    // 側邊欄
    DOM.sidebar = document.getElementById('sidebar');
    DOM.btnToggleSidebar = document.getElementById('btn-toggle-sidebar');

    // 貨幣
    DOM.credits = document.getElementById('credits-value');
    DOM.research = document.getElementById('research-value');
    DOM.reputation = document.getElementById('reputation-value');

    // 分頁
    DOM.tabs = document.querySelectorAll('.tab-btn');
    DOM.tabPanels = document.querySelectorAll('.tab-panel');

    // 火箭
    DOM.rocketsList = document.getElementById('rockets-list');
    DOM.rocketStats = document.getElementById('rocket-stats');
    DOM.upgradeButtons = document.getElementById('upgrade-buttons');
    DOM.btnBuyRocket = document.getElementById('btn-buy-rocket');

    // 升級面板
    DOM.upgradesList = document.getElementById('upgrades-list');

    // 裝備面板
    DOM.equipmentList = document.getElementById('equipment-list');
    DOM.equipmentShop = document.getElementById('equipment-shop');

    // 任務
    DOM.missionsList = document.getElementById('missions-list');
    DOM.missionDetails = document.getElementById('mission-details');
    DOM.missionInfo = document.getElementById('mission-info');
    DOM.btnAcceptMission = document.getElementById('btn-accept-mission');
    DOM.btnCancelMission = document.getElementById('btn-cancel-mission');
    DOM.currentMissionInfo = document.getElementById('current-mission-info');
    DOM.currentMissionName = document.getElementById('current-mission-name');

    // 太空站
    DOM.stationsList = document.getElementById('stations-list');

    // 乘員
    DOM.crewList = document.getElementById('crew-list');

    // 股票
    DOM.stockPrice = document.getElementById('stock-price');
    DOM.stockChange = document.getElementById('stock-change');
    DOM.stockSource = document.getElementById('stock-source');
    DOM.stockChart = document.getElementById('stock-chart');
    DOM.pfShares = document.getElementById('pf-shares');
    DOM.pfAvgCost = document.getElementById('pf-avg-cost');
    DOM.pfCost = document.getElementById('pf-cost');
    DOM.pfValue = document.getElementById('pf-value');
    DOM.pfProfit = document.getElementById('pf-profit');
    DOM.btnRefreshStock = document.getElementById('btn-refresh-stock');
    DOM.mirrorSymbol = document.getElementById('mirror-symbol');

    // 統計
    DOM.statLaunches = document.getElementById('stat-launches');
    DOM.statSuccess = document.getElementById('stat-success');
    DOM.statFailures = document.getElementById('stat-failures');
    DOM.statDistance = document.getElementById('stat-distance');
    DOM.statCargo = document.getElementById('stat-cargo');

    // 按鈕
    DOM.btnLaunch = document.getElementById('btn-launch');
    DOM.launchHint = document.getElementById('launch-hint');
    DOM.controlsHint = document.getElementById('controls-hint');
    DOM.btnContinue = document.getElementById('btn-continue');

    // HUD
    DOM.hud = document.getElementById('hud');
    DOM.hudAltitude = document.getElementById('hud-altitude');
    DOM.hudSpeed = document.getElementById('hud-speed');
    DOM.hudFuel = document.getElementById('hud-fuel');
    DOM.hudAngle = document.getElementById('hud-angle');
    DOM.hudHealth = document.getElementById('hud-health');
    DOM.hudHeat = document.getElementById('hud-heat');
    DOM.missionObjective = document.getElementById('mission-objective');

    // 疊加
    DOM.overlay = document.getElementById('overlay');
    DOM.overlayContent = document.getElementById('overlay-content');
    DOM.resultPanel = document.getElementById('result-panel');
    DOM.resultContent = document.getElementById('result-content');
    DOM.resultTitle = document.getElementById('result-title');
    DOM.resultMission = document.getElementById('result-mission');
    DOM.resultStats = document.getElementById('result-stats');
    DOM.resultRewards = document.getElementById('result-rewards');

    // 彈窗
    DOM.modalBuyRocket = document.getElementById('modal-buy-rocket');
    DOM.rocketShop = document.getElementById('rocket-shop');
    DOM.modalHireCrew = document.getElementById('modal-hire-crew');
    DOM.availableCrew = document.getElementById('available-crew');
    DOM.modalEquipment = document.getElementById('modal-equipment');
}

// ================================================
// UI 更新函式
// ================================================
const UI = {
    // 自動收合旗標（區分手動 vs 自動，避免污染 localStorage 使用者偏好）
    _autoCollapsed: false,

    /**
     * 切換側邊欄收合/展開狀態（手動觸發，會寫入 localStorage）
     */
    toggleSidebar() {
        const isCollapsed = DOM.sidebar.classList.toggle('collapsed');
        DOM.btnToggleSidebar.textContent = isCollapsed ? '▶' : '◀';
        DOM.btnToggleSidebar.setAttribute('aria-label', isCollapsed ? '展開側邊欄' : '收合側邊欄');
        // 手動操作清除自動旗標
        this._autoCollapsed = false;
        try {
            localStorage.setItem('spacex_sidebar_collapsed', isCollapsed ? '1' : '0');
        } catch (_) { /* 隱私模式可能拋錯，忽略 */ }
        // 收合時重整 canvas 尺寸
        if (typeof Physics !== 'undefined' && Physics.resizeCanvas) {
            setTimeout(() => Physics.resizeCanvas(), 300);
        }
    },

    /**
     * 載入時恢復收合狀態
     */
    restoreSidebarState() {
        let collapsed = false;
        try {
            collapsed = localStorage.getItem('spacex_sidebar_collapsed') === '1';
        } catch (_) { /* 忽略 */ }
        if (collapsed && DOM.sidebar && DOM.btnToggleSidebar) {
            DOM.sidebar.classList.add('collapsed');
            DOM.btnToggleSidebar.textContent = '▶';
            DOM.btnToggleSidebar.setAttribute('aria-label', '展開側邊欄');
        }
    },

    /**
     * 自動收合（發射時呼叫，給玩家最大遊戲畫面）
     * - 若已是收合狀態（手動或先前自動）→ 不動視覺，但也不標記為自動（避免覆蓋使用者偏好）
     * - 若之前是展開狀態 → 收合並標記為自動，任務結束會自動展開
     */
    collapseSidebarAuto() {
        if (!DOM.sidebar) return;
        const wasCollapsed = DOM.sidebar.classList.contains('collapsed');
        if (!wasCollapsed) {
            DOM.sidebar.classList.add('collapsed');
            if (DOM.btnToggleSidebar) {
                DOM.btnToggleSidebar.textContent = '▶';
                DOM.btnToggleSidebar.setAttribute('aria-label', '展開側邊欄');
            }
            // 收合時主動重整 canvas（不寫 localStorage，使用者下次重新整理會恢復偏好）
            if (typeof Physics !== 'undefined' && Physics.resizeCanvas) {
                setTimeout(() => Physics.resizeCanvas(), 300);
            }
            this._autoCollapsed = true;  // 本次任務是自動收合的
        }
        // 已是收合狀態：可能是手動收合或先前自動收合，不要覆蓋旗標
    },

    /**
     * 自動展開（任務結束回到 PREP 呼叫，僅還原本次自動收合的狀態）
     * 若使用者是手動收合的（旗標為 false），則不動作，保留使用者偏好
     */
    expandSidebarAuto() {
        if (!this._autoCollapsed) return;
        if (!DOM.sidebar) return;
        if (DOM.sidebar.classList.contains('collapsed')) {
            DOM.sidebar.classList.remove('collapsed');
            if (DOM.btnToggleSidebar) {
                DOM.btnToggleSidebar.textContent = '◀';
                DOM.btnToggleSidebar.setAttribute('aria-label', '收合側邊欄');
            }
            if (typeof Physics !== 'undefined' && Physics.resizeCanvas) {
                setTimeout(() => Physics.resizeCanvas(), 300);
            }
        }
        this._autoCollapsed = false;
    },

    updateAll() {
        this.updateCurrency();
        this.updateStats();
        this.updateRocketList();
        this.updateRocketStats();
        this.updateUpgradeList();
        this.updateEquipmentSummary();
        this.updateMissionList();
        this.updateStationList();
        this.updateCrewList();
        this.updateMissionInfo();
        this.updateStockPanel();
        this.updateCardAlbum();
    },

    // 刪除火箭
    deleteRocket(index) {
        if (GameState.rockets.length <= 1) {
            if (UI && typeof UI.toast === 'function') UI.toast('⚠️ 至少需要保留 1 個火箭', 'warn');
            else alert('⚠️ 至少需要保留 1 個火箭');
            return;
        }
        const rocket = GameState.rockets[index];
        if (!rocket) return;
        if (!confirm(`確定要刪除「${rocket.name}」嗎？\n此操作無法復原。`)) return;

        // 退款 50%（給玩家一點補償）
        const template = CONFIG.rocketTypes[rocket.type];
        const refund = Math.floor((template?.basePrice || 0) * 0.5);
        GameState.credits += refund;
        GameState.rockets.splice(index, 1);
        if (GameState.selectedRocketIndex >= GameState.rockets.length) {
            GameState.selectedRocketIndex = GameState.rockets.length - 1;
        }
        SaveSystem.save();
        UI.updateAll();
        if (UI && typeof UI.toast === 'function') {
            UI.toast(`🗑️ 已刪除 ${rocket.name}，退款 $${refund.toLocaleString()}`, 'success');
        } else {
            alert(`🗑️ 已刪除 ${rocket.name}，退款 $${refund.toLocaleString()}`);
        }
    },

    // 解散太空人
    deleteCrew(crewId) {
        // dataset 會把值轉成字串，c.id 是數字，用 String() 統一比較
        const idx = GameState.crew.findIndex(c => String(c.id) === String(crewId));
        if (idx < 0) {
            console.warn('deleteCrew: 找不到 crew', crewId, '現有 ids:', GameState.crew.map(c => c.id));
            return;
        }
        const member = GameState.crew[idx];
        if (!confirm(`確定要解散太空人「${member.name}」嗎？\n此操作無法復原。`)) return;

        GameState.crew.splice(idx, 1);
        GameState.hiredCrewCount = Math.max(0, GameState.hiredCrewCount - 1);
        SaveSystem.save();
        UI.updateAll();
        if (UI && typeof UI.toast === 'function') {
            UI.toast(`🗑️ 已解散 ${member.name}`, 'success');
        } else {
            alert(`🗑️ 已解散 ${member.name}`);
        }
    },

    // 卡片相簿渲染
    updateCardAlbum(filter = 'all') {
        const grid = document.getElementById('card-album-grid');
        if (!grid) return;
        const cards = CardSystem.getAllCards();
        const filtered = cards.filter(c => {
            if (filter === 'all') return true;
            if (filter === 'owned') return c.owned;
            if (filter === 'unowned') return !c.owned;
            return c.category === filter;
        });

        grid.innerHTML = filtered.map(c => {
            const color = CONFIG.rarityColors[c.rarity] || '#888';
            if (c.owned) {
                return `
                    <div class="album-card owned" style="--rarity-color: ${color}"
                         data-card-id="${c.id}" title="${c.desc}">
                        <div class="album-card-rarity">${c.rarity}</div>
                        <img class="album-card-image" src="${c.image}" alt="${c.name}"
                             onerror="this.onerror=null;this.src='assets/cards/placeholder.svg'">
                        <div class="album-card-name">${c.name}</div>
                    </div>
                `;
            } else {
                return `
                    <div class="album-card unowned" style="--rarity-color: ${color}" title="未解鎖">
                        <div class="album-card-rarity">${c.rarity}</div>
                        <div class="album-card-silhouette">❓</div>
                        <div class="album-card-name">???</div>
                    </div>
                `;
            }
        }).join('');

        // 進度條
        const progress = CardSystem.getProgress();
        const txt = document.getElementById('card-progress-text');
        if (txt) txt.textContent = `${progress.owned}/${progress.total} (${progress.percent}%)`;
        const fill = document.getElementById('card-progress-fill');
        if (fill) fill.style.width = progress.percent + '%';

        // 稀有度統計
        const statsEl = document.getElementById('card-rarity-stats');
        if (statsEl) {
            const stats = CardSystem.getRarityStats();
            statsEl.innerHTML = ['N','R','SR','SSR','UR']
                .map(r => `<span style="color:${CONFIG.rarityColors[r]};margin-left:6px">${r}:${stats[r]||0}</span>`)
                .join('');
        }

        // 綁定已擁有卡片的點擊事件
        grid.querySelectorAll('.album-card.owned').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.dataset.cardId;
                UI.showCardDetail(id);
            });
        });
    },

    // 卡片詳情
    showCardDetail(cardId) {
        const card = CardSystem.getCardById(cardId);
        if (!card) return;
        const color = CONFIG.rarityColors[card.rarity] || '#888';
        const owned = GameState.cardCollection.includes(cardId);
        const modal = document.getElementById('modal-card-detail');
        const content = document.getElementById('card-detail-content');
        if (!modal || !content) return;
        content.innerHTML = `
            <div class="album-card ${owned ? 'owned' : 'unowned'}" style="--rarity-color: ${color}">
                <div class="album-card-rarity">${card.rarity}</div>
                ${owned
                    ? `<img class="album-card-image" src="${card.image}" alt="${card.name}" onerror="this.onerror=null;this.src='assets/cards/placeholder.svg'">`
                    : `<div class="album-card-silhouette">❓</div>`}
                <div class="album-card-name">${owned ? card.name : '???'}</div>
            </div>
            <h3>${owned ? card.name : '未知卡片'}</h3>
            <p>${owned ? card.desc : '完成任務抽取卡片以解鎖'}</p>
            <p style="font-size:11px;color:#666">分類: ${card.category} | 稀有度: ${card.rarity}</p>
            <button class="btn-secondary" onclick="document.getElementById('modal-card-detail').classList.add('hidden')">關閉</button>
        `;
        modal.classList.remove('hidden');
    },

    updateCurrency() {
        DOM.credits.textContent = GameState.credits.toLocaleString();
        DOM.research.textContent = GameState.research.toLocaleString();
        // 聲譽等級顯示
        const rep = GameState.reputation;
        const lvl = getReputationLevel(rep);
        const nextLvl = CONFIG.reputationLevels.find(l => l.level === lvl.level + 1);
        let repText = `⭐ ${rep}`;
        if (nextLvl) {
            const need = nextLvl.min - rep;
            repText += ` (${lvl.name} → ${nextLvl.name} 還差 ${need})`;
        } else {
            repText += ` (${lvl.name} MAX)`;
        }
        DOM.reputation.textContent = repText;
        DOM.reputation.title = `等級 ${lvl.level}: ${lvl.name}`;
    },

    updateStats() {
        DOM.statLaunches.textContent = GameState.stats.launches;
        DOM.statSuccess.textContent = GameState.stats.successfulLandings;
        DOM.statFailures.textContent = GameState.stats.failures;
        DOM.statDistance.textContent = (GameState.stats.totalDistance / 1000).toFixed(1) + 'k km';
        DOM.statCargo.textContent = GameState.stats.cargoDelivered;
    },

    // 火箭列表
    updateRocketList() {
        DOM.rocketsList.innerHTML = '';
        GameState.rockets.forEach((rocket, index) => {
            const card = document.createElement('div');
            card.className = 'rocket-card' + (index === GameState.selectedRocketIndex ? ' selected' : '');
            const healthPercent = Math.round((rocket.hull / rocket.maxHull) * 100);
            let healthClass = healthPercent < 30 ? 'critical' : (healthPercent < 60 ? 'damaged' : '');

            const imgSrc = CONFIG.rocketImages[rocket.type] || 'assets/rockets/scout.svg';
            const canDelete = GameState.rockets.length > 1;

            card.innerHTML = `
                <img class="rocket-card-image" src="${imgSrc}" alt="${rocket.name}" loading="lazy">
                <div class="rocket-card-header">
                    <span class="rocket-name">${rocket.name}</span>
                    <span class="rocket-type">${rocket.type}</span>
                    <div class="rocket-health ${healthClass}">
                        結構: ${healthPercent}% ${healthClass === 'critical' ? '⚠️' : ''}
                    </div>
                </div>
                <button class="btn-rocket-delete" data-rocket-index="${index}"
                        title="${canDelete ? '刪除此火箭' : '至少需要 1 個火箭'}" ${canDelete ? '' : 'disabled'}>🗑️</button>
            `;
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-rocket-delete')) return;  // 刪除按鈕不觸發選取
                GameState.selectedRocketIndex = index;
                this.updateRocketList();
                this.updateRocketStats();
                this.updateUpgradeList();
                this.updateEquipmentSummary();
                this.updateMissionList();
            });
            DOM.rocketsList.appendChild(card);
        });
    },

    // 火箭屬性
    updateRocketStats() {
        const rocket = GameState.rockets[GameState.selectedRocketIndex];
        if (!rocket) return;

        document.getElementById('stat-hull').style.width = Math.round(rocket.hull / rocket.maxHull * 100) + '%';
        document.getElementById('stat-hull-val').textContent = Math.round(rocket.hull / rocket.maxHull * 100) + '%';
        document.getElementById('stat-engine').style.width = rocket.engine / 10 * 100 + '%';
        document.getElementById('stat-engine-val').textContent = 'Lv.' + rocket.engine;
        document.getElementById('stat-fuel').style.width = rocket.fuel / 10 * 100 + '%';
        document.getElementById('stat-fuel-val').textContent = 'Lv.' + rocket.fuel;
        document.getElementById('stat-shield').style.width = rocket.shield / 10 * 100 + '%';
        document.getElementById('stat-shield-val').textContent = 'Lv.' + rocket.shield;
        document.getElementById('stat-cargo').style.width = rocket.cargo / 10 * 100 + '%';
        document.getElementById('stat-cargo-val').textContent = 'Lv.' + rocket.cargo;
    },

    // 升級列表
    updateUpgradeList() {
        const rocket = GameState.rockets[GameState.selectedRocketIndex];
        if (!rocket) return;

        DOM.upgradesList.innerHTML = '';
        const categories = ['engine', 'fuel', 'shield', 'cargo'];

        categories.forEach(cat => {
            const config = CONFIG.upgradeCategories[cat];
            const currentLevel = rocket[cat];
            const nextCost = currentLevel < config.maxLevel ? config.costs[currentLevel] : null;
            const isMaxed = currentLevel >= config.maxLevel;
            const canAfford = nextCost && GameState.credits >= nextCost;

            const card = document.createElement('div');
            card.className = 'upgrade-card';
            card.innerHTML = `
                <div class="upgrade-header">
                    <span class="upgrade-icon">${config.icon}</span>
                    <span class="upgrade-name">${config.name}</span>
                    <span class="upgrade-level">Lv.${currentLevel}</span>
                </div>
                <div class="upgrade-bar-container">
                    <div class="upgrade-bar" style="width: ${currentLevel / config.maxLevel * 100}%"></div>
                </div>
                <div class="upgrade-effect">下一級: +${config.bonusPerLevel[currentLevel + 1] || 0}</div>
                <div class="upgrade-cost">${isMaxed ? '已滿級' : '$' + (nextCost?.toLocaleString() || '')}</div>
                <button class="btn-upgrade-full" data-upgrade="${cat}" ${isMaxed || !canAfford ? 'disabled' : ''}>
                    ${isMaxed ? '已滿級' : '升級'}
                </button>
            `;

            card.querySelector('button').addEventListener('click', () => UpgradeSystem.upgrade(cat));
            DOM.upgradesList.appendChild(card);
        });
    },

    // 火箭面板的裝備摘要（已裝備的裝備一覽）
    updateEquipmentSummary() {
        const el = document.getElementById('equipment-summary');
        if (!el) return;
        const rocket = GameState.rockets[GameState.selectedRocketIndex];
        if (!rocket) { el.innerHTML = ''; return; }

        // 計算總容量給玩家看
        const totalFuel = getFuelCapacity(rocket);

        const equipped = EQUIPMENT_SLOTS
            .map(s => {
                const id = GameState.equipment[s.key];
                if (!id) return null;
                const item = CONFIG.equipmentItems[id];
                return item ? `<span style="color:#00ff88">${s.name} ${item.name}</span>` : null;
            })
            .filter(Boolean);

        el.innerHTML = `
            <div style="margin-top: 6px; padding: 6px; background: var(--color-bg-light); border-radius: 4px; font-size: 0.9em;">
                <div>⛽ <b>燃料容量: ${totalFuel}</b> 單位</div>
                <div style="color: #888; margin-top: 4px;">${equipped.length > 0 ? equipped.join(' / ') : '（未安裝任何裝備）'}</div>
            </div>
        `;
    },

    // 任務列表
    updateMissionList() {
        DOM.missionsList.innerHTML = '';
        // 顯示玩家當前位置
        const currentLoc = GameState.currentLocation || 'earth';
        const locStation = currentLoc === 'earth'
            ? { name: '🌍 地球', id: 'earth' }
            : (GameState.stations.find(s => s.id === currentLoc) || { name: currentLoc, id: currentLoc });
        const locBadge = document.getElementById('current-location-badge');
        if (locBadge) locBadge.textContent = `📍 ${locStation.name}`;

        // 取得當前火箭與燃料容量（每張任務卡共用）
        const rocket = GameState.rockets[GameState.selectedRocketIndex];
        const fuelCapacity = rocket ? getFuelCapacity(rocket) : 0;

        GameState.availableMissions.forEach((mission, index) => {
            const typeInfo = CONFIG.missionTypes[mission.type];
            const card = document.createElement('div');
            card.className = 'mission-card';
            const originName = mission.originStation === 'earth' ? '🌍 地球' : (GameState.stations.find(s => s.id === mission.originStation)?.name || mission.originStation);
            const needFuel = mission.requirements?.minFuelCapacity || 0;
            const fuelOk = fuelCapacity >= needFuel;
            card.innerHTML = `
                <div class="mission-header">
                    <span class="mission-name">${typeInfo.icon} ${typeInfo.name}</span>
                    <span class="mission-reward">$${mission.reward.toLocaleString()}</span>
                </div>
                <div class="mission-info-row">
                    <span class="mission-route">${originName} → <b>${mission.station.name}</b></span>
                </div>
                <div class="mission-info-row">
                    <span class="mission-difficulty">難度 ${'⭐'.repeat(mission.difficulty)}</span>
                    <span class="mission-fuel" style="color: ${fuelOk ? '#00ff88' : '#ff4466'}; margin-left: 8px;">
                        ⛽ ${needFuel} 燃料 ${fuelOk ? '✅' : '❌'}
                    </span>
                </div>
            `;
            card.addEventListener('click', () => showMissionDetails(index));
            DOM.missionsList.appendChild(card);
        });
    },

    updateMissionInfo() {
        if (GameState.currentMission) {
            const m = GameState.currentMission;
            const typeInfo = CONFIG.missionTypes[m.type];
            DOM.currentMissionInfo.classList.remove('hidden');
            DOM.currentMissionName.textContent = `${typeInfo.icon} ${m.station.name}`;
            DOM.btnLaunch.disabled = false;
            DOM.launchHint.textContent = '準備就緒！';
        } else {
            DOM.currentMissionInfo.classList.add('hidden');
            DOM.btnLaunch.disabled = true;
            DOM.launchHint.textContent = '選擇任務後點擊發射';
        }
    },

    // 太空站列表
    updateStationList() {
        DOM.stationsList.innerHTML = '';
        GameState.stations.forEach(station => {
            const locked = GameState.reputation < station.unlockReputation;
            const card = document.createElement('div');
            card.className = 'station-card' + (locked ? ' locked' : '');
            card.innerHTML = `
                <div class="station-header">
                    <span class="station-name">🏭 ${station.name}</span>
                    <span class="station-altitude">${(station.altitude / 1000).toFixed(0)}k km</span>
                </div>
                ${locked ? `<div class="station-locked">需要 ${station.unlockReputation} 聲譽</div>` :
                    `<div class="station-needs">需求: ${station.needs.slice(0, 2).join(', ')}</div>`}
            `;
            DOM.stationsList.appendChild(card);
        });
    },

    // 乘員列表
    updateCrewList() {
        DOM.crewList.innerHTML = '';
        if (GameState.crew.length === 0) {
            DOM.crewList.innerHTML = '<p style="color: var(--color-text-dim)">目前沒有太空人</p>';
            return;
        }
        GameState.crew.forEach(member => {
            const card = document.createElement('div');
            card.className = 'crew-card';

            // 經驗值資料
            const need = getRankUpXP(member.rankIndex);
            const isMax = member.rankIndex >= CONFIG.crewRanks.length - 1;
            const xpToNext = getXPToNextRank(member);
            const xpPercent = isMax ? 100 : Math.round((member.experience / need) * 100);

            card.innerHTML = `
                <img class="crew-portrait" src="${member.portrait}" alt="${member.name}" loading="lazy">
                <div class="crew-info">
                    <div class="crew-name">${member.name}</div>
                    <div class="crew-rank">
                        <span class="rank-badge">${member.rank}</span>
                        <span class="rank-level">Lv.${member.rankIndex + 1}</span>
                    </div>
                    <div class="crew-skills">
                        <span class="skill" title="指揮">🎖️ ${member.command}</span>
                        <span class="skill" title="工程">🔧 ${member.engineering}</span>
                        <span class="skill" title="駕駛">✈️ ${member.piloting}</span>
                    </div>
                    <div class="crew-xp">
                        <div class="xp-bar">
                            <div class="xp-fill" style="width: ${xpPercent}%"></div>
                        </div>
                        <div class="xp-text">
                            ${isMax ? '✨ MAX 滿級' : `${member.experience} / ${need} XP（還需 ${xpToNext}）`}
                        </div>
                    </div>
                </div>
                <button class="btn-crew-delete" data-crew-id="${member.id}" title="解散此太空人">🗑️</button>
            `;
            DOM.crewList.appendChild(card);
        });
    },

    /**
     * 更新股票面板：當前價、漲跌、投資組合、價格曲線
     */
    updateStockPanel() {
        if (!DOM.stockPrice) return;
        const pf = StockSystem.getPortfolio();
        const stock = GameState.stocks.SPCX;

        // 當前價格
        DOM.stockPrice.textContent = '$' + pf.price.toFixed(2);

        // 漲跌（與前一筆歷史比）
        const hist = stock.history;
        if (hist.length >= 2) {
            const prev = hist[hist.length - 2];
            const diff = pf.price - prev;
            const pct = prev ? (diff / prev * 100) : 0;
            const sign = diff >= 0 ? '+' : '';
            DOM.stockChange.textContent = `${sign}${diff.toFixed(2)} (${sign}${pct.toFixed(2)}%)`;
            DOM.stockChange.className = 'stock-change ' + (diff >= 0 ? 'up' : 'down');
        } else {
            DOM.stockChange.textContent = '—';
            DOM.stockChange.className = 'stock-change';
        }

        // 來源說明
        const srcText = stock.source === 'real'
            ? `即時行情 (鏡像 ${stock.lastRealSymbol}) · ${new Date(stock.lastFetch).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`
            : `離線模擬 ±3% · ${new Date(stock.lastFetch).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`;
        DOM.stockSource.textContent = srcText;

        // 投資組合
        DOM.pfShares.textContent = pf.shares.toLocaleString();
        DOM.pfAvgCost.textContent = '$' + pf.avgCost.toFixed(2);
        DOM.pfCost.textContent = '$' + Math.round(pf.costBasis).toLocaleString();
        DOM.pfValue.textContent = '$' + Math.round(pf.marketValue).toLocaleString();
        const profitSign = pf.profit >= 0 ? '+' : '';
        const profitClass = pf.profit >= 0 ? 'profit-up' : 'profit-down';
        DOM.pfProfit.textContent = `${profitSign}$${Math.round(pf.profit).toLocaleString()} (${profitSign}${pf.profitPct.toFixed(1)}%)`;
        DOM.pfProfit.className = profitClass;

        // 對標股票說明
        if (DOM.mirrorSymbol) DOM.mirrorSymbol.textContent = StockSystem.REAL_SYMBOL;

        // 繪製價格曲線
        this.drawStockChart();
    },

    /**
     * 繪製股票價格折線圖
     */
    drawStockChart() {
        if (!DOM.stockChart) return;
        const ctx = DOM.stockChart.getContext('2d');
        const w = DOM.stockChart.width;
        const h = DOM.stockChart.height;
        const hist = GameState.stocks.SPCX.history;

        ctx.clearRect(0, 0, w, h);

        if (hist.length < 2) {
            // 無資料時顯示提示文字
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('點「重新整理股價」載入歷史', w / 2, h / 2);
            return;
        }

        // 找最大最小值
        const min = Math.min(...hist);
        const max = Math.max(...hist);
        const range = max - min || 1;
        const pad = 8;
        const chartH = h - pad * 2;
        const chartW = w - pad * 2;
        const stepX = chartW / (hist.length - 1);

        // 判斷漲跌顏色（與第一筆比較）
        const isUp = hist[hist.length - 1] >= hist[0];
        const color = isUp ? '#00ff88' : '#ff4466';
        const fillColor = isUp ? 'rgba(0,255,136,0.15)' : 'rgba(255,68,102,0.15)';

        // 繪製填充區
        ctx.beginPath();
        ctx.moveTo(pad, h - pad);
        hist.forEach((v, i) => {
            const x = pad + i * stepX;
            const y = pad + (1 - (v - min) / range) * chartH;
            if (i === 0) ctx.lineTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.lineTo(pad + (hist.length - 1) * stepX, h - pad);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();

        // 繪製折線
        ctx.beginPath();
        hist.forEach((v, i) => {
            const x = pad + i * stepX;
            const y = pad + (1 - (v - min) / range) * chartH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 最後一點圓點
        const lastX = pad + (hist.length - 1) * stepX;
        const lastY = pad + (1 - (hist[hist.length - 1] - min) / range) * chartH;
        ctx.beginPath();
        ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    },

    // HUD 更新
    updateHUD(rocket) {
        if (!rocket) return;
        const altitude = Math.max(0, Math.round(rocket.y / 10));
        const speed = Math.round(Math.sqrt(rocket.vx ** 2 + rocket.vy ** 2) * 10);
        const fuelPercent = Math.round((rocket.fuel / rocket.maxFuel) * 100);
        const angleDeg = Math.round((rocket.angle * 180) / Math.PI);
        const healthPercent = Math.round((rocket.hull / rocket.maxHull) * 100);

        DOM.hudAltitude.textContent = altitude;
        DOM.hudSpeed.textContent = speed;
        DOM.hudFuel.textContent = fuelPercent;
        DOM.hudAngle.textContent = angleDeg;
        DOM.hudHealth.textContent = healthPercent + '%';
        DOM.hudHeat.textContent = Math.round(rocket.heat);

        if (altitude > GameState.maxAltitude) GameState.maxAltitude = altitude;

        if (GameState.currentMission) {
            const station = GameState.currentMission.station;
            const targetY = station.targetAltitude;
            const targetAlt = Math.round(targetY / 10);
            const reached = rocket.targetReached || rocket.y <= targetY;
            const progress = Math.min(100, Math.round((rocket.y / targetY) * 100));

            // 真實距離（公里）
            const realDistKm = station.altitude; // altitude 本身是 km
            const realDistDisplay = realDistKm >= 1000000
                ? (realDistKm / 1000000).toFixed(1) + 'M km'
                : realDistKm >= 1000
                    ? (realDistKm / 1000).toFixed(0) + 'k km'
                    : realDistKm.toFixed(0) + ' km';

            if (rocket.y < targetY * 0.5) {
                DOM.missionObjective.innerHTML = `📍 前往 <strong>${station.name}</strong><br><small>距離 ${realDistDisplay} | 進度 ${progress}%</small>`;
            } else if (reached) {
                DOM.missionObjective.innerHTML = `✅ 已達標！返回基地<br><small>${station.name}</small>`;
            } else {
                DOM.missionObjective.innerHTML = `🎯 即將抵達<br><small>${station.name} (${progress}%)</small>`;
            }
        }
    },

    // 結算面板
    showResult(success, data) {
        if (this._resultShown) return;
        this._resultShown = true;

        DOM.resultPanel.classList.remove('hidden');

        if (success) {
            DOM.resultTitle.textContent = '🎉 任務成功！';
            DOM.resultTitle.className = 'success';

            const m = GameState.currentMission;
            const base = m ? m.reward : 1000;
            const altitudeBonus = Math.floor(GameState.maxAltitude / 100) * 20;
            const fuelBonus = Math.floor((data.fuel / data.maxFuel) * 150);
            const healthBonus = Math.floor((data.hull / data.maxHull) * 200);
            const crewBonus = GameState.crew.reduce((sum, c) => sum + Math.floor(c.command / 10) * 30, 0);
            const total = base + altitudeBonus + fuelBonus + healthBonus + crewBonus;

            // 完美著陸判定（速度 < 10、角度 < 5°、結構 > 90%）
            const isPerfect = data.hull / data.maxHull > 0.9 && data.fuel / data.maxFuel > 0.5;

            // ===== 聲譽計算（多管道）=====
            let repGain = 0;
            const repBreakdown = [];
            const repSrc = CONFIG.reputationSources;

            const baseRep = m ? repSrc.missionSuccess(m.difficulty) : repSrc.freeFlight();
            repGain += baseRep;
            repBreakdown.push({ label: m ? `任務成功 (難度 ${m.difficulty}★)` : '自由飛行', value: baseRep });

            // 連勝獎勵
            GameState.missionStreak++;
            if (GameState.missionStreak >= 2) {
                const streakRep = repSrc.missionStreak(GameState.missionStreak);
                repGain += streakRep;
                repBreakdown.push({ label: `連勝獎勵 (${GameState.missionStreak}連勝)`, value: streakRep });
            }

            // 首次到站
            if (m && !GameState.visitedStations.includes(m.station.id)) {
                GameState.visitedStations.push(m.station.id);
                const firstRep = repSrc.firstStationVisit(m.station.id);
                repGain += firstRep;
                repBreakdown.push({ label: `🆕 首次到站: ${m.station.name}`, value: firstRep });
                this.toast(`首次到站: ${m.station.name}！+${firstRep} 聲譽`, 'success');
            }

            // 完美著陸
            if (isPerfect) {
                GameState.stats.perfectLandings++;
                const perfectRep = repSrc.perfectLanding();
                repGain += perfectRep;
                repBreakdown.push({ label: '⭐ 完美著陸', value: perfectRep });
            }

            GameState.credits += total;
            GameState.research += Math.floor(total * 0.15);
            GameState.reputation += repGain;
            GameState.stats.successfulLandings++;
            GameState.stats.cargoDelivered += m?.cargo?.capacity || 0;
            GameState.stats.totalDistance += GameState.maxAltitude * 2;

            // ===== SPCX 股票獎勵（任務成功）=====
            const sharesAwarded = StockSystem.awardForMission(total);
            const stockPrice = GameState.stocks.SPCX.currentPrice || 0;
            const stockValue = sharesAwarded * stockPrice;
            SaveSystem.save();

            // ===== 抽卡觸發（延遲 1.5 秒讓玩家看見結算）=====
            setTimeout(() => {
                try {
                    const newCard = CardSystem.rollCard();
                    CardAnimation.show(newCard);
                } catch (err) {
                    console.warn('抽卡失敗：', err);
                }
            }, 1500);

            // ===== 乘員升級（使用 rankUpXP 陣列）=====
            const crewLevelUps = [];
            GameState.crew.forEach(c => {
                const xpGain = 15 + m?.difficulty * 5;
                c.experience += xpGain;

                // 持續升級檢查（可能一次跳多級）
                while (c.rankIndex < CONFIG.crewRanks.length - 1 && c.experience >= getRankUpXP(c.rankIndex)) {
                    c.experience -= getRankUpXP(c.rankIndex);
                    c.rankIndex++;
                    c.rank = CONFIG.crewRanks[c.rankIndex];
                    crewLevelUps.push({ name: c.name, rank: c.rank, rankIndex: c.rankIndex });
                }

                // 升級聲譽獎勵
                crewLevelUps.forEach(up => {
                    if (up.name === c.name) {
                        const rankRep = repSrc.crewRankUp(c.rankIndex);
                        GameState.reputation += rankRep;
                        repBreakdown.push({ label: `🎖️ ${c.name} 升至 ${c.rank}`, value: rankRep });
                    }
                });
            });

            // 延遲顯示升級 Toast
            crewLevelUps.forEach((up, i) => {
                setTimeout(() => this.toast(`🎖️ ${up.name} 晉升為 ${up.rank}！`, 'success'), 500 + i * 800);
            });

            DOM.resultMission.innerHTML = m ? `${CONFIG.missionTypes[m.type].icon} ${m.station.name}` : '自由飛行';
            DOM.resultStats.innerHTML = `
                <div class="result-row"><span>最高高度</span><span>${GameState.maxAltitude} m</span></div>
                <div class="result-row"><span>燃料</span><span>${Math.round(data.fuel / data.maxFuel * 100)}%</span></div>
                <div class="result-row"><span>結構</span><span>${Math.round(data.hull / data.maxHull * 100)}%</span></div>
                <div class="result-row"><span>連勝</span><span>🔥 ${GameState.missionStreak}</span></div>
            `;
            const repHTML = repBreakdown.map(r => `<div class="reward-row"><span>${r.label}</span><span style="color:#ffcc00">+${r.value} ⭐</span></div>`).join('');
            DOM.resultRewards.innerHTML = `
                <div class="reward-row"><span>基本獎勵</span><span>+$${base.toLocaleString()}</span></div>
                <div class="reward-row"><span>高度加成</span><span>+$${altitudeBonus.toLocaleString()}</span></div>
                <div class="reward-row"><span>燃料獎勵</span><span>+$${fuelBonus.toLocaleString()}</span></div>
                <div class="reward-row"><span>結構獎勵</span><span>+$${healthBonus.toLocaleString()}</span></div>
                ${crewBonus > 0 ? `<div class="reward-row"><span>乘員加成</span><span>+$${crewBonus.toLocaleString()}</span></div>` : ''}
                <div class="reward-row"><span>總獎勵</span><span>+$${total.toLocaleString()}</span></div>
                <div class="reward-divider">📈 SPCX 股票獎勵</div>
                <div class="reward-row"><span>獲得股數</span><span style="color:#00d4ff">+${sharesAwarded.toLocaleString()} 股</span></div>
                <div class="reward-row"><span>當前股價</span><span>$${stockPrice.toFixed(2)}</span></div>
                <div class="reward-row"><span>本次獎勵市值</span><span style="color:#00ff88">$${Math.round(stockValue).toLocaleString()}</span></div>
                <div class="reward-divider">⭐ 聲譽獲得</div>
                ${repHTML}
                <div class="reward-row total"><span>聲譽總計</span><span>+${repGain} ⭐</span></div>
            `;

            // v3.0：更新玩家當前位置（抵達目標站）
            if (data?.station && GameState.currentMission) {
                GameState.currentLocation = GameState.currentMission.station.id;
            }
            // 生成新任務填補列表（v3.0：依新位置生成 10 個）
            generateAllAvailableMissions();
        } else {
            // 失敗：重置連勝
            GameState.missionStreak = 0;
            DOM.resultTitle.textContent = '💥 ' + (data.reason || '任務失敗');
            DOM.resultTitle.className = 'failure';
            GameState.stats.failures++;
            DOM.resultStats.innerHTML = `<div class="result-row"><span>原因</span><span>${data.reason}</span></div>`;
            DOM.resultRewards.innerHTML = '<div class="reward-row"><span>獎勵</span><span>+$0</span></div><div class="reward-row"><span>連勝中斷</span><span>🔥 已重置</span></div>';
            // 失敗也補滿任務池
            generateAllAvailableMissions();
        }

        this.updateAll();
    },

    showOverlay(title, message, duration = 1000) {
        return new Promise(resolve => {
            DOM.overlay.classList.remove('hidden');
            DOM.overlayContent.innerHTML = `
                <div class="overlay-ready">READY TO LAUNCH</div>
                <div id="overlay-title">${title}</div>
                <div id="overlay-message">${message}</div>
                <div class="overlay-bar"><div class="overlay-bar-fill"></div></div>
            `;
            // 觸發進度條動畫（用 inline style 設定 linear 計時）
            requestAnimationFrame(() => {
                const fill = DOM.overlayContent.querySelector('.overlay-bar-fill');
                if (fill) {
                    fill.style.transitionDuration = (duration - 50) + 'ms';
                    fill.style.width = '100%';
                }
            });
            setTimeout(() => {
                DOM.overlay.classList.add('hidden');
                resolve();
            }, duration);
        });
    },

    /**
     * Toast 通知（用於解鎖、升級、錯誤提示）
     */
    toast(message, type = 'info', duration = 2500) {
        const existing = document.querySelectorAll('.toast');
        existing.forEach(t => t.remove());

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    setPrepUI() {
        DOM.btnLaunch.classList.remove('hidden');
        DOM.launchHint.classList.remove('hidden');
        DOM.controlsHint.classList.add('hidden');
        DOM.hud.classList.add('hidden');
        DOM.resultPanel.classList.add('hidden');
        // 隱藏虛擬控制按鈕
        if (typeof Physics !== 'undefined' && Physics.showVirtualControls) {
            Physics.showVirtualControls(false);
        }
        this._resultShown = false;
    },

    setGameUI() {
        DOM.btnLaunch.classList.add('hidden');
        DOM.launchHint.classList.add('hidden');
        DOM.controlsHint.classList.remove('hidden');
        DOM.hud.classList.remove('hidden');
        // 顯示虛擬控制按鈕（手機）
        if (typeof Physics !== 'undefined' && Physics.showVirtualControls) {
            Physics.showVirtualControls(true);
        }
    }
};

// ================================================
// 任務詳情
// ================================================
function showMissionDetails(index) {
    const mission = GameState.availableMissions[index];
    if (!mission) return;

    document.querySelectorAll('.mission-card').forEach((c, i) => c.classList.toggle('selected', i === index));

    const typeInfo = CONFIG.missionTypes[mission.type];
    const rocket = GameState.rockets[GameState.selectedRocketIndex];
    const reqs = mission.requirements;

    let canAccept = true;
    let reasons = [];
    if (rocket.engine < reqs.minEngine) { canAccept = false; reasons.push(`引擎 Lv.${reqs.minEngine}`); }
    if (rocket.fuel < reqs.minFuelLevel) { canAccept = false; reasons.push(`燃料 Lv.${reqs.minFuelLevel}`); }
    if (rocket.shield < reqs.minShield) { canAccept = false; reasons.push(`隔熱 Lv.${reqs.minShield}`); }
    if (rocket.cargo < reqs.minCargo) { canAccept = false; reasons.push(`貨艙 Lv.${reqs.minCargo}`); }
    if (reqs.needsLifeSupport && !rocket.hasLifeSupport) { canAccept = false; reasons.push('需要生命維持'); }
    if (reqs.minCrew > GameState.crew.length) { canAccept = false; reasons.push(`需要 ${reqs.minCrew} 名太空人`); }

    // 燃料容量檢查（顯示需要的燃料量 vs 火箭容量）
    // 使用共用函式 getFuelCapacity 確保 UI 與物理一致
    const fuelCapacity = getFuelCapacity(rocket);
    const needFuel = reqs.minFuelCapacity;
    const fuelOk = fuelCapacity >= needFuel;
    if (!fuelOk) { canAccept = false; }

    // 計算真實距離顯示（altitude 單位為 km）
    const distKm = mission.station.altitude; // altitude 本身是 km
    const distDisplay = distKm >= 1000000
        ? (distKm / 1000000).toFixed(1) + 'M km'
        : distKm >= 1000
            ? (distKm / 1000).toFixed(0) + 'k km'
            : distKm.toFixed(0) + ' km';

    // 起點資訊
    const originName = mission.originStation === 'earth' ? '🌍 地球' :
        (GameState.stations.find(s => s.id === mission.originStation)?.name || mission.originStation);

    DOM.missionInfo.innerHTML = `
        <p><strong>類型:</strong> <span style="color:${typeInfo.color}">${typeInfo.icon} ${typeInfo.name}</span></p>
        <p><strong>航線:</strong> ${originName} → <b>${mission.station.name}</b></p>
        <p><strong>距離:</strong> ${distDisplay}</p>
        <p><strong>燃料需求:</strong> ${needFuel} 單位 <span style="color:${fuelOk ? '#00ff88' : '#ff4466'}">${fuelOk ? '✅' : '⚠️ 需要 ' + needFuel + '（你有 ' + fuelCapacity + '）'}</span></p>
        <p><strong>難度:</strong> ${'⭐'.repeat(mission.difficulty)}</p>
        <p><strong>獎勵:</strong> <span style="color:#00ff88">$${mission.reward.toLocaleString()}</span></p>
        <p><strong>貨物:</strong> ${mission.cargo.items.map(i => `${i.name} x${i.quantity}`).join(', ') || '無'}</p>
        <hr style="margin:10px 0;border-color:var(--color-border)">
        ${canAccept ? '<p style="color:#00ff88">✅ 可接受</p>' :
            '<p style="color:#ff4466">⚠️ ' + reasons.join(', ') + '</p>'}
    `;

    DOM.missionDetails.classList.remove('hidden');
    DOM.btnAcceptMission.onclick = () => { GameState.currentMission = mission; GameState.availableMissions.splice(index, 1); DOM.missionDetails.classList.add('hidden'); UI.updateMissionList(); UI.updateMissionInfo(); };
    DOM.btnCancelMission.onclick = () => { DOM.missionDetails.classList.add('hidden'); document.querySelectorAll('.mission-card').forEach(c => c.classList.remove('selected')); };
}

// ================================================
// 升級系統
// ================================================
const UpgradeSystem = {
    upgrade(type) {
        const rocket = GameState.rockets[GameState.selectedRocketIndex];
        if (!rocket) return false;

        const config = CONFIG.upgradeCategories[type];
        if (rocket[type] >= config.maxLevel) return false;

        const cost = config.costs[rocket[type]];
        if (GameState.credits < cost) return false;

        GameState.credits -= cost;
        rocket[type]++;
        UI.updateAll();
        SaveSystem.save();
        return true;
    }
};

// ================================================
// 裝備系統（購買/安裝/卸下）
// ================================================
// 裝備槽位定義：每個槽位只能裝一個，type 對應 CONFIG.equipmentItems 的 type 欄位
const EQUIPMENT_SLOTS = [
    { key: 'engine',          name: '🔧 引擎',          itemType: 'engine' },
    { key: 'fuelTank',        name: '⛽ 燃料槽',        itemType: 'fuelTank' },
    { key: 'heatShield',      name: '🛡️ 隔熱盾',       itemType: 'heatShield' },
    { key: 'cargoModule',     name: '📦 貨艙模組',      itemType: 'cargoModule' },
    { key: 'lifeSupport',     name: '🫁 生命維持',      itemType: 'lifeSupport' },
    { key: 'solarPanel',      name: '☀️ 太陽能板',      itemType: 'solarPanel' },
    { key: 'communications',  name: '📡 通訊',          itemType: 'communications' },
    { key: 'navigation',      name: '🧭 導航',          itemType: 'navigation' }
];

// 玩家已購買的裝備庫存（id → 已購買次數；同一個裝備可重複購買但只能裝一個）
GameState.equipmentInventory = GameState.equipmentInventory || {};

const EquipmentSystem = {
    // 購買裝備（加入庫存）
    buy(itemId) {
        const item = CONFIG.equipmentItems[itemId];
        if (!item) return false;
        if (GameState.credits < item.price) {
            if (typeof UI.toast === 'function') UI.toast('💰 信用點不足', 'warn');
            return false;
        }
        GameState.credits -= item.price;
        GameState.equipmentInventory[itemId] = (GameState.equipmentInventory[itemId] || 0) + 1;
        UI.updateAll();
        SaveSystem.save();
        if (typeof UI.toast === 'function') UI.toast(`✅ 已購買 ${item.name}`, 'success');
        return true;
    },

    // 裝備到對應槽位
    install(itemId) {
        const item = CONFIG.equipmentItems[itemId];
        if (!item) return false;
        const slot = EQUIPMENT_SLOTS.find(s => s.itemType === item.type);
        if (!slot) return false;
        // 需要先買過
        if (!GameState.equipmentInventory[itemId]) {
            if (typeof UI.toast === 'function') UI.toast('❌ 請先購買此裝備', 'warn');
            return false;
        }
        // 檢查解鎖前置
        if (item.requires && !GameState.equipmentInventory[item.requires]) {
            if (typeof UI.toast === 'function') UI.toast(`❌ 需先購買 ${CONFIG.equipmentItems[item.requires].name}`, 'warn');
            return false;
        }
        // 卸下舊裝備（不退回庫存，僅清空槽位）
        GameState.equipment[slot.key] = itemId;
        UI.updateAll();
        SaveSystem.save();
        if (typeof UI.toast === 'function') UI.toast(`🔧 已裝備 ${item.name}`, 'success');
        return true;
    },

    // 卸下
    uninstall(slotKey) {
        if (!GameState.equipment[slotKey]) return false;
        const item = CONFIG.equipmentItems[GameState.equipment[slotKey]];
        GameState.equipment[slotKey] = null;
        UI.updateAll();
        SaveSystem.save();
        if (typeof UI.toast === 'function') UI.toast(item ? `🔽 已卸下 ${item.name}` : '🔽 已卸下', 'info');
        return true;
    }
};

// ================================================
// 購買火箭
// ================================================
function showBuyRocketModal() {
    DOM.rocketShop.innerHTML = '';
    Object.entries(CONFIG.rocketTypes).forEach(([key, r]) => {
        if (key === 'scout') return;
        const owned = GameState.rockets.some(rock => rock.type === key);
        const canBuy = GameState.credits >= r.basePrice;
        const imgSrc = CONFIG.rocketImages[key] || 'assets/rockets/scout.svg';

        const item = document.createElement('div');
        item.className = 'shop-item';
        item.innerHTML = `
            <img class="shop-item-image" src="${imgSrc}" alt="${r.name}" loading="lazy">
            <div class="shop-info">
                <div class="shop-name">${r.name}</div>
                <div class="shop-desc">${r.description}</div>
                <div class="shop-stats" style="font-size: var(--fs-xs); color: var(--color-text-dim); margin-top: 4px;">
                    引擎 Lv.${r.stats.engine} | 燃料 Lv.${r.stats.fuel} | 隔熱 Lv.${r.stats.shield} | 貨艙 Lv.${r.stats.cargo}
                </div>
            </div>
            <div>
                ${owned ? '<span style="color:#888">已擁有</span>' :
                    `<span class="shop-price">$${r.basePrice.toLocaleString()}</span>
                     <button class="btn-buy" data-type="${key}" ${!canBuy ? 'disabled' : ''}>購買</button>`}
            </div>
        `;

        if (!owned) {
            const btn = item.querySelector('.btn-buy');
            if (btn) btn.onclick = () => buyRocket(key);
        }

        DOM.rocketShop.appendChild(item);
    });
    DOM.modalBuyRocket.classList.remove('hidden');
}

function buyRocket(type) {
    const template = CONFIG.rocketTypes[type];
    if (GameState.credits < template.basePrice) return;
    GameState.credits -= template.basePrice;
    const rocket = createRocket(type);
    GameState.rockets.push(rocket);
    GameState.selectedRocketIndex = GameState.rockets.length - 1;
    UI.updateAll();
    DOM.modalBuyRocket.classList.add('hidden');
}

// ================================================
// 僱用乘員
// ================================================
function showHireCrewModal() {
    DOM.availableCrew.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const candidate = createCrewMember();
        const cost = 3000 + Math.floor(Math.random() * 5000);
        const item = document.createElement('div');
        item.className = 'hire-item';
        item.innerHTML = `
            <div class="hire-info">
                <div class="hire-name">${candidate.name}</div>
                <div class="crew-skills">
                    <span class="skill">指揮 ${candidate.command}</span>
                    <span class="skill">工程 ${candidate.engineering}</span>
                    <span class="skill">駕駛 ${candidate.piloting}</span>
                </div>
            </div>
            <div>
                <span class="hire-price">$${cost.toLocaleString()}</span>
                <button class="btn-hire" data-cost="${cost}">僱用</button>
            </div>
        `;
        const btn = item.querySelector('.btn-hire');
        btn.disabled = GameState.credits < cost;
        btn.onclick = () => hireCrew(candidate, cost);
        DOM.availableCrew.appendChild(item);
    }
    DOM.modalHireCrew.classList.remove('hidden');
}

function hireCrew(candidate, cost) {
    if (GameState.credits < cost) return;
    GameState.credits -= cost;
    GameState.crew.push(candidate);
    UI.updateAll();
    DOM.modalHireCrew.classList.add('hidden');
}

// ================================================
// 裝備商店 modal
// ================================================
function showEquipmentModal() {
    if (!DOM.equipmentShop) return;
    DOM.equipmentShop.innerHTML = '';

    EQUIPMENT_SLOTS.forEach(slot => {
        const section = document.createElement('div');
        section.className = 'equipment-section';
        const equippedId = GameState.equipment[slot.key];
        const equipped = equippedId ? CONFIG.equipmentItems[equippedId] : null;
        section.innerHTML = `
            <h3 style="margin: 12px 0 6px; color: var(--color-accent);">${slot.name}</h3>
            <div class="equipment-equipped">
                ${equipped
                    ? `<span>已裝備: <b style="color:#00ff88">${equipped.name}</b> <span style="color:#888">(${equipped.desc})</span>
                         <button class="btn-uninstall" data-slot="${slot.key}">卸下</button></span>`
                    : '<span style="color:#888">未裝備</span>'}
            </div>
        `;

        // 列出此槽位可購買的裝備
        const items = Object.entries(CONFIG.equipmentItems)
            .filter(([id, item]) => item.type === slot.itemType);
        if (items.length === 0) {
            section.innerHTML += '<p style="color:#666">（此類別無可購買裝備）</p>';
        } else {
            items.forEach(([id, item]) => {
                const owned = GameState.equipmentInventory[id] || 0;
                const isEquipped = equippedId === id;
                const unlocked = !item.requires || GameState.equipmentInventory[item.requires];
                const canBuy = GameState.credits >= item.price;
                const row = document.createElement('div');
                row.className = 'equipment-item';
                row.innerHTML = `
                    <div class="equipment-info">
                        <span class="equipment-name">${item.name}</span>
                        <span class="equipment-desc">${item.desc}</span>
                        ${item.requires ? `<span style="color:#666;font-size:0.85em">需要 ${CONFIG.equipmentItems[item.requires]?.name || item.requires}</span>` : ''}
                    </div>
                    <div class="equipment-actions">
                        <span style="color:#888">庫存: ${owned}</span>
                        ${isEquipped
                            ? '<span style="color:#00ff88">已裝備</span>'
                            : unlocked
                                ? `<span class="shop-price">$${item.price.toLocaleString()}</span>
                                   <button class="btn-buy-equip" data-id="${id}" ${!canBuy ? 'disabled' : ''}>購買</button>
                                   ${owned > 0 ? `<button class="btn-install-equip" data-id="${id}">安裝</button>` : ''}`
                                : '<span style="color:#666">🔒 未解鎖</span>'}
                    </div>
                `;
                section.appendChild(row);
            });
        }
        DOM.equipmentShop.appendChild(section);
    });

    // 事件綁定（一次性指派 onclick）
    DOM.equipmentShop.querySelectorAll('.btn-buy-equip').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            EquipmentSystem.buy(btn.dataset.id);
            showEquipmentModal();  // 重繪
        };
    });
    DOM.equipmentShop.querySelectorAll('.btn-install-equip').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            EquipmentSystem.install(btn.dataset.id);
            showEquipmentModal();
        };
    });
    DOM.equipmentShop.querySelectorAll('.btn-uninstall').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            EquipmentSystem.uninstall(btn.dataset.slot);
            showEquipmentModal();
        };
    });

    DOM.modalEquipment.classList.remove('hidden');
}

// ================================================
// 存檔系統
// ================================================
const SaveSystem = {
    SAVE_KEY: 'spacex_full_save',

    save() {
        const data = {
            credits: GameState.credits,
            research: GameState.research,
            reputation: GameState.reputation,
            stats: GameState.stats,
            rockets: GameState.rockets,
            selectedRocketIndex: GameState.selectedRocketIndex,
            crew: GameState.crew,
            unlockedStations: GameState.unlockedStations,
            completedMissions: GameState.stats.successfulLandings,
            stocks: GameState.stocks,
            cardCollection: GameState.cardCollection,
            cardStats: GameState.cardStats,
            currentLocation: GameState.currentLocation,
            equipment: GameState.equipment,
            equipmentInventory: GameState.equipmentInventory
        };
        try { localStorage.setItem(this.SAVE_KEY, JSON.stringify(data)); } catch (e) {}
    },

    load() {
        try {
            const saved = localStorage.getItem(this.SAVE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                Object.assign(GameState, {
                    credits: data.credits ?? 15000,
                    research: data.research ?? 0,
                    reputation: data.reputation ?? 0,
                    stats: { ...GameState.stats, ...data.stats },
                    rockets: data.rockets?.length ? data.rockets : [createRocket('scout')],
                    selectedRocketIndex: Math.min(data.selectedRocketIndex || 0, (data.rockets?.length || 1) - 1),
                    crew: data.crew ?? [],
                    unlockedStations: data.unlockedStations ?? ['leo'],
                    stocks: data.stocks ?? GameState.stocks,
                    cardCollection: data.cardCollection ?? [],
                    cardStats: data.cardStats ?? { totalPulls: 0, lastPull: null, lastPullTime: 0 },
                    currentLocation: data.currentLocation ?? 'earth',
                    equipment: data.equipment ?? { engine: null, fuelTank: null, heatShield: null, cargoModule: null, lifeSupport: null, solarPanel: null, communications: null, navigation: null },
                    equipmentInventory: data.equipmentInventory ?? {}
                });
                console.log('存檔載入成功');
                return true;
            }
        } catch (e) { console.warn('讀檔失敗'); }
        return false;
    }
};

// ================================================
// 抽卡系統 (CardSystem)
// 任務成功後可抽卡，不重複
// ================================================
const CardSystem = {
    /**
     * 加權隨機抽一張（不重複機制）
     * - 從未抽到卡片中加權隨機
     * - 若全部抽完，從完整卡池中隨機（允許重複）
     */
    rollCard() {
        const allCards = CONFIG.cards;
        const ownedIds = new Set(GameState.cardCollection);
        const unowned = allCards.filter(c => !ownedIds.has(c.id));
        const pool = unowned.length > 0 ? unowned : allCards;
        const weights = pool.map(c => CONFIG.rarityWeights[c.rarity] || 1);
        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        let pick = pool[0];
        for (let i = 0; i < pool.length; i++) {
            r -= weights[i];
            if (r <= 0) { pick = pool[i]; break; }
        }
        // 加入收藏
        GameState.cardCollection.push(pick.id);
        GameState.cardStats.totalPulls++;
        GameState.cardStats.lastPull = pick.id;
        GameState.cardStats.lastPullTime = Date.now();
        SaveSystem.save();
        return pick;
    },

    /** 取得單張卡片資訊（依 ID） */
    getCardById(id) { return CONFIG.cards.find(c => c.id === id); },

    /** 取得所有卡片（含擁有狀態） */
    getAllCards() {
        return CONFIG.cards.map(c => ({
            ...c,
            owned: GameState.cardCollection.includes(c.id)
        }));
    },

    /** 收藏進度統計 */
    getProgress() {
        const total = CONFIG.cards.length;
        const owned = GameState.cardCollection.length;
        return { total, owned, percent: Math.round(owned / total * 100) };
    },

    /** 依稀有度統計已收集數 */
    getRarityStats() {
        const stats = { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 };
        GameState.cardCollection.forEach(id => {
            const card = this.getCardById(id);
            if (card) stats[card.rarity] = (stats[card.rarity] || 0) + 1;
        });
        return stats;
    }
};

// ================================================
// 抽卡動畫 (CardAnimation)
// 顯示抽卡結果的翻牌動畫
// ================================================
const CardAnimation = {
    show(card) {
        const overlay = document.getElementById('card-draw-overlay');
        const cardEl = document.getElementById('card-draw-card');
        if (!overlay || !cardEl) return;
        const color = CONFIG.rarityColors[card.rarity] || '#888';
        const isOwned = GameState.cardCollection.includes(card.id);
        cardEl.innerHTML = `
            <div class="card-draw-frame" style="--rarity-color: ${color}">
                <div class="card-draw-rarity">${card.rarity}</div>
                <img class="card-draw-image" src="${card.image}" alt="${card.name}"
                     onerror="this.src='assets/cards/placeholder.svg'">
                <div class="card-draw-name">${card.name}</div>
                <div class="card-draw-desc">${card.desc}</div>
                ${isOwned && GameState.cardCollection.filter(id => id === card.id).length > 1
                    ? '<div class="card-draw-dup">重複！已收藏</div>' : ''}
            </div>
        `;
        overlay.classList.remove('hidden');
        cardEl.classList.remove('flip-in');
        // 強制 reflow 重啟動畫
        void cardEl.offsetWidth;
        cardEl.classList.add('flip-in');
        const btn = document.getElementById('btn-card-collect');
        if (btn) btn.onclick = () => this.hide();
    },
    hide() {
        const overlay = document.getElementById('card-draw-overlay');
        const cardEl = document.getElementById('card-draw-card');
        if (overlay) overlay.classList.add('hidden');
        if (cardEl) cardEl.classList.remove('flip-in');
    }
};

// ================================================
// SPCX 股票系統
// SPCX 是真實上市公司股票（真實市場報價）
// 透過 CORS 代理抓取 Yahoo Finance 行情
// ================================================
const StockSystem = {
    // 設定：SPCX 真實股票代碼
    REAL_SYMBOL: 'SPCX',
    // 多組 CORS 代理（快速優先，allorigins 備用）
    PROXY_LIST: [
        'https://corsproxy.io/?url=',
        'https://api.allorigins.win/raw?url='
    ],
    YAHOO_URL: 'https://query1.finance.yahoo.com/v8/finance/chart/',
    CACHE_MS: 5 * 60 * 1000,   // 5 分鐘快取
    SIM_VOLATILITY: 0.005,        // 模擬模式：微幅波動 ±0.5%（更穩定）
    HISTORY_MAX: 30,             // 保留 30 筆歷史

    /**
     * 抓取即時股票價格（嘗試多個 CORS 代理）
     * 全部失敗時保留上次成功價格，不再隨機變動
     */
    async fetchPrice() {
        const now = Date.now();
        const stock = GameState.stocks.SPCX;
        // 5 分鐘內不重抓（使用快取）
        if (stock.lastFetch && (now - stock.lastFetch) < this.CACHE_MS && stock.currentPrice > 0) {
            console.log(`[SPCX] 使用快取: $${stock.currentPrice.toFixed(2)}`);
            return stock.currentPrice;
        }

        // 依序嘗試每個代理
        let lastError = null;
        for (const proxy of this.PROXY_LIST) {
            const targetUrl = `${this.YAHOO_URL}${this.REAL_SYMBOL}?interval=1d&range=5d`;
            const url = `${proxy}${encodeURIComponent(targetUrl)}`;
            try {
                const ctrl = new AbortController();
                const tid = setTimeout(() => ctrl.abort(), 10000);  // 10 秒逾時
                const res = await fetch(url, { signal: ctrl.signal });
                clearTimeout(tid);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const json = await res.json();
                const meta = json?.chart?.result?.[0]?.meta;
                if (!meta) throw new Error('No meta');
                const price = meta.regularMarketPrice || meta.previousClose || 0;
                if (!price) throw new Error('No price');

                stock.currentPrice = price;
                stock.lastFetch = now;
                stock.lastRealSymbol = this.REAL_SYMBOL;
                stock.source = 'real';
                const closes = json.chart.result[0].indicators.quote[0].close.filter(v => v != null);
                if (closes.length) {
                    stock.history = closes.slice(-this.HISTORY_MAX);
                }
                console.log(`[SPCX] 抓取成功 $${price.toFixed(2)} via ${proxy.slice(0, 30)}...`);
                return price;
            } catch (err) {
                lastError = err;
                console.warn(`[SPCX] ${proxy.slice(0, 30)}... 失敗: ${err.message}`);
            }
        }

        // 所有代理都失敗：保留上次價格，不隨機變動
        console.warn(`[SPCX] 全部代理失敗，保留上次價格 $${stock.currentPrice.toFixed(2)}`);
        stock.lastFetch = now;
        stock.source = 'cached';
        stock.lastRealSymbol = `${this.REAL_SYMBOL} (快取)`;
        if (stock.currentPrice > 0) {
            return stock.currentPrice;
        }
        // 真的完全沒有價格：使用合理起始價 $160
        stock.currentPrice = 160.0;
        stock.source = 'default';
        return stock.currentPrice;
    },

    /**
     * 任務成功時獎勵股票
     * 獎勵股數 = 基礎股數 + 任務獎勵金額的 5% 換算為股數
     */
    awardForMission(reward) {
        const stock = GameState.stocks.SPCX;
        const price = stock.currentPrice || 25;
        const baseShares = 50;  // 每次成功至少 50 股
        const bonusShares = Math.floor((reward * 0.05) / Math.max(price, 0.01));
        const total = baseShares + bonusShares;
        stock.shares += total;
        stock.totalCost += total * price;
        return total;
    },

    /**
     * 計算投資組合總值（依當前 SPCX 價格）
     */
    getPortfolio() {
        const stock = GameState.stocks.SPCX;
        const price = stock.currentPrice || 0;
        const marketValue = stock.shares * price;
        const costBasis = stock.totalCost;
        const profit = marketValue - costBasis;
        const profitPct = costBasis > 0 ? (profit / costBasis * 100) : 0;
        const avgCost = stock.shares > 0 ? costBasis / stock.shares : 0;
        return { shares: stock.shares, avgCost, price, marketValue, costBasis, profit, profitPct };
    }
};

// ================================================
// 狀態機
// ================================================
const StateMachine = {
    transition(newPhase, data = {}) {
        const prev = GameState.phase;
        GameState.phase = newPhase;
        console.log(`狀態: ${prev} → ${newPhase}`);

        switch (newPhase) {
            case 'PREP': this.enterPrep(); break;
            case 'LAUNCH': this.enterLaunch(); break;
            case 'FLIGHT': this.enterFlight(); break;
            case 'SUCCESS': this.enterSuccess(data); break;
            case 'CRASH': this.enterCrash(data); break;
        }

        document.getElementById('phase-label').textContent = {
            'PREP': '準備階段', 'LAUNCH': '發射中', 'FLIGHT': '飛行中',
            'SUCCESS': '任務成功', 'CRASH': '任務失敗'
        }[newPhase] || newPhase;
    },

    enterPrep() {
        UI.setPrepUI();
        UI.expandSidebarAuto();  // 任務結束自動展開（若為自動收合狀態）
        GameState.maxAltitude = 0;
        GameState.currentMission = null;
        Physics.stopLoop();
        Physics.reset();
    },

    enterLaunch() {
        UI.setGameUI();
        UI.collapseSidebarAuto();  // 發射時自動收合，給玩家最大遊戲畫面
        GameState.stats.launches++;
        UI.showOverlay('🚀', '3', 800).then(() =>
            UI.showOverlay('🚀', '2', 800).then(() =>
                UI.showOverlay('🚀', '1', 800).then(() =>
                    UI.showOverlay('🚀', '發射!', 500).then(() => {
                        Physics.initRocket();
                        this.transition('FLIGHT');
                    })
                )
            )
        );
    },

    enterFlight() { Physics.startLoop(); },

    enterSuccess(data) {
        Physics.stopLoop();
        setTimeout(() => UI.showResult(true, data), 1000);
    },

    enterCrash(data) {
        Physics.stopLoop();
        Physics.showExplosion();
        setTimeout(() => UI.showResult(false, data), 2000);
    }
};

// ================================================
// 事件監聽
// ================================================
function setupEventListeners() {
    // 分頁
    DOM.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            DOM.tabs.forEach(t => t.classList.remove('active'));
            DOM.tabPanels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
            // 切到特定分頁時自動更新
            const target = tab.dataset.tab;
            if (target === 'cards' && typeof UI.updateCardAlbum === 'function') {
                UI.updateCardAlbum();
            } else if (target === 'stocks' && typeof UI.updateStockPanel === 'function') {
                UI.updateStockPanel();
            }
        });
    });

    DOM.btnBuyRocket.addEventListener('click', showBuyRocketModal);
    document.getElementById('btn-close-buy').addEventListener('click', () => DOM.modalBuyRocket.classList.add('hidden'));
    document.getElementById('btn-hire-crew').addEventListener('click', showHireCrewModal);
    document.getElementById('btn-close-hire').addEventListener('click', () => DOM.modalHireCrew.classList.add('hidden'));

    // 裝備商店
    const btnOpenEquip = document.getElementById('btn-open-equipment');
    if (btnOpenEquip) btnOpenEquip.addEventListener('click', showEquipmentModal);
    const btnCloseEquip = document.getElementById('btn-close-equipment');
    if (btnCloseEquip) btnCloseEquip.addEventListener('click', () => DOM.modalEquipment.classList.add('hidden'));

    DOM.btnLaunch.addEventListener('click', () => { if (GameState.phase === 'PREP' && GameState.currentMission) StateMachine.transition('LAUNCH'); });
    DOM.btnContinue.addEventListener('click', () => StateMachine.transition('PREP'));

    // 收合側邊欄
    if (DOM.btnToggleSidebar) {
        DOM.btnToggleSidebar.addEventListener('click', () => UI.toggleSidebar());
    }

    // 股票重新整理
    if (DOM.btnRefreshStock) {
        DOM.btnRefreshStock.addEventListener('click', async () => {
            DOM.btnRefreshStock.disabled = true;
            DOM.btnRefreshStock.textContent = '⏳ 載入中…';
            try {
                // 強制重新抓取（忽略快取）
                GameState.stocks.SPCX.lastFetch = 0;
                await StockSystem.fetchPrice();
                UI.updateStockPanel();
                UI.toast('SPCX 股價已更新', 'success');
            } catch (e) {
                UI.toast('股價抓取失敗：' + e.message, 'danger');
            } finally {
                DOM.btnRefreshStock.disabled = false;
                DOM.btnRefreshStock.textContent = '🔄 重新整理股價';
            }
        });
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (GameState.phase !== 'PREP' && confirm('放棄任務？')) StateMachine.transition('PREP');
            DOM.modalBuyRocket.classList.add('hidden');
            DOM.modalHireCrew.classList.add('hidden');
            if (DOM.modalEquipment) DOM.modalEquipment.classList.add('hidden');
        }
        if (GameState.phase !== 'PREP') {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
        }
    });

    // 刪除火箭按鈕（事件委派）
    if (DOM.rocketsList) {
        DOM.rocketsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-rocket-delete')) {
                e.stopPropagation();
                const idx = parseInt(e.target.dataset.rocketIndex);
                if (!isNaN(idx)) UI.deleteRocket(idx);
            }
        });
    }

    // 解散太空人按鈕（事件委派）
    if (DOM.crewList) {
        DOM.crewList.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-crew-delete')) {
                const id = e.target.dataset.crewId;
                if (id) UI.deleteCrew(id);
            }
        });
    }

    // 卡片相簿篩選器
    const albumFilter = document.getElementById('card-album-filter');
    if (albumFilter) {
        albumFilter.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                albumFilter.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                UI.updateCardAlbum(e.target.dataset.filter);
            }
        });
    }
}

// ================================================
// 初始化
// ================================================
document.addEventListener('DOMContentLoaded', () => {
    cacheDOM();
    SaveSystem.load();
    initGame();
    UI.restoreSidebarState();
    Physics.init();
    // 啟動時非同步抓取股價（不阻塞 UI）
    StockSystem.fetchPrice().then(() => UI.updateStockPanel());
});

window.GameState = GameState;
window.UI = UI;
window.StateMachine = StateMachine;
