import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { CheckIcon } from 'lucide-react';

import { cn } from '@/components/utils/cn';

const ROOT_CLASSNAME =
  // "peer" lets sibling elements style themselves based on this checkbox state (peer-checked, etc.)
  'peer ' +
  // Base border/background tokens (Tailwind + your design system tokens)
  'border-input dark:bg-input/30 ' +
  // When Radix state is checked, change bg/text/border
  'data-[state=checked]:bg-primary ' +
  'data-[state=checked]:text-primary-foreground ' +
  'dark:data-[state=checked]:bg-primary ' +
  'data-[state=checked]:border-primary ' +
  // Focus-visible styles (keyboard focus)
  'focus-visible:border-ring ' +
  'focus-visible:ring-ring/50 ' +
  'focus-visible:ring-[3px] ' +
  // Validation styles (aria-invalid is a common pattern)
  'aria-invalid:ring-destructive/20 ' +
  'dark:aria-invalid:ring-destructive/40 ' +
  'aria-invalid:border-destructive ' +
  // Sizing and layout
  'size-4 shrink-0 ' +
  // Shape + base visuals
  'rounded-[4px] border shadow-xs transition-shadow outline-none ' +
  // Disabled UX
  'disabled:cursor-not-allowed disabled:opacity-50';

const INDICATOR_CLASSNAME =
  'grid place-content-center text-current transition-none';

/**
 * - ComponentPropsWithoutRef: gives you all props for CheckboxPrimitive.Root
 */
type CheckboxRef = React.ComponentRef<typeof CheckboxPrimitive.Root>;
type CheckboxProps = React.ComponentPropsWithoutRef<
  typeof CheckboxPrimitive.Root
> & {
  // Note: Change in modern react, components can receive Ref!
  ref?: React.Ref<CheckboxRef>;
};

const Checkbox = React.memo(function Checkbox({
  className,
  ref,
  ...props
}: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      ref={ref} // pass the ref prop down to Radix Root
      data-slot="checkbox"
      className={cn(ROOT_CLASSNAME, className)}
      {...props} // forward all other Radix props (checked, onCheckedChange, disabled, etc.)
    >
      {/* Indicator is the checkmark container */}
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className={INDICATOR_CLASSNAME}
      >
        {/* Icon inherits color from `text-current` */}
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});

Checkbox.displayName = 'Checkbox';

export { Checkbox };
