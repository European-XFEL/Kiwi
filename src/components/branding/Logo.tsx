import * as React from "react";

export type LogoProps = React.HTMLAttributes<HTMLDivElement> & {
  imageUrl?: string;
  logoText?: string;
  alt?: string;
  imageClassName?: string;
  textClassName?: string;
};

export default function Logo({
  className,
  imageUrl,
  logoText,
  alt,
  imageClassName = "h-10 w-auto",
  textClassName,
  ...rest
}: LogoProps) {
  const defaultTextClasses =
    "scroll-m-20  pb-2 text-3xl font-semibold tracking-tight first:mt-0";

  return (
    <div className={className} {...rest}>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={alt ?? logoText ?? "Logo"}
          className={imageClassName}
        />
      )}
      {logoText && (
        <span
          className={[defaultTextClasses, textClassName]
            .filter(Boolean)
            .join(" ")}
        >
          {logoText}
        </span>
      )}
    </div>
  );
}
