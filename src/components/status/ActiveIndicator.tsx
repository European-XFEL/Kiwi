import * as React from "react";
import { useGlobalActivityStore } from "@/store/globalActivityStore";

export const ActiveIndicator: React.FC = () => {
  const lastActivity = useGlobalActivityStore((s) => s.lastActivity);
  const activityLevel = useGlobalActivityStore((s) => s.activityLevel);

  const [blink, setBlink] = React.useState(false);

  React.useEffect(() => {
    if (!lastActivity) return;
    setBlink(true);
    const t = setTimeout(() => setBlink(false), 280);
    return () => clearTimeout(t);
  }, [lastActivity]);

  const color = blink
    ? activityLevel === "slow"
      ? "bg-red-500 ring-4 ring-red-500/30"
      : activityLevel === "moderate"
      ? "bg-yellow-500 ring-4 ring-yellow-500/30"
      : "bg-emerald-500 ring-4 ring-emerald-500/40"
    : "bg-green-400";

  return (
    <div
      className="relative"
      title={
        blink
          ? "Receiving data from GUI server"
          : "Connected — no recent activity"
      }
    >
      <div
        className={`
          h-2 w-2 rounded-full transition-all duration-200
          ${color} ${blink ? "scale-125 shadow-lg" : "shadow"}
        `}
      />
      {/* Optional: tiny pulse ring only when blinking */}
      {blink && (
        <div className="absolute inset-0 animate-ping rounded-full bg-current opacity-40" />
      )}
    </div>
  );
};
