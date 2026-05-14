import { useDeadline } from "@/hooks/useDeadline";
import { Clock, Lock, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-display text-xl md:text-2xl font-bold tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
        {label}
      </span>
    </div>
  );
}

export default function CountdownBanner({ className }: { className?: string }) {
  const { phase, days, hours, minutes, seconds, label, closeDate, openDate } = useDeadline();

  const fmt = (d: Date) =>
    d.toLocaleString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (phase === "before_open") {
    return (
      <div className={cn("retro-border bg-card p-3 md:p-5 text-center", className)}>
        <div className="flex items-center justify-center gap-2 mb-2 text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          <span className="text-sm font-medium font-sans">{label}</span>
        </div>
        <div className="flex items-center justify-center gap-3 md:gap-4">
          <TimeUnit value={days} label="dagen" />
          <span className="font-display text-xl text-muted-foreground">:</span>
          <TimeUnit value={hours} label="uur" />
          <span className="font-display text-xl text-muted-foreground">:</span>
          <TimeUnit value={minutes} label="min" />
          <span className="font-display text-xl text-muted-foreground">:</span>
          <TimeUnit value={seconds} label="sec" />
        </div>
        <p className="text-xs text-muted-foreground mt-2 font-sans">
          De inschrijving opent op {fmt(openDate)}.
        </p>
      </div>
    );
  }

  if (phase === "open") {
    return (
      <div className={cn("retro-border-primary bg-card p-3 md:p-5 text-center", className)}>
        <div className="flex items-center justify-center gap-2 mb-2 text-primary">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-bold font-sans">{label}</span>
        </div>
        <div className="flex items-center justify-center gap-3 md:gap-4">
          <TimeUnit value={days} label="dagen" />
          <span className="font-display text-xl text-muted-foreground">:</span>
          <TimeUnit value={hours} label="uur" />
          <span className="font-display text-xl text-muted-foreground">:</span>
          <TimeUnit value={minutes} label="min" />
          <span className="font-display text-xl text-muted-foreground">:</span>
          <TimeUnit value={seconds} label="sec" />
        </div>
        <p className="text-xs text-muted-foreground mt-2 font-sans">
          Deadline: {fmt(closeDate)} — daarna kun je je selectie niet meer wijzigen.
        </p>
      </div>
    );
  }

  // closed
  return (
    <div className={cn("retro-border bg-card p-4 text-center", className)}>
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Lock className="h-4 w-4" />
        <span className="text-sm font-medium font-sans">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1 font-sans">
        De Giro is begonnen. Selecties zijn definitief.
      </p>
    </div>
  );
}
