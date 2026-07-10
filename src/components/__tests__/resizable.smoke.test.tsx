import { render, screen } from '@testing-library/react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../resizable';

// Relies on the global react-resizable-panels mock from jest.setup.ts, which
// mirrors the v4 export surface (Group/Panel/Separator) the wrappers import.
// A stale local mock here would silently pass even if the wrapper imported
// names the real package no longer exports.

describe('resizable wrappers', () => {
  it('renders the shared wrappers without undefined element types', () => {
    const { container } = render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel id="left" defaultSize={50}>
          Left
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="right" defaultSize={50}>
          Right
        </ResizablePanel>
      </ResizablePanelGroup>
    );

    expect(screen.getByText('Left')).toBeInTheDocument();
    expect(screen.getByText('Right')).toBeInTheDocument();
    expect(
      container.querySelector('[data-slot="resizable-panel-group"]')
    ).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-slot="resizable-panel"]')
    ).toHaveLength(2);
    expect(
      container.querySelector('[data-slot="resizable-handle"]')
    ).toBeInTheDocument();
  });
});
