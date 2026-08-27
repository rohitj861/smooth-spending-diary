import type { SupabaseClient } from "@supabase/supabase-js";

export type MonthRow = { amount: number; category: string; date: string; note: string | null };

export function monthRange(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${y}-${pad(m + 1)}-01`;
  const endDate = new Date(Date.UTC(y, m + 1, 0));
  const end = `${endDate.getUTCFullYear()}-${pad(endDate.getUTCMonth() + 1)}-${pad(endDate.getUTCDate())}`;
  return { start, end };
}

export async function fetchMonthExpenses(supabase: SupabaseClient<any>): Promise<MonthRow[]> {
  const { start, end } = monthRange();
  const { data, error } = await supabase
    .from("expenses")
    .select("amount, category, date, note")
    .gte("date", start)
    .lte("date", end);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    amount: Number(r.amount),
    category: String(r.category),
    date: String(r.date),
    note: r.note ?? null,
  }));
}

export function summarizeRows(rows: MonthRow[]) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const byCategory = new Map<string, number>();
  for (const r of rows) byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.amount);
  const ranked = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const biggest = rows.reduce<MonthRow | null>((best, r) => (!best || r.amount > best.amount ? r : best), null);
  return { total, count: rows.length, ranked, biggest };
}

function usd(n: number) {
  return `$${n.toFixed(2)}`;
}

export function buildPrompt(rows: MonthRow[], spoken: boolean) {
  const { total, count, ranked, biggest } = summarizeRows(rows);
  const facts = [
    `Total spent this month: ${usd(total)} across ${count} expenses.`,
    `By category: ${ranked.map(([c, v]) => `${c} ${usd(v)}`).join(", ") || "none"}.`,
    biggest ? `Largest single expense: ${usd(biggest.amount)} on ${biggest.category} (${biggest.date}).` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const style = spoken
    ? "Write 55-75 words as natural spoken narration, no markdown, no lists, no emoji. Mention the total, the top category, and one practical savings tip."
    : "Write under 120 words in a warm, friendly tone. Plain prose, no markdown headings or bullets. Cover where the money went, the biggest category, and one practical tip to save.";

  return `You are a calm personal finance companion for an app called Pennywise.\n\n${facts}\n\n${style} If there are no expenses, say so kindly and encourage logging the first one.`;
}

export async function generateText(prompt: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (res.status === 429) throw new Error("Too many requests right now — try again in a moment.");
  if (res.status === 402) throw new Error("AI credits are exhausted. Add credits to continue.");
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);
  const json: any = await res.json();
  const text = json?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("No summary was generated.");
  return text as string;
}

export async function speak(text: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Voice is not configured.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini-tts",
      input: text,
      voice: "alloy",
      response_format: "mp3",
      stream_format: "audio",
    }),
  });
  if (res.status === 429) throw new Error("Too many requests right now — try again in a moment.");
  if (res.status === 402) throw new Error("AI credits are exhausted. Add credits to continue.");
  if (!res.ok) throw new Error(`Voice request failed (${res.status})`);

  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}
