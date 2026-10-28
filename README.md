# PUDDING TOWER · 疊布丁

手機直式、單指點擊的布丁物理堆疊遊戲。

遊戲網址：<https://q90op90op.github.io/pudding-tower/>（實際部署狀態見 [部署報告](DEPLOYMENT_REPORT.md)）。

## 遊玩

按「開始遊戲」，抓準左右搖晃的時機，點一下遊戲區域就放下一顆布丁。成功站穩後自動出現下一顆，鏡頭跟隨高塔上移。失敗後可重玩、預覽成績卡、下載 PNG，或在支援的手機瀏覽器呼叫原生分享。右上角可開關音效。

- 10 種布丁、4 種獨立隨機風格、6 種表情。
- Phaser 4.2.1、內建 Matter Physics、TypeScript strict、Vite。
- 視覺層 Q 彈動畫與物理剛體分離，保留真實碰撞與旋轉。
- 最高紀錄及音效偏好儲存於自己的瀏覽器。
- 1080×1350 分享卡，依當局最後成功的完整塔快照產生。

## 本機開發

使用 Node.js 24，在專案根目錄執行：

```powershell
npm.cmd ci
npm.cmd run dev
```

開啟 <http://localhost:5173>。macOS／Linux 使用 `npm` 取代 `npm.cmd`。

手機區網測試時，連至相同網路並開啟 `http://<電腦區網IPv4>:5173`；可用 `ipconfig` 查詢電腦位址。原生檔案分享需安全來源與瀏覽器支援，公開的 HTTPS 遊戲網址較適合測試；PNG 預覽與下載另有備援。

## 驗證與素材

```powershell
npm.cmd run build             # TypeScript + Vite，輸出 dist/
npm.cmd test                  # 73 項 Edge 遊戲、分享與 Q 彈回歸測試
npm.cmd run test:production   # 正式子路徑、實際計分與 PNG 下載
npm.cmd run preview           # http://localhost:4173/pudding-tower/
npm.cmd run assets            # 用既有 Canvas 源碼重新輸出透明素材
```

測試與素材工具使用 Microsoft Edge；Windows 標準 GitHub runner 已提供瀏覽器。原始素材生成源碼位於 `src/game/art/`，產品 PNG 位於 `public/assets/`；概念參考板與本機測試截圖不列入公開倉庫。

## 更新公開遊戲

修改後先建置及測試，將確認安全的檔案提交至 `main` 並執行 `git push origin main`。GitHub Actions 會先在 Windows 執行完整回歸，再於標準 Ubuntu runner 建置並部署 Pages。也可到 Actions 手動執行 **Test and deploy Pudding Tower**。

僅更新 Markdown 說明文件不會重新部署遊戲。工作流程使用 GitHub 提供的部署權限，不需要另存個人 Token 或部署金鑰。

Vite 的正式路徑為 `/pudding-tower/`，開發模式仍為 `/`。如要遷移至不同的儲存庫名稱或網域，需同步調整 `vite.config.ts` 及工作流程中的 `VITE_PUBLIC_GAME_URL`。