import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import Tabs from '../Tabs';

const mockTabView = jest.fn();

jest.mock('../TabView', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return {
    __esModule: true,
    default: (props: unknown) => {
      mockTabView(props);
      return React.createElement('div', { 'data-testid': 'tab-view' });
    },
  };
});

describe('Tabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps items into a tab group and forwards props to TabView', () => {
    const onTabSelect = jest.fn();
    const onTabClose = jest.fn();
    const onTabContextMenu = jest.fn();
    const items = [
      {
        id: 'scene-a',
        title: 'Scene A',
        closable: true,
        dirty: true,
        panel: <div>panel-a</div>,
      },
      {
        id: 'scene-b',
        title: 'Scene B',
        closable: false,
        disabled: true,
        panel: <div>panel-b</div>,
      },
    ];

    render(
      <Tabs
        id="workspace-center"
        kind="workspace"
        items={items}
        activeTabId="scene-a"
        defaultActiveTabId="scene-b"
        ariaLabel="Scene tabs"
        className="custom-tabs"
        panelClassName="custom-panel"
        onTabSelect={onTabSelect}
        onTabClose={onTabClose}
        onTabContextMenu={onTabContextMenu}
      />
    );

    const props = mockTabView.mock.calls[0][0] as {
      activeTabId: string;
      defaultActiveTabId: string;
      ariaLabel: string;
      className: string;
      panelClassName: string;
      onTabSelect: typeof onTabSelect;
      onTabClose: typeof onTabClose;
      onTabContextMenu: typeof onTabContextMenu;
      group: {
        id: string;
        kind: string;
        tabOrder: string[];
        activeTabId: string;
        tabs: Record<
          string,
          {
            id: string;
            title: string;
            closable?: boolean;
            disabled?: boolean;
            dirty?: boolean;
          }
        >;
      };
      renderPanel: (tab: { id: string }) => ReactNode;
    };

    expect(props).toEqual(
      expect.objectContaining({
        activeTabId: 'scene-a',
        defaultActiveTabId: 'scene-b',
        ariaLabel: 'Scene tabs',
        className: 'custom-tabs',
        panelClassName: 'custom-panel',
        onTabSelect,
        onTabClose,
        onTabContextMenu,
        group: {
          id: 'workspace-center',
          kind: 'workspace',
          tabOrder: ['scene-a', 'scene-b'],
          activeTabId: 'scene-a',
          tabs: {
            'scene-a': {
              id: 'scene-a',
              title: 'Scene A',
              closable: true,
              disabled: undefined,
              dirty: true,
            },
            'scene-b': {
              id: 'scene-b',
              title: 'Scene B',
              closable: false,
              disabled: true,
              dirty: undefined,
            },
          },
        },
        renderPanel: expect.any(Function),
      })
    );
  });

  it('renders the panel associated with the requested tab through the TabView adapter', () => {
    const items: Array<{
      id: string;
      title: string;
      closable?: boolean;
      panel: ReactNode;
    }> = [
      {
        id: 'scene-a',
        title: 'Scene A',
        closable: true,
        panel: <div>panel-a</div>,
      },
      {
        id: 'scene-b',
        title: 'Scene B',
        panel: <div>panel-b</div>,
      },
    ];

    render(<Tabs id="workspace-center" items={items} activeTabId="scene-b" />);

    const props = mockTabView.mock.calls[0][0] as {
      group: { tabs: Record<string, { id: string }> };
      renderPanel: (tab: { id: string }) => ReactNode;
    };

    expect(props.renderPanel(props.group.tabs['scene-b'])).toEqual(
      items[1].panel
    );
    expect(props.renderPanel(props.group.tabs['scene-a'])).toEqual(
      items[0].panel
    );
  });
});
