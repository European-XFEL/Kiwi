import { act, render } from '@testing-library/react';
import React from 'react';

// Capture the container Radix would portal into, without driving the real
// (jsdom-incompatible) Select open/close machinery.
let mockPortalContainer: Element | DocumentFragment | null | undefined;

jest.mock('@radix-ui/react-select', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  const make =
    (slot: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(
        'div',
        { 'data-slot': slot, ...props },
        children
      );

  return {
    __esModule: true,
    Root: make('root'),
    Trigger: make('trigger'),
    Value: make('value'),
    Icon: make('icon'),
    Group: make('group'),
    Label: make('label'),
    Item: make('item'),
    ItemText: make('item-text'),
    ItemIndicator: make('item-indicator'),
    Separator: make('separator'),
    Content: make('content'),
    Viewport: make('viewport'),
    ScrollUpButton: make('scroll-up'),
    ScrollDownButton: make('scroll-down'),
    Portal: ({
      children,
      container,
    }: {
      children?: React.ReactNode;
      container?: Element | DocumentFragment | null;
    }) => {
      mockPortalContainer = container;
      return ReactActual.createElement(
        'div',
        { 'data-testid': 'select-portal' },
        children
      );
    },
  };
});

import { SelectContent, SelectItem } from '@/components/select';

function renderContent() {
  return render(
    <SelectContent>
      <SelectItem value="a">A</SelectItem>
    </SelectContent>
  );
}

describe('SelectContent fullscreen portal', () => {
  let fsElement: Element | null;

  beforeEach(() => {
    fsElement = null;
    mockPortalContainer = undefined;
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fsElement,
    });
  });

  it('uses the default portal target when not in fullscreen', () => {
    renderContent();
    expect(mockPortalContainer ?? undefined).toBeUndefined();
  });

  it('portals into the active fullscreen element on first render', () => {
    const fs = document.createElement('div');
    document.body.appendChild(fs);
    fsElement = fs;

    renderContent();

    expect(mockPortalContainer).toBe(fs);
  });

  it('reparents into the fullscreen element when fullscreen starts after mount', () => {
    renderContent();
    expect(mockPortalContainer ?? undefined).toBeUndefined();

    const fs = document.createElement('div');
    document.body.appendChild(fs);

    act(() => {
      fsElement = fs;
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(mockPortalContainer).toBe(fs);
  });

  it('returns to the default target when fullscreen ends', () => {
    const fs = document.createElement('div');
    document.body.appendChild(fs);
    fsElement = fs;
    renderContent();
    expect(mockPortalContainer).toBe(fs);

    act(() => {
      fsElement = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(mockPortalContainer ?? undefined).toBeUndefined();
  });
});
