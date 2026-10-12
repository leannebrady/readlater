import * as cheerio from "cheerio";

export async function extract(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "ReadLaterBot/1.0" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const $ = cheerio.load(await res.text());
  const meta = (n) => $(`meta[property="${n}"], meta[name="${n}"]`).attr("content");

  const title = (meta("og:title") || $("title").first().text() || url).trim();
  $("script, style, nav, footer, header, aside, form, noscript").remove();

  const root = $("article").length ? $("article").first()
    : $("main").length ? $("main").first() : $("body");
  const paras = root.find("p").map((_, p) => $(p).text().replace(/\s+/g, " ").trim())
    .get().filter((t) => t.length > 40);
  const content = paras.join("\n\n").slice(0, 50_000);

  return {
    title,
    description: (meta("og:description") || meta("description") || paras[0] || "").trim(),
    content,
    site: new URL(url).hostname.replace(/^www\./, ""),
    wordCount: content.split(/\s+/).filter(Boolean).length,
  };
}

// Uses Claude when ANTHROPIC_API_KEY is set; otherwise falls back to the page description.
export async function summarize(text, fallback = "") {
  const plain = { summary: fallback.slice(0, 300), tags: [] };
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || text.length < 200) return plain;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || "claude-haiku-5-5",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `Summarize this article in 2 sentences and give 3 lowercase topic tags. Reply ONLY with JSON: {"summary":"...","tags":["..."]}\n\n${text.slice(0, 8000)}`,
        }],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const data = await res.json();
    const out = JSON.parse(data.content[0].text.replace(/```json|```/g, "").trim());
    return { summary: out.summary, tags: (out.tags || []).map((t) => String(t).toLowerCase()) };
  } catch {
    return plain;
  }
}
