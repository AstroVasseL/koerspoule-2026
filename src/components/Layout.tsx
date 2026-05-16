import { Link, useLocation, useNavigate } from "react-router-dom";
import koerspouleLogo from "@/assets/koerspoule-logo-2026.png";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Menu, X, Coffee } from "lucide-react";
import CookieBanner from "@/components/CookieBanner";
import RouteSeo from "@/components/RouteSeo";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAccentColor } from "@/hooks/useAccentColor";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/team-samenstellen", label: "Stel je team samen" },
  { to: "/uitslagen", label: "Uitslagen" },
  { to: "/mijn-peloton", label: "Mijn Peloton" },
  { to: "/regels", label: "Koersreglement" },
  { to: "/preview", label: "Preview" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, role } = useAuth();
  const isLoggedIn = Boolean(user);

  useAccentColor();

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <RouteSeo />

      {/* Header — newspaper masthead */}
      <header className="bg-card border-b border-border/70">
        {/* Race accent line */}
        <div className="race-rule" />

        {/* Masthead row: logo + support + auth */}
        <div className="container mx-auto px-5">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2 shrink-0">
                <img
                  alt="Koerspoule logo"
                  width={256}
                  height={170}
                  decoding="async"
                  className="h-12 w-auto"
                  src={koerspouleLogo}
                />
              </Link>
              <a
                href="https://www.buymeacoffee.com/luukloohuis"
                target="_blank"
                rel="noopener noreferrer"
                title="Steun de kopgroep"
                aria-label="Steun de kopgroep via Buy Me a Coffee"
                className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 border border-primary/30 bg-primary/5 text-primary text-[11px] font-serif italic rounded hover:bg-primary/10 transition-colors"
              >
                <Coffee className="h-3 w-3 shrink-0" />
                <span>Steun de kopgroep</span>
              </a>
            </div>

            {/* Desktop auth */}
            <div className="hidden md:flex items-center gap-2">
              {isLoggedIn ? (
                <button
                  data-testid="logout-btn-desktop"
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-medium border border-foreground/30 rounded hover:bg-secondary transition-colors"
                >
                  Uitloggen
                </button>
              ) : (
                <Link
                  data-testid="login-link-desktop"
                  to="/login"
                  className="px-3 py-1.5 text-xs font-medium border border-foreground/30 rounded hover:bg-secondary transition-colors"
                >
                  Inloggen
                </Link>
              )}
            </div>

            {/* Mobile hamburger */}
            <button className="md:hidden p-1.5 -mr-1" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Desktop nav strip */}
        <div className="hidden md:block border-t border-border/40 bg-background/40">
          <div className="container mx-auto px-5">
            <nav className="flex items-center gap-1.5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "nav-link-editorial",
                      isActive && "active"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-border/40 bg-background px-4 pb-4 pt-3 flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn("nav-link-editorial", location.pathname === item.to && "active")}
              >
                {item.label}
              </Link>
            ))}
            <div className="w-full border-t border-border/40 pt-2 mt-1 flex">
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="nav-link-editorial"
                >
                  Uitloggen
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="nav-link-editorial"
                >
                  Inloggen
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>
      <BottomNav />

      {/* Footer */}
      <footer className="gradient-border-top bg-card py-5 pb-20 md:pb-5">
        <div className="container mx-auto px-5">
          <div className="vintage-ornament max-w-sm mx-auto mb-4">
            <span className="vintage-ornament-symbol">⚜</span>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p className="font-serif italic">"La Corsa Rosa" — Koerspoule, uit liefde voor de koers.</p>
            <p className="font-sans">
              Materiaalpech? Mail naar{" "}
              <a href="mailto:koerspoule@gmail.com" className="underline hover:text-foreground transition-colors">
                koerspoule@gmail.com
              </a>
            </p>
            <div className="flex items-center gap-3 font-sans">
              <button onClick={() => navigate("/juridisch")} className="underline hover:text-foreground transition-colors">Koersregels</button>
              <span>·</span>
              {role === "admin" && (
                <>
                  <Link to="/admin" className="underline hover:text-foreground transition-colors">Admin</Link>
                  <span>·</span>
                </>
              )}
              <span>© 2026 Koerspoule</span>
            </div>
          </div>
        </div>
      </footer>

      <CookieBanner />
    </div>
  );
}
