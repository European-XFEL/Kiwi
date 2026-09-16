import { useRef, type PointerEvent as ReactPointerEvent } from 'react';

const QUIET_FOCUS: FocusOptions & { focusVisible: boolean } = {
  focusVisible: false,
};

/**
 * Returns focus to a menu's trigger without a focus ring when the menu was
 * closed with the pointer. Browsers can paint that returned focus as keyboard
 * focus even after a mouse click; a keyboard close keeps the ring.
 */
export function useMenuFocusReturn() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const usedPointer = useRef(false);

  const contentProps = {
    onOpenAutoFocus: () => {
      usedPointer.current = false;
    },
    onPointerDownCapture: (event: ReactPointerEvent) => {
      usedPointer.current = event.button === 0 && !event.ctrlKey;
    },
    onPointerDownOutside: (
      event: CustomEvent<{ originalEvent: PointerEvent }>
    ) => {
      const pointer = event.detail.originalEvent;
      usedPointer.current = pointer.button === 0 && !pointer.ctrlKey;
    },
    onKeyDownCapture: () => {
      usedPointer.current = false;
    },
    onCloseAutoFocus: (event: Event) => {
      if (usedPointer.current) {
        event.preventDefault();
        triggerRef.current?.focus(QUIET_FOCUS);
      }
    },
  };

  return { triggerRef, contentProps };
}
