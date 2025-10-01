type Position = "sticky" | "fixed" | "static";

export const getPositionClass = (pos: Position = "static"): string =>
  pos === "fixed"
    ? "fixed left-0 top-0"
    : pos === "sticky"
    ? "sticky left-0 top-0"
    : "";
