請使用最新上傳[preview2.html],不要使用紀錄檔
請使用最新上傳[11.html],不要使用紀錄檔
請使用最新上傳[network2.gexf],不要使用紀錄檔

1. network2.gexf是一模網絡圖

2. preview2.html前端需處理事項如下
2.1. 讀取network2.gexf
2.2. 依行政團隊區分：0=教師身分、1=行政身分
2.3. 教師節點為莫蘭迪藍、行政節點為莫蘭迪紅
2.4. 全部節點皆為圓形
2.5. 節點大小依Indegree
2.6. 邊為有向，含箭頭
2.7. 節點標籤僅顯示ID

3. 四種布局可選：
左右並列
環狀並列
Fruchterman–Reingold
Kamada–Kawai

我另一個專案網頁可以用[11.html]展示gexf依照行政別/教師別區分節點顏色
但使用[preview2.html]卻無法前端展示不同身分別的節點顏色
請分析我提供的檔案，幫我輸出可以正確解析、展示[network2.gexf]
並能前端區別行政別(莫蘭迪紅)/教師別節點顏色(莫蘭迪藍)
重新幫我重新輸出[preview2.html]