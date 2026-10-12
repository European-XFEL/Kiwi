import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createDefaultWorkspaceModel } from '../../utils';
import type { PanelAreaState } from '../../types';
import WorkspaceBody from '../WorkspaceBody';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import { Mediator } from '@/lib/singletons/Mediator';

const mockMediator = new Mediator();

let mockLayout = {
  'workspace-left': 0,
  'workspace-center': 100,
  'workspace-right': 0,
};
let mockLayoutChange: ((layout: typeof mockLayout) => void) | undefined;
const mockSetLayout = jest.fn((layout: typeof mockLayout) => {
  mockLayout = layout;
  mockLayoutChange?.(layout);
  return layout;
});

const mockSubscribe = jest.fn();
const mockGetSnapshot = jest.fn();
const mockSelectTab = jest.fn();
const mockCloseTab = jest.fn();

const mockPanelWrangler = {
  subscribe: mockSubscribe,
  getSnapshot: mockGetSnapshot,
  selectTab: mockSelectTab,
  closeTab: mockCloseTab,
  getContent: jest.fn(() => undefined),
  getSceneTab: jest.fn(() => undefined),
};

jest.mock('@/components/api', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const actual =
    jest.requireActual<typeof import('@/components/api')>('@/components/api');

  return {
    ...actual,
    ResizablePanelGroup: ({
      children,
      groupRef,
      onLayoutChange,
    }: {
      children: ReactNode;
      groupRef: { current: unknown };
      onLayoutChange: typeof mockLayoutChange;
    }) => {
      if (groupRef) {
        groupRef.current = {
          getLayout: () => mockLayout,
          setLayout: mockSetLayout,
        };
      }
      mockLayoutChange = onLayoutChange;
      return React.createElement(
        'div',
        { 'data-testid': 'resizable-group' },
        children
      );
    },
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
      defaultSize?: string;
      minSize?: string;
      maxSize?: string;
      collapsible?: boolean;
      collapsedSize?: string;
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
    ResizableHandle: ({ elementRef }: { elementRef: { current: unknown } }) =>
      React.createElement('div', {
        ref: elementRef,
        'data-testid': 'resizable-handle',
      }),
  };
});

jest.mock('../ControllerPanelStack', () => ({
  __esModule: true,
  default: ({ isVisible }: { isVisible: boolean }) =>
    jest.requireActual('react').createElement('div', {
      'data-testid': 'controller-stack',
      'data-visible': String(isVisible),
    }),
}));

jest.mock('@/lib/singletons/api', () => ({
  getPanelWrangler: () => mockPanelWrangler,
  getMediator: () => mockMediator,
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
      tabs: [
        { id: 'other', title: 'Other', closable: false },
        { id: 'controllers', title: 'Controllers', closable: false },
      ],
      activeTabId: 'controllers',
      controllerPanels: [],
    },
    ...overrides,
  };
}

describe('WorkspaceBody', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLayout = {
      'workspace-left': 0,
      'workspace-center': 100,
      'workspace-right': 0,
    };
    mockSubscribe.mockImplementation(() => jest.fn());
    mockGetSnapshot.mockReturnValue(makePanelState());
  });

  it('renders left and center tabs alongside the controller stack', () => {
    render(<WorkspaceBody body={createDefaultWorkspaceModel().body} />);

    expect(screen.getByRole('tab', { name: 'Topology' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('tabpanel', { name: 'Scene' })).getByText(
        'The scene is unavailable. Try opening it again.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('controller-stack')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Other' })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Controllers' })
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

    render(<WorkspaceBody body={createDefaultWorkspaceModel().body} />);

    expect(screen.getByText('No scene open')).toBeInTheDocument();
    expect(
      screen.queryByRole('tabpanel', { name: 'Scene' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Topology' })).toBeInTheDocument();
    expect(screen.getByTestId('controller-stack')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Other' })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Controllers' })
    ).toBeInTheDocument();
  });

  it('uses the workspace panel-area model for startup sizes instead of hardcoded values', () => {
    const body = createDefaultWorkspaceModel().body;
    body.panelArea.left.collapsed = true;
    body.panelArea.left.collapsedWidthPercent = 3;
    body.panelArea.center.defaultWidthPercent = 93;
    body.panelArea.right.collapsed = true;
    body.panelArea.right.collapsedWidthPercent = 4;

    render(<WorkspaceBody body={body} />);

    expect(screen.getByTestId('workspace-left')).toHaveAttribute(
      'data-default-size',
      '3%'
    );
    expect(screen.getByTestId('workspace-center')).toHaveAttribute(
      'data-default-size',
      '93%'
    );
    expect(screen.getByTestId('workspace-right')).toHaveAttribute(
      'data-default-size',
      '4%'
    );
    expect(screen.getByTestId('workspace-left')).toHaveAttribute(
      'data-collapsed-size',
      '3%'
    );
    expect(screen.getByTestId('workspace-right')).toHaveAttribute(
      'data-collapsed-size',
      '4%'
    );
  });
});

describe('WorkspaceBody fold controls', () => {
  beforeEach(() => {
    mockLayout = {
      'workspace-left': 0,
      'workspace-center': 100,
      'workspace-right': 0,
    };
    mockSetLayout.mockClear();
    mockSubscribe.mockImplementation(() => jest.fn());
    mockGetSnapshot.mockReturnValue(makePanelState());
  });
  const mount = (isPageVisible = true) =>
    render(
      <WorkspaceBody
        body={createDefaultWorkspaceModel().body}
        isPageVisible={isPageVisible}
      />
    );

  it('unfolds each side and transfers width only from the center', () => {
    mount();
    const left = screen.getByRole('button', { name: 'Unfold left panel' });
    expect(left).toHaveAttribute('aria-expanded', 'false');
    expect(left).toHaveAttribute('aria-controls', 'workspace-left');
    expect(screen.getByTestId('resizable-group')).not.toContainElement(left);
    fireEvent.click(left);
    expect(mockLayout).toEqual({
      'workspace-left': 20,
      'workspace-center': 80,
      'workspace-right': 0,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Unfold right panel' }));
    expect(mockLayout).toEqual({
      'workspace-left': 20,
      'workspace-center': 45,
      'workspace-right': 35,
    });
    expect(screen.getByTestId('controller-stack')).toHaveAttribute(
      'data-visible',
      'true'
    );
  });

  it('remembers the last positive dragged width when folding and reopening', () => {
    mount();
    act(() =>
      mockSetLayout({
        'workspace-left': 27,
        'workspace-center': 48,
        'workspace-right': 25,
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Fold left panel' }));
    expect(mockLayout).toEqual({
      'workspace-left': 0,
      'workspace-center': 75,
      'workspace-right': 25,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Unfold left panel' }));
    expect(mockLayout).toEqual({
      'workspace-left': 27,
      'workspace-center': 48,
      'workspace-right': 25,
    });
  });

  it('unfolds for every controller activation and folds when the final panel closes', () => {
    const view = mount();
    const panel = { id: 'controller-1', title: 'Controller', model: {} };
    mockGetSnapshot.mockReturnValue({
      ...makePanelState(),
      right: { ...makePanelState().right, controllerPanels: [panel] },
    });
    view.rerender(<WorkspaceBody body={createDefaultWorkspaceModel().body} />);
    expect(mockLayout['workspace-right']).toBe(35);
    fireEvent.click(screen.getByRole('button', { name: 'Fold right panel' }));
    act(() =>
      broadcast_event(KaraboEvent.ControllerPanelActivated, { id: panel.id })
    );
    expect(mockLayout['workspace-right']).toBe(35);
    mockGetSnapshot.mockReturnValue({
      ...makePanelState(),
      right: { ...makePanelState().right, controllerPanels: [] },
    });
    view.rerender(<WorkspaceBody body={createDefaultWorkspaceModel().body} />);
    expect(mockLayout['workspace-right']).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Unfold right panel' }));
    expect(mockLayout['workspace-right']).toBe(35);
  });

  it('keeps a manually folded controller area folded during unrelated rerenders', () => {
    mockGetSnapshot.mockReturnValue({
      ...makePanelState(),
      right: {
        ...makePanelState().right,
        controllerPanels: [
          { id: 'controller-1', title: 'Controller', model: {} },
        ],
      },
    });
    const view = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Fold right panel' }));
    view.rerender(<WorkspaceBody body={createDefaultWorkspaceModel().body} />);
    expect(mockLayout['workspace-right']).toBe(0);
  });

  it('clamps reopening to side and center limits while preserving the opposite width', () => {
    const body = createDefaultWorkspaceModel().body;
    body.panelArea.right.minWidthPercent = 15;
    body.panelArea.right.maxWidthPercent = 30;
    body.panelArea.center.minWidthPercent = 40;
    render(<WorkspaceBody body={body} />);
    act(() =>
      mockSetLayout({
        'workspace-left': 40,
        'workspace-center': 60,
        'workspace-right': 0,
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Unfold right panel' }));
    expect(mockLayout).toEqual({
      'workspace-left': 40,
      'workspace-center': 40,
      'workspace-right': 20,
    });
  });

  it('anchors controls to separator midpoints and isolates their pointer events', () => {
    const view = mount();
    const group = screen.getByTestId('resizable-group');
    const parent = group.parentElement!;
    jest
      .spyOn(parent, 'getBoundingClientRect')
      .mockReturnValue({ left: 10, top: 20 } as DOMRect);
    const separators = screen.getAllByTestId('resizable-handle');
    jest.spyOn(separators[0], 'getBoundingClientRect').mockReturnValue({
      left: 206,
      top: 20,
      width: 8,
      height: 400,
    } as DOMRect);
    fireEvent(window, new Event('resize'));
    const button = screen.getByRole('button', { name: 'Unfold left panel' });
    expect(button).toHaveStyle({ left: '200px', top: '200px' });
    const pointerListener = jest.fn();
    document.addEventListener('pointerdown', pointerListener);
    fireEvent.pointerDown(button);
    expect(pointerListener).not.toHaveBeenCalled();
    expect(mockSetLayout).not.toHaveBeenCalled();
    document.removeEventListener('pointerdown', pointerListener);
    view.unmount();
  });

  it('keeps the controller stack inactive when its page is hidden', () => {
    mount(false);
    fireEvent.click(screen.getByRole('button', { name: 'Unfold right panel' }));
    expect(screen.getByTestId('controller-stack')).toHaveAttribute(
      'data-visible',
      'false'
    );
  });
});
