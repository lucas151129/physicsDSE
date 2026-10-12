const ALLOWED_ORIGINS = new Set([
  "https://lucas151129.github.io",
  "http://127.0.0.1:8765",
  "http://127.0.0.1:8766",
  "http://localhost:8765",
  "http://localhost:8766",
]);

function corsHeaders(origin: string | null): HeadersInit {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://lucas151129.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(origin: string | null, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

const SYSTEM = [
  "你是香港高中物理教師。按評分準則批改學生答案。",
  "意思相同就算該點得到，不必和參考講法逐字相同。不要自加準則以外的扣分。",
  '只回覆 json，格式是 {"points":[{"id":"準則id","hit":true}],"detail":"給學生的訂正，繁體中文","reason":"二十字以內的錯因"}。',
].join("");

const ANALYZE_SYSTEM = [
  "你是香港高中物理教師。用繁體中文分析題目。",
  "先說明用到的概念，再寫正確做法，並指出其他選項或常見錯法錯在哪裡。",
  "不要提及學生姓名、班別或電郵。",
].join("");

const IMAGE_SYSTEM = [
  "你是香港高中物理教師。學生交來的是計算題的照片或掃描。",
  "對照評分準則批改照片裡的步驟。看不清的步驟當作未寫。",
  "意思相同就算該點得到。不要自加準則以外的扣分。",
  '只回覆 json，格式是 {"points":[{"id":"準則id","hit":true}],"detail":"給學生的訂正，繁體中文","reason":"二十字以內的錯因"}。',
].join("");

type ChatMessage = { role: string; content: unknown };

function imageDataUrl(value: unknown): string | null {
  const url = String(value || "");
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,[a-z0-9+/=\r\n]+$/i.test(url)) return null;
  if (url.length > 1_400_000) return null;
  return url;
}

async function askDeepseek(key: string, messages: ChatMessage[], jsonMode: boolean): Promise<Response> {
  return await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + key,
    },
    body: JSON.stringify({
      model: "deepseek-flash",
      thinking: { type: "disabled" },
      response_format: jsonMode ? { type: "json_object" } : undefined,
      max_tokens: 900,
      messages,
    }),
  });
}

function upstreamError(origin: string | null, status: number): Response {
  if (status === 402) return json(origin, { error: "批改餘額不足。" }, 502);
  if (status === 429) return json(origin, { error: "批改服務暫時太忙，稍後再交。" }, 502);
  return json(origin, { error: "批改服務暫時無法使用。" }, 502);
}

async function readContent(origin: string | null, upstream: Response): Promise<Response | string> {
  if (!upstream.ok) return upstreamError(origin, upstream.status);
  let data: { choices?: Array<{ message?: { content?: string } }> };
  try {
    data = await upstream.json();
  } catch (_err) {
    return json(origin, { error: "批改結果無法讀取。" }, 502);
  }
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) return json(origin, { error: "沒有給出評分，請再交一次。" }, 502);
  return content;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json(origin, { error: "只接受批改請求。" }, 405);

  const key = Deno.env.get("DEEPSEEK_API_KEY") || "";
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch (_err) {
    return json(origin, { error: "請求無法讀取。" }, 400);
  }

  if (body.ping === true) return json(origin, { ok: true, configured: key.length > 10 });
  if (key.length < 10) return json(origin, { error: "批改服務尚未設定金鑰。", fallback: true }, 503);

  const task = String(body.task || "");
  if (task === "analyze" || task === "grade-image") {
    const stemText = String(body.stem || "").trim().slice(0, 4000);
    const referenceText = String(body.reference || "").slice(0, 2000);
    if (!stemText) return json(origin, { error: "沒有題目可以分析。" }, 400);
    let upstream: Response;
    try {
      if (task === "analyze") {
        upstream = await askDeepseek(key, [
          { role: "system", content: ANALYZE_SYSTEM },
          { role: "user", content: JSON.stringify({ stem: stemText, choices: body.choices || null, reference: referenceText }) },
        ], false);
      } else {
        const images = (Array.isArray(body.images) ? body.images : [body.image])
          .map(imageDataUrl)
          .filter((item): item is string => Boolean(item))
          .slice(0, 2);
        if (!images.length) return json(origin, { error: "請上傳清楚的 jpg 或 png，檔案不要太大。" }, 400);
        const scheme = Array.isArray(body.scheme) ? body.scheme.slice(0, 12) : [];
        upstream = await askDeepseek(key, [
          { role: "system", content: IMAGE_SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: JSON.stringify({ stem: stemText, reference: referenceText, scheme }) },
              ...images.map((url) => ({ type: "image_url", image_url: { url, detail: "high" } })),
            ],
          },
        ], true);
      }
    } catch (_err) {
      return json(origin, { error: "連不到批改服務。" }, 502);
    }
    const content = await readContent(origin, upstream);
    if (typeof content !== "string") return content;
    return json(origin, task === "analyze" ? { analysis: content } : { content });
  }

  const stem = String(body.stem || "").trim();
  const answer = String(body.answer || "").trim();
  const reference = String(body.reference || "").slice(0, 2000);
  const scheme = Array.isArray(body.scheme) ? body.scheme.slice(0, 12) : [];
  if (!stem || !answer || scheme.length === 0) return json(origin, { error: "請先寫下解釋。" }, 400);
  if (stem.length > 4000 || answer.length > 4000) return json(origin, { error: "答案太長。" }, 400);

  let upstream: Response;
  try {
    upstream = await askDeepseek(key, [
      { role: "system", content: SYSTEM },
      { role: "user", content: JSON.stringify({ stem, scheme, reference, answer }) },
    ], true);
  } catch (_err) {
    return json(origin, { error: "連不到批改服務。" }, 502);
  }
  const content = await readContent(origin, upstream);
  if (typeof content !== "string") return content;
  return json(origin, { content });
});
