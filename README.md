# 高中物理自學平台

頁面網址是 [https://lucas151129.github.io/physicsDSE/](https://lucas151129.github.io/physicsDSE/)。

這是高中物理必修部分的練習、批改與知識點掌握。說明在 [docs/framework.md](docs/framework.md)，題目格式見 [docs/question.sample.json](docs/question.sample.json)。

學生在首頁用電郵、姓名和班別註冊，登入後只看到自己的紀錄。教師入口是頁面左上角的「教師」。總帳號可以添加管理員或學生。

第一次使用前，在 Supabase 的 SQL Editor 執行 [supabase/physics.sql](supabase/physics.sql)。這份腳本不會改動已有的 `profiles` 表。

結構題由 Supabase 的 `grade-physics` 轉送 DeepSeek。金鑰只放在 Supabase 環境變數 `DEEPSEEK_API_KEY`，不要寫進這個儲存庫。
