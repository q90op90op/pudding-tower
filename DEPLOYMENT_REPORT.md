# PUDDING TOWER 部署報告

## 網址與目前狀態

- 公開原始碼：https://github.com/q90op90op/pudding-tower
- 正式遊戲：https://q90op90op.github.io/pudding-tower/
- 部署流程：https://github.com/q90op90op/pudding-tower/actions/runs/40702303107
- 本次程式版本：`fc6aaac9ef440131778841022938a49868b2a59c`。
- 狀態：**已成功公開上線**。驗證時間：2026-10-28 22:15（UTC+8）。手機可直接開啟正式網址遊玩。

## 已完成設定

建立公開的 `pudding-tower` 儲存庫，啟用以 GitHub Actions 部署的 Pages 與 HTTPS。Vite 正式版及 preview 使用 `/pudding-tower/`；開發模式維持 `/`。工作流程設定正式分享卡網址，使用鎖定依賴及固定 SHA 的官方 Actions。

推送程式至 `main` 後，Windows runner 先執行 TypeScript、正式版建置、完整遊戲測試及正式路徑測試；通過後由標準 Ubuntu runner 建置並發布。使用工作流程提供的權限，未在檔案中存放個人 Token，未申請付費服務。

## 實際測試與修正

- `npm.cmd run build`：本機通過 TypeScript strict 及 Vite 正式版建置。
- `npm.cmd test`：本機 67 項全部通過（5.4 分鐘），涵蓋計分、倒塌、重開、22 層物理軌跡、十造型／四風格、Q 彈、UI、音效與分享。
- `npm.cmd run test:production`：本機正式子路徑通過，實際掉落計分、結算、1080×1350 PNG 下載均成功，無執行錯誤或素材 HTTP 錯誤，正式版不含開發測試介面。
- 首次雲端執行有 3 個角色動畫迴圈測試超過共用 45 秒時限。已拆成各造型獨立案例，原有斷言與單項時限完整保留；總數從 31 項改為 67 項。未變更遊戲物理或操作。第二次雲端 64 項通過，另 3 項長整合案例超時；已僅將 CI 時限設為 180 秒，本機仍為 45 秒。正式版測試改為觀察真實計分／結算，而非假設固定等待 450ms 一定失敗；本機重驗通過。
- GitHub Actions：驗證及部署工作全部成功；雲端 67 項測試通過（5.1 分鐘），正式版實際計分、結算與 PNG 下載測試通過。
- 正式公開網址：以 Edge 無頭瀏覽器及 390×844 觸控視窗實際遊玩，成功計分、自然失敗結算、開啟分享預覽並下載 1080×1350 PNG；分享卡網址確認為 `https://q90op90op.github.io/pudding-tower/`。沒有執行錯誤或素材 HTTP 錯誤，正式版未暴露開發測試介面。
- 額外逐一驗證公開的 107 張 PNG：全部 HTTP 成功且回傳 PNG 類型，無缺圖。驗證截圖及實際下載圖片保留在本機 `test-results/production/`，未提交公開。

Phaser 主套件產生較大 chunk 的建置提醒，建置成功；未將此提醒列為測試失敗。

## 公開範圍與安全

提交前檢查 `.gitignore`、實際追蹤檔案與常見憑證特徵。排除 `.env`、私鑰、依賴、建置輸出、Agent／編輯器本機設定、原始設計參考包及本機 QA 文件與截圖；上述本機資料保留於原處。只公開遊戲源碼、必要素材、鎖定依賴、測試與部署流程。Git 提交使用 GitHub noreply 信箱。

## 尚未完成與人工事項

部署任務已完成，沒有需要本人登入、核准或另行設定的必要人工事項。實體 iPhone／Android 的原生分享面板未實機驗證；自動化已驗證分享分支及 PNG 下載，實際作業系統分享介面仍建議用手機確認。不支援原生檔案分享時可使用 PNG 預覽及下載。

## 未來更新遊戲

在 Windows PowerShell 的專案目錄執行：

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run test:production
git add <本次確認安全的檔案>
git commit -m "feat: describe the game update"
git push origin main
```

到儲存庫 Actions 確認 **Test and deploy Pudding Tower** 成功，再開啟正式網址。僅更新 Markdown 不觸發重新部署；需要時在 Actions 選取該流程並按 **Run workflow**。若遷移儲存庫名稱或網域，需同步調整 Vite base 與 `VITE_PUBLIC_GAME_URL`。

手機直接開啟上方 HTTPS 網址即可遊玩，不需要與開發電腦連線或安裝程式。未來的新電腦開發環境需先安裝 Node.js 24，並執行 `npm.cmd ci`；本機瀏覽器測試使用 Microsoft Edge。