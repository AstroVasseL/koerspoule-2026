import { cn } from "@/lib/utils";

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function avatarColor(userId: string): string {
  const h = hashString(userId) % 360;
  return `hsl(${h} 55% 45%)`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

interface ChatAvatarProps {
  userId: string;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function ChatAvatar({ userId, name, size = "md", className }: ChatAvatarProps) {
  const sizes = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-9 h-9 text-xs",
    lg: "w-11 h-11 text-sm",
  };
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-display font-bold text-white shrink-0 shadow-sm ring-2 ring-background",
        sizes[size],
        className
      )}
      style={{ backgroundColor: avatarColor(userId) }}
      aria-label={name ?? userId}
    >
      {initials(name ?? "?")}
    </div>
  );
}
