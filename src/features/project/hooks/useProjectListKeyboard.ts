import { useRef, type FocusEvent, type KeyboardEvent } from 'react';

export function useProjectListKeyboard() {
  const searchRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const focusSearch = () => searchRef.current?.querySelector('input')?.focus();
  const enabledItems = () =>
    resultsRef.current?.querySelectorAll<HTMLElement>(
      '[role="menuitem"]:not([data-disabled])'
    );

  const onContentFocusCapture = (event: FocusEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      // Redirect the menu's initial focus before its item navigation takes over.
      event.stopPropagation();
      focusSearch();
    }
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') return;
    // Keep text entry out of the menu's typeahead handling.
    event.stopPropagation();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const items = enabledItems();
      const index = event.key === 'ArrowDown' ? 0 : (items?.length ?? 0) - 1;
      items?.[index]?.focus();
    }
  };

  const onResultsKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      (event.key === 'ArrowUp' && event.target === enabledItems()?.[0]) ||
      (event.key === 'Tab' && event.shiftKey)
    ) {
      event.preventDefault();
      event.stopPropagation();
      focusSearch();
    }
  };

  return {
    searchRef,
    resultsRef,
    onContentFocusCapture,
    onSearchKeyDown,
    onResultsKeyDownCapture,
  };
}
