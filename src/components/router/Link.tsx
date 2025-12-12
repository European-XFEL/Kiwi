import * as React from 'react';

export type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  text?: string;
  useNewTab?: boolean;
};

export default function Link({
  href,
  text,
  useNewTab = false,
  children,
  target: targetProp,
  rel: relProp,
  ...rest
}: LinkProps) {
  const target = useNewTab ? '_blank' : targetProp;
  const rel = useNewTab ? 'noopener noreferrer' : relProp;

  return (
    <a href={href} target={target} rel={rel} {...rest}>
      {children ?? text}
    </a>
  );
}
