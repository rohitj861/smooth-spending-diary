import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BlackHoleHeroSection } from "@/components/ui/blackhole-hero-section";
import { toast } from "sonner";

export function AuthCard() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account.");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <BlackHoleHeroSection
        className="min-h-screen"
        scrim="left"
        scrimStrength={0.85}
        focus={[0.7, 0.42]}
        hotColor="#FFE9D2"
        midColor="#E2703A"
        coolColor="#5C2A12"
      >
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-12 px-6 py-16 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="max-w-xl text-center lg:text-left">
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Pennywise</p>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight text-primary-foreground sm:text-6xl lg:text-7xl">
              Spend with intention
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-primary-foreground/60 lg:mx-0 mx-auto">
              A quiet place to record what you spend. Every expense, saved to
              your account — nothing else pulling at your attention.
            </p>
          </div>

          <div className="w-full max-w-sm shrink-0">
            <div className="rounded-3xl border bg-card/95 p-8 shadow-lift backdrop-blur">
              <h2 className="mb-6 text-xl font-semibold">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </h2>
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 rounded-xl"
                  />
                </div>
                <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl">
                  {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {mode === "signin" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </BlackHoleHeroSection>
    </main>
  );
}
