import React from 'react';

type CommandButtonProps = {
  width: number;
  height: number;
  disabled: boolean;
  title?: string;
  ariaLabel: string;
  style?: React.CSSProperties;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
};

export default function CommandButton({
  width,
  height,
  disabled,
  title,
  ariaLabel,
  style,
  onClick,
  children,
}: CommandButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
      style={{
        width,
        height,
        minWidth: 0,
        minHeight: 0,
        boxSizing: 'border-box',
        ...style,
      }}
      className={`inline-flex appearance-none items-center justify-center border border-solid rounded-lg px-1 leading-none select-none shadow-[0_1px_2px_rgba(0,0,0,0.12)] ${
        disabled
          ? 'bg-gray-300 text-gray-600 border-gray-400 cursor-not-allowed'
          : 'bg-primary text-primary-foreground border-primary cursor-pointer'
      }`}
    >
      <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
        {children}
      </span>
    </button>
  );
}
