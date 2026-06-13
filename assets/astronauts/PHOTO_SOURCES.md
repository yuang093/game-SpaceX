# 太空人真實照片來源

本文件列出 NASA 公開領域與維基百科 CC 授權的太空人照片 URL，可用於替換預設 SVG 頭像。

## ⚠️ 授權提醒

- **NASA 照片**：公共領域（PD），可任意使用，無需標註
- **維基百科照片**：大多為 CC BY-SA 4.0，需標註作者
- **SpaceX 照片**：©SpaceX，僅限教育/非商業展示

## 📥 建議下載工具

```bash
# 安裝
npm i -g image-downloader

# 或使用 curl 批次下載
curl -L -o astronaut-1.jpg "https://upload.wikimedia.org/wikipedia/commons/..."
```

## 🌟 NASA 太空人（公共領域）

### 男性太空人
| 姓名 | 任務 | 照片 URL |
|------|------|---------|
| Buzz Aldrin | Apollo 11 | https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Buzz_Aldrin_Apollo_11_original.jpg/240px-Buzz_Aldrin_Apollo_11_original.jpg |
| Neil Armstrong | Apollo 11 | https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Neil_Armstrong_pose.jpg/240px-Neil_Armstrong_pose.jpg |
| John Glenn | Mercury-Atlas 6 | https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/John_Glenn_suited.jpg/240px-John_Glenn_suited.jpg |
| Michael Collins | Apollo 11 | https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Michael_Collins_%28S69-31742%29.jpg/240px-Michael_Collins_%28S69-31742%29.jpg |
| Scott Kelly | ISS | https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Scott_Kelly.jpg/240px-Scott_Kelly.jpg |
| Chris Hadfield | ISS | https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Chris_Hadfield_2012.jpg/240px-Chris_Hadfield_2012.jpg |

### 女性太空人
| 姓名 | 任務 | 照片 URL |
|------|------|---------|
| Sally Ride | STS-7 | https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Sally_Ride_1984.jpg/240px-Sally_Ride_1984.jpg |
| Valentina Tereshkova | Vostok 6 | https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Valentina_Tereshkova_%28RESTORED%29.jpg/240px-Valentina_Tereshkova_%28RESTORED%29.jpg |
| Mae Jemison | STS-47 | https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Mae_Carol_Jemison.jpg/240px-Mae_Carol_Jemison.jpg |
| Peggy Whitson | ISS | https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Peggy_Whitson_in_2007.jpg/240px-Peggy_Whitson_in_2007.jpg |
| Stephanie Wilson | STS-121 | https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Stephanie_Wilson_official_portrait.jpg/240px-Stephanie_Wilson_official_portrait.jpg |
| Christina Koch | ISS | https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Christina_Koch_official_portrait_in_an_EMU.jpg/240px-Christina_Koch_official_portrait_in_an_EMU.jpg |

### 太空人團體照
| 主題 | 照片 URL |
|------|---------|
| NASA Astronaut Group 18 | https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Astronaut_Group_18.jpg/320px-Astronaut_Group_18.jpg |
| ISS 太空人 | https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Expedition_64_crew_portrait.jpg/320px-Expedition_64_crew_portrait.jpg |

## 🚀 太空漫步 / 任務照

| 主題 | 照片 URL |
|------|---------|
| 太空漫步（白色太空衣） | https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Astronaut-EVA.jpg/240px-Astronaut-EVA.jpg |
| 太空漫步工具 | https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Astronaut_John_Lounge_eva.jpg/240px-Astronaut_John_Lounge_eva.jpg |

## 🔄 替換流程

1. 下載照片到 `assets/astronauts/` 資料夾
2. 重新命名為 `astronaut-1.jpg`、`astronaut-2.jpg`...
3. 編輯 `ui-state.js` 中 `CONFIG.astronautPortraits` 改為 `.jpg` 路徑
4. 或更新 `astronautPortraits` 為陣列 `{file, name, source}` 物件以記錄真實姓名

## 📝 標註範例

使用維基百科照片時，建議在 footer 加入：

```
太空人照片來源：NASA Images (Public Domain) 與 Wikimedia Commons (CC BY-SA 4.0)
完整致謝：https://commons.wikimedia.org/wiki/Category:Astronauts
```
