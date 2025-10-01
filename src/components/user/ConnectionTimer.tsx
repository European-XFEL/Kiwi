import { useEffect, useState, useCallback } from "react";
import { useGlobalStore } from "@/store/globalAppStateStore";

export type ConnectionTimerProps = {
  className?: string;
};

export default function ConnectionTimer({ className }: ConnectionTimerProps) {
  const { sessionInfo } = useGlobalStore();
  const [connectedFor, setConnectedFor] = useState("");

  const updateConnectedFor = useCallback(() => {
    const sessionStartEpoc = sessionInfo?.sessionStartEpoc;

    if (sessionStartEpoc === undefined) {
      setConnectedFor("--");
      return 1000;
    }

    const elapsedSecs = Math.floor((Date.now() - sessionStartEpoc) / 1000);
    let elapsedStr: string;
    let intervalMsecs: number;

    if (elapsedSecs > 3599) {
      // Hours and minutes
      const hours = Math.floor(elapsedSecs / 3600);
      const mins = Math.floor((elapsedSecs % 3600) / 60);
      elapsedStr = `${hours.toString().padStart(2, "0")}h ${mins
        .toString()
        .padStart(2, "0")}m`;
      intervalMsecs = 60 * 1000; // Update every minute
    } else if (elapsedSecs > 59) {
      // Minutes and seconds
      const mins = Math.floor(elapsedSecs / 60);
      const secs = elapsedSecs % 60;
      elapsedStr = `${mins.toString().padStart(2, "0")}m ${secs
        .toString()
        .padStart(2, "0")}s`;
      intervalMsecs = 3000; // Update every 3 seconds
    } else {
      // Seconds only
      elapsedStr = `${elapsedSecs.toString().padStart(2, "0")}s`;
      intervalMsecs = 1000; // Update every second
    }

    setConnectedFor(elapsedStr);
    return intervalMsecs;
  }, [sessionInfo?.sessionStartEpoc]);

  useEffect(() => {
    const interval = updateConnectedFor();
    const timer = setInterval(() => {
      updateConnectedFor();
    }, interval);

    return () => clearInterval(timer);
  }, [updateConnectedFor]);

  if (!sessionInfo) return null;

  return (
    <div className={className}>
      <span className="text-sm text-muted-foreground">
        Connected for:{" "}
        <span className="font-semibold text-foreground">{connectedFor}</span>
      </span>
    </div>
  );
}
