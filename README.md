# LIFT網站重構雛形

此版本已完成：

- 依照參考站重整首頁文案層次與三大部分結構
- 莫蘭迪配色與高質感按鈕樣式
- 按鈕 hover 高亮提示效果與柔光互動反饋
- 中文字型預設為微軟正黑體／粗黑體風格
- 圖像預留區塊
- Hover圖標讀取Markdown內容機制
- 第一部分的模式切換按鈕

## 如何替換圖片

把正式圖檔放進 `img/`，然後把 `index.html` 中對應 `.placeholder-art` 改成 `<img>` 即可。

### 範例

```html
<div class="figure-stage hotspot-stage" data-stage="part1">
  <img src="img/part1-chart.png" alt="第一部分圖表" class="stage-image" />
  <div class="hotspot-layer" data-hotspot-layer="part1"></div>
</div>
```

若你要替換成圖片，建議加上這段CSS：

```css
.stage-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
```

## 如何更新hover內容

所有hover說明都來自 `data/md/` 內的md檔。

例如：

- `data/md/part1/config/support-01.md`
- `data/md/part2/teaching.md`
- `data/md/part3/core-node.md`

你只要改md內容，不必改HTML。

## 如何調整圖標位置

編輯 `data/hotspots.json`。

### 欄位說明

- `title`：圖標名稱
- `x`：橫向百分比位置
- `y`：縱向百分比位置
- `md`：對應的Markdown檔案路徑

### 範例

```json
{
  "title": "核心節點",
  "x": 28,
  "y": 31,
  "md": "data/md/part3/core-node.md"
}
```

## 注意

因為前端是使用 `fetch()` 讀取md與json，請用本機伺服器或GitHub Pages執行，不要直接雙擊 `index.html` 用 `file://` 開啟。

### 本機快速測試

若電腦有Python，可在資料夾內執行：

```bash
python -m http.server 8000
```

然後打開：

`http://localhost:8000`


## 本次更新

- 已將首頁「114學年學校學習生態系統成果分享」調整為30px顯示
- 已刪除計畫概覽中的三個標籤按鈕
- 已置換校徽Logo為 `img/u11.png`
- 已置換合作單位Logo為 `img/國科會標誌組合PNG.png`
- 已將連絡電話改為兩行呈現
