# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# SpaceX 任務：發射與回收 (SpaceX Mission: Launch & Recovery)

HTML5 網頁遊戲，融合 RPG 基地管理與 Canvas 物理模擬著陸兩個階段。

## 啟動方式

```bash
cd D:\game
python -m http.server 8765
# 瀏覽器開啟 http://localhost:8765/
```

⚠️ **不要用 `file://` 開啟** — 會有 localStorage 與快取問題，必須透過 HTTP 伺服器。

```bash
# 語法驗證
node --check ui-state.js
node --check physics.js
```

## 架構總覽

### 檔案職責
| 檔案 | 職責 |
|------|------|
| `index.html` | 側邊欄分頁（火箭/任務/站點/乘員）+ 遊戲區 Canvas + 彈窗（買火箭/僱乘員/裝備）+ HUD |
| `style.css` | 響應式佈局、暗色科幻風格（CSS 變數定義於 `:root`） |
| `ui-state.js` | 遊戲狀態 (`GameState`)、配置 (`CONFIG`)、UI 更新、狀態機 (`StateMachine`)、存檔 (`SaveSystem`)、升級/任務/乘員邏輯 |
| `physics.js` | Canvas 渲染、世界座標、星空/地球/地面繪製、`Particle` 類別、物理更新、碰撞偵測、控制綁定 |

### 兩個全域核心物件
- **`window.GameState`** — 整個遊戲狀態（貨幣、火箭、乘員、任務、統計）
- **`window.Physics`** — 物理引擎 API（`init()`、`initRocket()`、`startLoop()`、`stopLoop()`、`reset()`、`showExplosion()`）

ui-state.js 也暴露 `window.UI`、`window.StateMachine` 給除錯用。

## 狀態機（核心架構）

```
PREP ─[Launch 按鈕]→ LAUNCH ─[3秒倒數]→ FLIGHT ─[著陸/對接]→ SUCCESS / CRASH
 ↑                                                                          │
 └──────────────────[btn-continue]──────────────────────────────────────────┘
```

關鍵位置：
- `StateMachine.transition(newPhase, data)` 是唯一入口，依階段呼叫 `enterPrep()`/`enterLaunch()`/`enterFlight()`/`enterSuccess()`/`enterCrash()`
- `GameState.phase` 與 `rocket.phase` 是兩條獨立軸線：前者是 UI 流程，後者是火箭物理狀態（`GROUND`/`ASCENDING`/`DESCENDING`/`LANDED`/`EXPLODED`/`DOCKED`）
- **務必在 `enterPrep()` 內呼叫 `Physics.stopLoop()`** 與 `Physics.reset()`，否則 Canvas 動畫會繼續跑、結果面板會重複彈出

## 模組互動流程

1. **DOMContentLoaded** → `cacheDOM()` → `SaveSystem.load()` → `initGame()`（建立初始火箭/乘員/任務）→ `UI.updateAll()` → `Physics.init()`
2. **使用者接受任務** → `GameState.currentMission = mission` → 啟用發射按鈕
3. **點擊發射** → `StateMachine.transition('LAUNCH')` → 倒數 overlay → `Physics.initRocket()` 注入升級後的屬性 → 進入 `FLIGHT`
4. **物理更新**（`gameLoop`）→ `updatePhysics()` → 碰撞偵測 → 著陸/對接/爆炸 → `StateMachine.enterSuccess/enterCrash()`
5. **任務結算** → `UI.showResult()` → 自動補新任務（保持 4 個可用）→ 升級乘員經驗

## 資料驅動設計

幾乎所有遊戲內容都用 `CONFIG` 中的常數定義（`ui-state.js` 第 59-284 行），新增內容時**優先擴充 CONFIG** 而非改程式邏輯：

| 想新增什麼 | 編輯哪裡 |
|-----------|---------|
| 新火箭 | `CONFIG.rocketTypes` |
| 新升級類別 | `CONFIG.upgradeCategories`（注意 10 級成本與加成陣列要對齊） |
| 新裝備 | `CONFIG.equipmentItems`（`requires` 欄位設定解鎖前置） |
| 新太空站 | `CONFIG.stations`（設定 `unlockReputation` 門檻） |
| 新任務類型 | `CONFIG.missionTypes` |
| 新科技 | `CONFIG.techTree` |

## 物理與世界座標

- 世界：`WORLD_WIDTH=800`、`WORLD_HEIGHT=10000`（`physics.js` 第 15-16 行）
- 鏡頭跟隨：`cameraY` 用線性插值跟隨火箭
- ⚠️ **已知問題**：`CONFIG.stations` 內的太空站高度（如月球 384000、火星 2.25e9）遠超 `WORLD_HEIGHT`，玩家實際無法抵達 — 修復時需把世界座標與真實高度統一換算
- 火箭起飛後若不手動控制，會因燃料耗盡與重力墜毀 — `LANDED`/`EXPLODED`/`DOCKED` 階段會自動停止物理更新
- 著陸成功條件（`physics.js:715`）：速度 ≤ 25（speed*10 換算後）、角度 ≤ 20°、必須落在 `LANDING_PAD` 上

## 存檔系統

- 鍵值：`spacex_full_save`（在 `SaveSystem.SAVE_KEY`）
- 觸發時機：每次升級、購買、僱用後呼叫 `SaveSystem.save()`
- 載入：DOMContentLoaded 時自動 `SaveSystem.load()`，無存檔則用預設值（初始 $15,000）
- 清除存檔：`localStorage.removeItem('spacex_full_save')`

## 除錯訣竅

```javascript
// 在瀏覽器 console:
GameState.credits = 999999;     // 改資金
GameState.reputation = 5000;     // 解鎖所有太空站
UI.updateAll();                  // 重新整理 UI
Physics.reset();                 // 重置火箭
```

`chrome-devtools-mcp` 可用於自動截圖與 DOM 快照測試；`playwright` MCP 也可用於更細緻的互動測試。

## 待修/待優化

- ⚠️ 世界高度 (10000) 與太空站高度（最高 22 億）不匹配，需要統一座標系統
- ⚠️ 任務完成判定只看「火箭有沒有回到地面」，未檢查是否到達目標太空站
- ⚠️ 火箭起飛後無自動飛行，必須全程手動控制
- ⚠️ `index.html` 有小標籤語法錯誤（`<h2>` 變成 `h2>`），不影響功能但可順手修

## 瀏覽器支援

Chrome 80+、Firefox 75+、Safari 13+、Edge 80+
