import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { Trophy, Mountain, Medal, Shirt, Star, Bike } from "lucide-react";
import koerspouleLogo from "@/assets/koerspoule-logo.png";
import { supabase } from "@/lib/supabase";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new Error(`TIMEOUT: server reageert niet binnen ${Math.round(ms / 1000)}s`));
    }, ms);
    promise
      .then((v) => { clearTimeout(id); resolve(v); })
      .catch((e) => { clearTimeout(id); reject(e); });
  });
}

function formatError(error: unknown): string {
  if (!(error instanceof Error)) return "Onbekende fout.";
  const msg = error.message;

  if (msg.startsWith("TIMEOUT"))
    return "Server reageert niet. Ga naar supabase.com/dashboard en controleer of je project actief is (niet gepauzeerd).";

  if (msg.toLowerCase().includes("email rate limit"))
    return "Te veel e-mails verstuurd. Wacht een paar minuten en probeer opnieuw.";

  if (msg.toLowerCase().includes("invalid login credentials"))
    return "Onjuist e-mailadres of wachtwoord.";

  if (msg.toLowerCase().includes("email not confirmed"))
    return "E-mail nog niet bevestigd. Check je inbox (en spam) voor de bevestigingsmail.";

  if (msg.toLowerCase().includes("user already registered"))
    return "Er bestaat al een account met dit e-mailadres. Probeer in te loggen.";

  if (msg.toLowerCase().includes("signup is disabled"))
    return "Registratie is uitgeschakeld in Supabase. Schakel het in via Authentication → Settings.";

  if (msg.toLowerCase().includes("password") && msg.toLowerCase().includes("characters"))
    return "Wachtwoord moet minimaal 6 tekens zijn.";

  return msg;
}

const floatingBadges = [
  { icon: Trophy, label: "Maglia Rosa", color: "text-primary", delay: 0 },
  { icon: Mountain, label: "Bergtrui", color: "text-blue-500", delay: 0.2 },
  { icon: Medal, label: "Puntentrui", color: "text-purple-500", delay: 0.4 },
  { icon: Shirt, label: "Wit", color: "text-muted-foreground", delay: 0.6 },
  { icon: Star, label: "Tappa", color: "text-[hsl(var(--vintage-gold))]", delay: 0.8 },
  { icon: Bike, label: "Corsa", color: "text-accent", delay: 1.0 },
];

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleForgotPassword = async () => {
    if (!supabase) return;
    const target = email.trim();
    if (!target) {
      toast({
        title: "Vul je e-mailadres in",
        description: "Type bovenin het e-mailadres waarvoor je een resetlink wilt ontvangen.",
        variant: "destructive",
      });
      return;
    }
    setIsSendingReset(true);
    try {
      // Always send users to the live site for password reset, so the link
      // never goes through lovable.dev's auth-bridge (which requires login there).
      const host = window.location.hostname;
      const resetOrigin =
        host === "localhost" || host.endsWith("lovableproject.com") || host.endsWith("lovable.app")
          ? "https://koerspoule.nl"
          : window.location.origin;
      const { error } = await withTimeout(
        supabase.auth.resetPasswordForEmail(target, {
          redirectTo: `${resetOrigin}/reset-password`,
        }),
        15000,
      );
      if (error) throw error;
      toast({
        title: "Resetlink verstuurd 📬",
        description: `Check de inbox van ${target} (ook spam) voor de link om je wachtwoord opnieuw in te stellen.`,
      });
    } catch (error) {
      toast({
        title: "Versturen mislukt",
        description: formatError(error),
        variant: "destructive",
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabase) {
      toast({
        title: "Supabase niet geconfigureerd",
        description:
          "Stel VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in als environment variables.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(isRegister ? "Account aanmaken..." : "Inloggen...");

    try {
      if (isRegister) {
        const { data, error } = await withTimeout(
          supabase.auth.signUp({ email, password }),
          15000
        );
        if (error) throw error;

        if (data.user) {
          supabase
            .from("profiles")
            .upsert(
              { id: data.user.id, display_name: name.trim() || email, is_admin: false },
              { onConflict: "id" }
            )
            .then(() => {});
        }

        toast({
          title: "Account aangemaakt! 🎉",
          description:
            data.session
              ? "Je bent ingelogd."
              : "Controleer je inbox voor de bevestigingsmail.",
        });

        if (data.session) {
          navigate("/", { replace: true });
        }
      } else {
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          15000
        );
        if (error) throw error;

        if (!data.session) {
          toast({
            title: "E-mail nog niet bevestigd",
            description: "Controleer je inbox (en spam) voor de bevestigingslink.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Ingelogd! 🚴",
          description: "Welkom terug bij Koerspoule.",
        });
        navigate("/", { replace: true });
      }
    } catch (error) {
      toast({
        title: "Actie mislukt",
        description: formatError(error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setStatusMsg("");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-8 left-8 right-8 bottom-8 border-2 border-primary/10 rounded-lg" />
        <div className="absolute top-10 left-10 right-10 bottom-10 border border-primary/5 rounded-lg" />
      </div>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {floatingBadges.map((badge, i) => {
          const Icon = badge.icon;
          return (
            <motion.div
              key={i}
              className={`absolute ${badge.color} opacity-10`}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.05, 0.15, 0.05],
                y: [0, -20, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 6,
                delay: badge.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                top: `${15 + (i * 12) % 70}%`,
                left: i % 2 === 0 ? `${5 + i * 3}%` : undefined,
                right: i % 2 !== 0 ? `${5 + i * 3}%` : undefined,
              }}
            >
              <Icon size={40 + i * 6} strokeWidth={1} />
            </motion.div>
          );
        })}
      </div>

      <div className="w-full max-w-md relative z-10">
        <motion.div
          className="text-center mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <img
            src={koerspouleLogo}
            alt="Koerspoule logo"
            className="h-20 mx-auto mb-2 drop-shadow-lg"
          />

          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
            <Star size={12} className="text-primary/50" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={isRegister ? "register" : "login"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="font-display text-3xl font-bold mb-1 tracking-tight">
                {isRegister ? "Doe mee aan de Corsa!" : "Bentornato!"}
              </h1>
              <p className="text-muted-foreground font-serif italic text-sm">
                {isRegister
                  ? "Schrijf je in en stel je droomploeg samen."
                  : "Log in en bekijk je peloton."}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <motion.div
          className="retro-border bg-card p-5 relative"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="absolute -top-3 -left-3 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md">
            <Trophy size={14} />
          </div>
          <div className="absolute -top-3 -right-3 bg-accent text-accent-foreground rounded-full p-1.5 shadow-md">
            <Medal size={14} />
          </div>

          <div className="flex justify-center gap-2 mb-4">
            {[
              { emoji: "🩷", label: "Rosa" },
              { emoji: "🔵", label: "Berg" },
              { emoji: "🟣", label: "Punten" },
              { emoji: "⚪", label: "Jongeren" },
            ].map((jersey) => (
              <span
                key={jersey.label}
                className="jersey-badge border border-border bg-secondary/50 text-secondary-foreground"
                title={jersey.label}
              >
                <span>{jersey.emoji}</span>
                <span className="text-[10px] font-medium">{jersey.label}</span>
              </span>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={isRegister ? "register-form" : "login-form"}
              initial={{ opacity: 0, x: isRegister ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRegister ? -30 : 30 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {isRegister && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Label htmlFor="name" className="font-serif">
                    Ploegnaam
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jouw naam"
                    className="mt-1"
                    required
                  />
                </motion.div>
              )}
              <div>
                <Label htmlFor="email" className="font-serif">
                  E-mailadres
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jouw@email.nl"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password" className="font-serif">
                  Wachtwoord
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1"
                  required
                  minLength={6}
                />
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full retro-border-primary font-bold text-base h-11 tracking-wide"
                >
                  {isSubmitting
                    ? statusMsg || "Bezig..."
                    : isRegister
                      ? "🚴 Account aanmaken"
                      : "🏁 Inloggen"}
                </Button>
              </motion.div>
            </motion.form>
          </AnimatePresence>

          {!isRegister && (
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isSendingReset}
                className="text-xs text-muted-foreground hover:text-accent hover:underline transition-colors font-sans disabled:opacity-50"
              >
                {isSendingReset ? "Resetlink versturen..." : "Wachtwoord vergeten? →"}
              </button>
            </div>
          )}

          <div className="vintage-divider my-4" />

          <p className="text-center text-sm text-muted-foreground font-sans">
            {isRegister ? "Al een account?" : "Nog geen account?"}{" "}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-accent font-bold hover:underline transition-colors"
            >
              {isRegister ? "Log in →" : "Schrijf je in →"}
            </button>
          </p>
        </motion.div>

        <motion.p
          className="text-center text-xs text-muted-foreground mt-4 font-sans"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Link
            to="/regels"
            className="hover:underline hover:text-foreground transition-colors"
          >
            📜 Bekijk de spelregels →
          </Link>
        </motion.p>
      </div>
    </div>
  );
}
