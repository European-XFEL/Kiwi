import * as React from "react";

import type { JSX } from "react";
export type LayoutProps = {
  children?: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements; //maybe main, section, div as the main container tags.
};

export default function Layout({
  children,
  className,
  as: Comp = "div",
}: LayoutProps) {
  return (
    <Comp
      className={["relative w-screen h-screen", className ?? ""]
        .join(" ")
        .trim()}
    >
      {children}
    </Comp>
  );
}
