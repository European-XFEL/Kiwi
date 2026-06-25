import { render, screen } from '@testing-library/react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../resizable';

const resizablePanels = jest.requireActual<
  typeof import('react-resizable-panels')
>('react-resizable-panels');

describe('resizable wrappers', () => {
  it('match the installed react-resizable-panels export contract', () => {
    expect(resizablePanels.Group).toBeDefined();
    expect(resizablePanels.Panel).toBeDefined();
    expect(resizablePanels.Separator).toBeDefined();
  });

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
