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
  const baseClasses =
    'inline-flex appearance-none items-center justify-center rounded-[3px] px-3 select-none transition-all duration-75 outline-none overflow-hidden';

  const enabledClasses =
    'text-[#222] border border-[#a0a0a0] bg-gradient-to-b from-[#fdfdfd] to-[#dedede] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] hover:from-[#ffffff] hover:to-[#e8e8e8] active:bg-none active:bg-[#d0d0d0] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)] active:border-[#888888] cursor-default';
  const disabledClasses =
    'text-[#999] border border-[#cccccc] bg-[#efefef] cursor-not-allowed';

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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        ...style,
      }}
      className={`${baseClasses} ${disabled ? disabledClasses : enabledClasses}`}
    >
      <span
        className="drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]"
        style={{
          whiteSpace: 'nowrap',
          lineHeight: 'normal',
          flexShrink: 0,
        }}
      >
        {children}
      </span>
    </button>
  );
}
