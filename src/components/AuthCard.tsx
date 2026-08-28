import { Suspense, lazy, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import blackHoleHero from "@/assets/pennywise-black-hole-hero.jpg";

// Live WebGL black hole, loaded only on the client after hydration. If WebGL
// is unavailable or the context dies, the canvas hides itself and the static
// hero image underneath stays visible — the page can never go blank.
const BlackHoleHeroSection = lazy(() =>
  import("@/components/ui/blackhole-hero-section").then((m) => ({
    default: m.BlackHoleHeroSection,
  })),
);

export function AuthCard() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [webglReady, setWebglReady] = useState(false);

  useEffect(() => {
    // Defer until after first paint so SSR/hydration is never blocked.
    const id = window.requestAnimationFrame(() => setWebglReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

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
    <main className="min-h-screen bg-background">
      <section className="relative min-h-[100svh] overflow-hidden bg-foreground">
        <img
          src={blackHoleHero}
          alt="A glowing black hole with a warm copper accretion disk"
          width={1920}
          height={1080}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-[68%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/70 to-transparent" />
        <div className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-center px-6 py-20 sm:px-10">

          <div className="mb-10 flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.35em] text-primary-foreground/70">
            <span className="grid h-6 w-6 place-items-center rounded-md border border-primary-foreground/30">
              ₽
            </span>
            Pennywise
          </div>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.02] tracking-tight text-primary-foreground sm:text-6xl lg:text-7xl">
            Money has a
            <br />
            gravity of its own
          </h1>
          <p className="mt-7 max-w-md text-sm leading-relaxed text-primary-foreground/65 sm:text-base">
            Small spends pull harder than they look. Pennywise tracks every one
            of them, quietly, and shows you where it all went.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="#access"
              onClick={() => setMode("signup")}
              className="rounded-full bg-card px-6 py-3 text-sm font-medium text-card-foreground transition hover:opacity-90"
            >
              Get started
            </a>
            <a
              href="#access"
              onClick={() => setMode("signin")}
              className="rounded-full border border-primary-foreground/30 px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary-foreground/10"
            >
              Sign in
            </a>
          </div>
        </div>
      </section>

      <section id="access" className="px-6 py-24 sm:px-10">
        <div className="mx-auto grid w-full max-w-5xl gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Quiet, careful expense tracking.
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              Log an amount, pick a category, add a note if you want. Everything
              is saved to your account and waiting for you next time.
            </p>
          </div>

          <div className="w-full max-w-sm justify-self-end">
            <div className="rounded-3xl border bg-card p-8 shadow-lift">
              <h3 className="mb-6 text-xl font-semibold">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </h3>
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
      </section>
    </main>
  );
}

