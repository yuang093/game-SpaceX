# 🚀 SpaceX 任務：發射與回收 (SpaceX Mission: Launch & Recovery)

一款結合 **RPG 基地管理** 與 **物理模擬著陸** 的 HTML5 太空遊戲，支援手機與桌機、響應式設計、可離線遊玩 (PWA)。

![Status](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-MIT-blue)
![Vercel](https://img.shields.io/badge/deployed-vercel-black)

## ✨ 特色

- 🎮 **雙階段玩法**：RPG 準備（購買/升級/僱人）+ 物理著陸（Canvas 即時模擬）
- 📱 **手機優先設計**：虛擬按鈕、底部導航、安全區域適配
- 🌌 **真實太空素材**：SpaceX 官網、NASA 公開圖庫、維基百科圖片
- 📦 **PWA 化**：可安裝到主畫面、離線遊玩
- 🚀 **10 種火箭 × 12 太空站 × 12 任務類型 × 4 科技樹**
- 💾 **localStorage 存檔**（可擴展 Vercel KV 雲端同步）

## 🎮 玩法

1. **準備階段**：購買火箭、升級引擎/燃料/隔熱/貨艙、僱用太空人、研究科技
2. **選擇任務**：補給、載人、救援、建設、採礦、科研、軍事、探索等
3. **發射**：3 秒倒數後自動升空
4. **著陸控制**：
   - **桌機**：`↑/W` 點火、`←/→/A/D` 旋轉、`空白` 制動、`ESC` 放棄
   - **手機**：螢幕虛擬按鈕（多點觸控）
5. **結算獎勵**：基礎獎勵 + 高度加成 + 燃料加成 + 結構加成 + 乘員加成

## 🚀 快速開始

### 桌機
```bash
# 開啟本地伺服器（不要用 file://）
cd D:\game
python -m http.server 8765
# 瀏覽器開啟 http://localhost:8765/
```

### 手機測試
1. 確認手機與電腦在同一 Wi-Fi
2. 查電腦 IP（如 `192.168.1.100`）
3. 手機開啟 `http://192.168.1.100:8765/`

## 🛠️ 技術棧

- **前端**：純 HTML5 + CSS3 + Vanilla JavaScript（無框架）
- **渲染**：HTML5 Canvas
- **PWA**：Service Worker + Web App Manifest
- **部署**：Vercel（自動從 GitHub 部署）
- **存檔**：localStorage（開發）→ Vercel KV（生產，可選）

## 📁 專案結構

```
D:\game\
├── index.html              # 主 HTML
├── style.css               # 響應式 CSS（mobile-first）
├── ui-state.js             # 遊戲狀態、配置、狀態機
├── physics.js              # Canvas 渲染、物理引擎
├── sw.js                   # Service Worker（PWA 離線）
├── manifest.json           # PWA 清單
├── vercel.json             # Vercel 部署設定
├── assets/
│   ├── rockets/            # 火箭照片
│   ├── stations/           # 太空站照片
│   ├── planets/            # 星球照片
│   ├── ui/                 # UI 圖示
│   └── index.json          # 圖片索引（含來源、授權）
├── .gitignore
├── README.md
├── LICENSE
└── CLAUDE.md               # Claude Code 專案指南
```

## 🌍 部署

推送到 GitHub 後，Vercel 自動部署：

```bash
git push origin main
# Vercel 自動偵測變更 → 建置 → 部署
```

## 📸 圖片來源

- **SpaceX 官網** (spacex.com)：官方火箭照片（©SpaceX）
- **NASA Images** (images.nasa.gov)：公共領域
- **維基百科** (commons.wikimedia.org)：CC BY-SA

完整授權資訊見 `assets/index.json`。

## 📜 授權

MIT License - 詳見 [LICENSE](LICENSE)

## 🙏 致謝

- SpaceX 提供火箭照片
- NASA 提供太空與星球照片
- 維基百科社群提供歷史素材
