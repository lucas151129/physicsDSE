# 高中物理自學平台

頁面網址是 [https://lucas151129.github.io/physicsDSE/](https://lucas151129.github.io/physicsDSE/)。

這是高中物理必修部分的練習、批改與知識點掌握。說明在 [docs/framework.md](docs/framework.md)，題目格式見 [docs/question.sample.json](docs/question.sample.json)。

學生在首頁用電郵、姓名和班別註冊，登入後只看到自己的紀錄。教師入口是頁面左上角的「教師」。總帳號可以添加管理員或學生。

現在開放「力和運動」裡的四個知識點：力的合成與分解進階題、力矩、能量守恆、勻速圓周運動。其餘課題和知識點顯示「待開放」。力矩頁先顯示知識點總結，再列出題目。能量守恆和勻速圓周運動分成程度一和程度二。題目只有選擇題和計算題（短題目、長題目）。每一題附一張按題意另畫的線圖。選擇題由程式對答案，並可請 AI 分析。計算題可以拍照或上傳圖片、PDF 做 AI 改題，也可以顯示參考答案或請 AI 分析。題目、線圖和力矩總結是為這個平台另寫的，不是出版社試題庫或工作紙的原文。

第一次使用前，在 Supabase 的 SQL Editor 執行 [supabase/physics.sql](supabase/physics.sql)。這份腳本不會改動已有的 `profiles` 表。

AI 分析和 AI 改題由 Supabase 的 `grade-physics` 轉送 DeepSeek。函式要先部署，並把金鑰放在環境變數 `DEEPSEEK_API_KEY`，不要寫進這個儲存庫。儲存庫的 GitHub Actions 工作流程「Deploy grade-physics」可以代為部署，用到的密鑰是 `SUPABASE_ACCESS_TOKEN` 和 `DEEPSEEK_API_KEY`。
