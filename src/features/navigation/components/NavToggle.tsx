import * as React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { NavToggleProps } from '../types/navigation.types';

export default function NavToggle({
  trigger,
  title = 'Menu',
  description,
  side = 'left',
  open,
  onOpenChange,
  closeOnContentClick = false,
  contentClassName,
  headerClassName,
  footerClassName,
  showFooter = false,
  primaryAction,
  triggerButtonProps,
  children,
}: NavToggleProps) {
  const ContentWrapper = closeOnContentClick ? SheetClose : React.Fragment;
  const wrapperProps = closeOnContentClick ? { asChild: true } : {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="outline" {...triggerButtonProps}>
            Open
          </Button>
        )}
      </SheetTrigger>

      <SheetContent
        side={side}
        className={[
          'w-[92vw] max-w-sm sm:w-[380px]',

          'grid grid-rows-[auto_1fr_auto] p-0',

          'h-dvh pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
          'overflow-x-hidden',
          contentClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <SheetClose className="absolute right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetClose>

        <SheetHeader
          className={[
            'px-4 py-3 border-b',
            'sticky top-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/70',
            headerClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <SheetTitle className="truncate">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <div
          className="
            min-h-0 overflow-y-auto overscroll-contain
            px-4 py-4
            scrollbar-gutter-stable
          "
          style={{ WebkitOverflowScrolling: 'touch' as any }}
        >
          <ContentWrapper {...wrapperProps}>
            {closeOnContentClick ? <div>{children}</div> : children}
          </ContentWrapper>
        </div>

        {showFooter && (
          <SheetFooter
            className={[
              'px-4 py-3 border-t',
              'sticky bottom-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/70',
              'gap-2 sm:justify-between',
              footerClassName,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="min-w-0 max-w-full overflow-hidden">
              {primaryAction}
            </div>
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
