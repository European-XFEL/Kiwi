import React from 'react';
import type { LabelProps } from '@/scene/scene_types/staticWidgets';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const Label: React.FC<LabelProps> = (props) => {
  const spanRef = React.useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = React.useState(false);

  React.useEffect(() => {
    const checkOverflow = () => {
      if (spanRef.current) {
        const overflow =
          spanRef.current.scrollWidth > spanRef.current.clientWidth;
        setIsOverflowing(overflow);
      }
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [props.text, props.width]);

  const textNode = (
    <span
      ref={spanRef}
      style={{
        width: '100%',
        color: props.foreground,
        fontFamily: props.font_family,
        fontSize: props.font_size,
        fontWeight: props.font_weight,
        fontStyle: props.font_style,
        textDecoration: props.text_decoration,
        textAlign: props.alignment,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        display: 'block',
        cursor: isOverflowing ? 'help' : 'default',
      }}
    >
      {props.text}
    </span>
  );

  return (
    <div
      className="absolute flex items-center border-solid"
      role="text"
      aria-label={props.text}
      style={{
        width: `${props.width}px`,
        height: `${props.height}px`,
        left: `${props.x}px`,
        top: `${props.y}px`,
        borderWidth: props.frame_width,
        borderColor: props.foreground,
        backgroundColor: props.background,
      }}
    >
      <TooltipProvider>
        {isOverflowing ? (
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>{textNode}</TooltipTrigger>
            <TooltipContent className="max-w-[300px] text-xs">
              {props.text}
            </TooltipContent>
          </Tooltip>
        ) : (
          textNode
        )}
      </TooltipProvider>
    </div>
  );
};

export default Label;
