import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createDefaultWorkspaceModel } from '../../utils';
import type { PanelAreaState } from '../../types';
import WorkspaceBody from '../WorkspaceBody';

const mockSubscribe = jest.fn();
const mockGetSnapshot = jest.fn();
const mockSelectTab = jest.fn();
const mockCloseTab = jest.fn();

const mockPanelWrangler = {
  subscribe: mockSubscribe,
  getSnapshot: mockGetSnapshot,
  selectTab: mockSelectTab,
  closeTab: mockCloseTab,
};

jest.mock('@/components/api', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const actual =
    jest.requireActual<typeof import('@/components/api')>('@/components/api');

  return {
    ...actual,
    ResizablePanelGroup: ({ children }: { children: ReactNode }) =>
      React.createElement(
        'div',
        { 'data-testid': 'resizable-group' },
        children
      ),
    ResizablePanel: ({
      children,
      id,
      defaultSize,
      minSize,
      maxSize,
      collapsible,
      collapsedSize,
    }: {
      children: ReactNode;
      id: string;
      defaultSize?: number;
      minSize?: number;
      maxSize?: number;
      collapsible?: boolean;
      collapsedSize?: number;
    }) =>
      React.createElement(
        'section',
        {
          'data-testid': id,
          'data-default-size': defaultSize,
          'data-min-size': minSize,
          'data-max-size': maxSize,
          'data-collapsible': collapsible ? 'true' : 'false',
          'data-collapsed-size': collapsedSize,
        },
        children
      ),
    ResizableHandle: () =>
      React.createElement('div', { 'data-testid': 'resizable-handle' }),
  };
});

jest.mock('@/components/tabs', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return {
    Tabs: ({
      ariaLabel,
      items,
      activeTabId,
    }: {
      ariaLabel: string;
      items: Array<{ id: string; title: string; panel: ReactNode }>;
      activeTabId?: string;
    }) => {
      const activeItem =
        items.find((item) => item.id === activeTabId) ?? items[0];
      return React.createElement(
        'div',
        { 'data-testid': `tabs-${ariaLabel.replace(/\s+/g, '-')}` },
        React.createElement('div', null, ariaLabel),
        React.createElement(
          'div',
          null,
          items.map((item) => item.title).join(', ')
        ),
        React.createElement('div', null, activeItem?.panel ?? null)
      );
    },
  };
});

jest.mock('@/lib/singletons/api', () => ({
  getPanelWrangler: () => mockPanelWrangler,
}));

function makePanelState(
  overrides: Partial<PanelAreaState> = {}
): PanelAreaState {
  return {
    left: {
      id: 'left',
      tabs: [{ id: 'left-1', title: 'Topology', closable: false }],
      activeTabId: 'left-1',
    },
    center: {
      id: 'center',
      tabs: [{ id: 'center-1', title: 'Scene', closable: true }],
      activeTabId: 'center-1',
    },
    right: {
      id: 'right',
      tabs: [{ id: 'right-1', title: 'Configurator', closable: false }],
      activeTabId: 'right-1',
    },
    ...overrides,
  };
}

describe('WorkspaceBody', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribe.mockImplementation(() => jest.fn());
    mockGetSnapshot.mockReturnValue(makePanelState());
  });

  it('renders each panel area with its own renderer output', () => {
    render(
      <WorkspaceBody
        body={createDefaultWorkspaceModel().body}
        renderLeftPanel={(tab) => <div>left:{tab.id}</div>}
        renderCenterPanel={(tab) => <div>center:{tab.id}</div>}
        renderRightPanel={(tab) => <div>right:{tab.id}</div>}
      />
    );

    expect(
      within(screen.getByTestId('tabs-left-panel')).getByText('left:left-1')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('tabs-center-panel')).getByText(
        'center:center-1'
      )
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('tabs-right-panel')).getByText('right:right-1')
    ).toBeInTheDocument();
  });

  it('keeps empty state local to the panel area that has no tabs', () => {
    mockGetSnapshot.mockReturnValue(
      makePanelState({
        center: {
          id: 'center',
          tabs: [],
          activeTabId: undefined,
        },
      })
    );

    render(
      <WorkspaceBody
        body={createDefaultWorkspaceModel().body}
        renderLeftPanel={(tab) => <div>left:{tab.id}</div>}
        renderCenterPanel={(tab) => <div>center:{tab.id}</div>}
        renderRightPanel={(tab) => <div>right:{tab.id}</div>}
        centerEmptyState={<div>Center empty</div>}
      />
    );

    expect(screen.getByText('Center empty')).toBeInTheDocument();
    expect(screen.queryByTestId('tabs-center-panel')).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('tabs-left-panel')).getByText('left:left-1')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('tabs-right-panel')).getByText('right:right-1')
    ).toBeInTheDocument();
  });

  it('uses the workspace panel-area model for startup sizes instead of hardcoded values', () => {
    const body = createDefaultWorkspaceModel().body;
    body.panelArea.left.collapsed = true;
    body.panelArea.left.collapsedWidthPercent = 3;
    body.panelArea.center.defaultWidthPercent = 93;
    body.panelArea.right.collapsed = true;
    body.panelArea.right.collapsedWidthPercent = 4;

    render(
      <WorkspaceBody
        body={body}
        renderLeftPanel={(tab) => <div>left:{tab.id}</div>}
        renderCenterPanel={(tab) => <div>center:{tab.id}</div>}
        renderRightPanel={(tab) => <div>right:{tab.id}</div>}
      />
    );

    expect(screen.getByTestId('workspace-left')).toHaveAttribute(
      'data-default-size',
      '3'
    );
    expect(screen.getByTestId('workspace-center')).toHaveAttribute(
      'data-default-size',
      '93'
    );
    expect(screen.getByTestId('workspace-right')).toHaveAttribute(
      'data-default-size',
      '4'
    );
    expect(screen.getByTestId('workspace-left')).toHaveAttribute(
      'data-collapsed-size',
      '3'
    );
    expect(screen.getByTestId('workspace-right')).toHaveAttribute(
      'data-collapsed-size',
      '4'
    );
  });
});
