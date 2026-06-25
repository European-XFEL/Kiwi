import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TabView from '../TabView';
import type { TabGroupModel } from '../../types';

function makeGroup(overrides: Partial<TabGroupModel> = {}): TabGroupModel {
  return {
    id: 'workspace-tabs',
    kind: 'default',
    tabOrder: ['tab-a', 'tab-b', 'tab-c'],
    tabs: {
      'tab-a': { id: 'tab-a', title: 'Tab A', closable: false },
      'tab-b': { id: 'tab-b', title: 'Tab B', closable: true },
      'tab-c': { id: 'tab-c', title: 'Tab C', closable: true, disabled: true },
    },
    activeTabId: 'tab-a',
    ...overrides,
  };
}

describe('TabView', () => {
  it('uses defaultActiveTabId in uncontrolled mode and updates the active panel on click', async () => {
    const user = userEvent.setup();
    const onTabSelect = jest.fn();

    render(
      <TabView
        group={makeGroup()}
        defaultActiveTabId="tab-b"
        ariaLabel="Workspace tabs"
        onTabSelect={onTabSelect}
        renderPanel={(tab) => <div>panel:{tab.id}</div>}
      />
    );

    expect(screen.getByRole('tab', { name: 'Tab B' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByText('panel:tab-b')).toBeInTheDocument();
    expect(screen.queryByText('panel:tab-a')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Tab A' }));

    expect(onTabSelect).toHaveBeenCalledWith('workspace-tabs', 'tab-a');
    expect(screen.getByRole('tab', { name: 'Tab A' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByText('panel:tab-a')).toBeInTheDocument();
    expect(screen.queryByText('panel:tab-b')).not.toBeInTheDocument();
  });

  it('falls back to the first enabled tab when the requested active tab is disabled', () => {
    render(
      <TabView
        group={makeGroup({ activeTabId: 'tab-c' })}
        activeTabId="tab-c"
        ariaLabel="Workspace tabs"
        renderPanel={(tab) => <div>panel:{tab.id}</div>}
      />
    );

    expect(screen.getByRole('tab', { name: 'Tab A' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByText('panel:tab-a')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tab C' })).toBeDisabled();
  });

  it('stays controlled when activeTabId is provided and only emits selection events', async () => {
    const user = userEvent.setup();
    const onTabSelect = jest.fn();

    render(
      <TabView
        group={makeGroup({ activeTabId: 'tab-a' })}
        activeTabId="tab-a"
        ariaLabel="Workspace tabs"
        onTabSelect={onTabSelect}
        renderPanel={(tab) => <div>panel:{tab.id}</div>}
      />
    );

    await user.click(screen.getByRole('tab', { name: 'Tab B' }));

    expect(onTabSelect).toHaveBeenCalledWith('workspace-tabs', 'tab-b');
    expect(screen.getByRole('tab', { name: 'Tab A' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByText('panel:tab-a')).toBeInTheDocument();
    expect(screen.queryByText('panel:tab-b')).not.toBeInTheDocument();
  });

  it('renders close buttons and dirty indicators from the tab model', () => {
    render(
      <TabView
        group={makeGroup({
          tabs: {
            'tab-a': {
              id: 'tab-a',
              title: 'Tab A',
              closable: true,
              dirty: true,
            },
            'tab-b': { id: 'tab-b', title: 'Tab B', closable: false },
            'tab-c': {
              id: 'tab-c',
              title: 'Tab C',
              closable: false,
              disabled: true,
            },
          },
        })}
        activeTabId="tab-a"
        ariaLabel="Workspace tabs"
        onTabClose={jest.fn()}
        renderPanel={(tab) => <div>panel:{tab.id}</div>}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Close Tab A' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Unsaved changes')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Close Tab B' })
    ).not.toBeInTheDocument();
  });

  it('keeps inactive close buttons out of the keyboard tab order', () => {
    render(
      <TabView
        group={makeGroup({
          tabs: {
            'tab-a': { id: 'tab-a', title: 'Tab A', closable: true },
            'tab-b': { id: 'tab-b', title: 'Tab B', closable: true },
            'tab-c': {
              id: 'tab-c',
              title: 'Tab C',
              closable: false,
              disabled: true,
            },
          },
        })}
        activeTabId="tab-a"
        ariaLabel="Workspace tabs"
        onTabClose={jest.fn()}
        renderPanel={(tab) => <div>panel:{tab.id}</div>}
      />
    );

    expect(screen.getByRole('button', { name: 'Close Tab A' })).toHaveAttribute(
      'tabindex',
      '0'
    );
    expect(screen.getByRole('button', { name: 'Close Tab B' })).toHaveAttribute(
      'tabindex',
      '-1'
    );
  });

  it('applies a custom panel class when provided', () => {
    render(
      <TabView
        group={makeGroup()}
        activeTabId="tab-a"
        ariaLabel="Workspace tabs"
        panelClassName="overflow-hidden"
        renderPanel={(tab) => <div>panel:{tab.id}</div>}
      />
    );

    expect(screen.getByRole('tabpanel', { name: 'Tab A' })).toHaveClass(
      'overflow-hidden'
    );
  });
});
