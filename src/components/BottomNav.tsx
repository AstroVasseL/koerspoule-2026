import { useLocation, useNavigate } from "react-router-dom";
import { Home, Flag, Users, Bike } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Home",    icon: Home,  to: "/"                  },
  { label: "Results", icon: Flag,  to: "/uitslagen"         },
  { label: "Peloton", icon: Users, to: "/mijn-peloton"      },
  { label: "D.S.",    icon: Bike,  to: "/team-samenstellen" },
] as const;

export default function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" aria-label="Mobiele navigatie">
      {/* Giro gradient rule */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

      <div className="grid grid-cols-4 bg-card border-t border-border/60">
        {NAV.map(({ label, icon: Icon, to }) => {
          const active =
            to === "/" ? pathname === "/" : pathname.startsWith(to);

          return (
            <button
              key={label}
              onClick={() => navigate(to)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 transition-colors relative",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span className="absolute top-0 left-1/4 right-1/4 h-[2px] rounded-full bg-primary" />
              )}
              <Icon
                className={cn("h-5 w-5 transition-transform", active && "scale-110")}
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span
                className="font-mono text-[9px] uppercase tracking-[0.12em] leading-none font-bold"
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
