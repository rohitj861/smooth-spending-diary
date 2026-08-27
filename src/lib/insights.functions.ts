import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildPrompt,
  fetchMonthExpenses,
  generateText,
  speak,
} from "./insights.server";

export const getMonthlyInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const rows = await fetchMonthExpenses(context.supabase);
    const text = await generateText(buildPrompt(rows, false));
    return { text };
  });

export const getSpokenSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const rows = await fetchMonthExpenses(context.supabase);
    const text = await generateText(buildPrompt(rows, true));
    const audio = await speak(text);
    return { text, audio };
  });
