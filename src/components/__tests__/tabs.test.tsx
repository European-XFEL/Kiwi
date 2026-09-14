import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, type TabItem } from '../tabs';

function makeItems(overrides: Partial<TabItem>[] = []): TabItem[] {
  const items: TabItem[] = [
    {
      id: 'tab-a',
      title: 'Tab A',
      closable: false,
      panel: <div>panel:tab-a</div>,
    },
    {
      id: 'tab-b',
      title: 'Tab B',
      closable: true,
      panel: <div>panel:tab-b</div>,
    },
    {
      id: 'tab-c',
      title: 'Tab C',
      closable: true,
      disabled: true,
      panel: <div>panel:tab-c</div>,
    },
  ];

  return items.map((item, index) => ({ ...item, ...overrides[index] }));
}

describe('Tabs', () => {
  it('uses defaultActiveTabId in uncontrolled mode and updates the active panel on click', async () => {
    const user = userEvent.setup();
    const onTabSelect = jest.fn();

    render(
      <Tabs
        id="workspace-tabs"
        items={makeItems()}
        defaultActiveTabId="tab-b"
        ariaLabel="Workspace tabs"
        onTabSelect={onTabSelect}
      />
    );

    expect(screen.getByRole('tab', { name: 'Tab B' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByText('panel:tab-b')).toBeInTheDocument();
    expect(screen.queryByText('panel:tab-a')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Tab A' }));

    expect(onTabSelect).toHaveBeenCalledWith('tab-a');
    expect(screen.getByRole('tab', { name: 'Tab A' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByText('panel:tab-a')).toBeInTheDocument();
    expect(screen.queryByText('panel:tab-b')).not.toBeInTheDocument();
  });

  it('falls back to the first enabled tab when the requested active tab is disabled', () => {
    render(
      <Tabs
        id="workspace-tabs"
        items={makeItems()}
        activeTabId="tab-c"
        ariaLabel="Workspace tabs"
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
      <Tabs
        id="workspace-tabs"
        items={makeItems()}
        activeTabId="tab-a"
        ariaLabel="Workspace tabs"
        onTabSelect={onTabSelect}
      />
    );

    await user.click(screen.getByRole('tab', { name: 'Tab B' }));

    expect(onTabSelect).toHaveBeenCalledWith('tab-b');
    expect(screen.getByRole('tab', { name: 'Tab A' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByText('panel:tab-a')).toBeInTheDocument();
    expect(screen.queryByText('panel:tab-b')).not.toBeInTheDocument();
  });

  it('renders close buttons and dirty indicators and emits the closed tab id', async () => {
    const user = userEvent.setup();
    const onTabClose = jest.fn();

    render(
      <Tabs
        id="workspace-tabs"
        items={makeItems([
          { closable: true, dirty: true },
          { closable: false },
        ])}
        activeTabId="tab-a"
        ariaLabel="Workspace tabs"
        onTabClose={onTabClose}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Close Tab A' }));

    expect(onTabClose).toHaveBeenCalledWith('tab-a');
    expect(screen.getByLabelText('Unsaved changes')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Close Tab B' })
    ).not.toBeInTheDocument();
  });

  it('keeps inactive close buttons out of the keyboard tab order', () => {
    render(
      <Tabs
        id="workspace-tabs"
        items={makeItems([{ closable: true }])}
        activeTabId="tab-a"
        ariaLabel="Workspace tabs"
        onTabClose={jest.fn()}
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

  it('applies custom container and panel classes', () => {
    render(
      <Tabs
        id="workspace-tabs"
        items={makeItems()}
        activeTabId="tab-a"
        ariaLabel="Workspace tabs"
        className="custom-tabs"
        panelClassName="overflow-hidden"
      />
    );

    expect(
      screen.getByRole('tablist', { name: 'Workspace tabs' }).parentElement
    ).toHaveClass('custom-tabs');
    expect(screen.getByRole('tabpanel', { name: 'Tab A' })).toHaveClass(
      'overflow-hidden'
    );
  });
});
