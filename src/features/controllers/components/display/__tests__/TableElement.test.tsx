import { render, screen, within } from '@testing-library/react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { TableElementModel } from '@/karabo/common/api';
import { AccessLevel, Hash, HashList, HashType } from '@/karabo/data/api';
import { BoolBinding, StringBinding } from '@/lib/binding/api';
import TableElement from '../TableElement';

function renderTable() {
  const select = new BoolBinding();
  select.displayedName = 'Select';
  select.hashType = HashType.Bool;

  const channel = new StringBinding();
  channel.displayedName = 'Channel';
  channel.hashType = HashType.String;

  const ctx = {
    proxy: {
      value: new HashList([
        new Hash({ select: true, channel: 'channel_1_C' }),
        new Hash({ select: false, channel: 'channel_1_A' }),
      ]),
      binding: {
        rowSchema: { select, channel },
      },
    },
    proxies: [],
    userAccessLevel: AccessLevel.OBSERVER,
  } as unknown as ControllerContainerContext;

  return render(<TableElement model={new TableElementModel()} ctx={ctx} />);
}

test('renders a row number gutter before table data', () => {
  renderTable();

  expect(screen.getAllByRole('columnheader')).toHaveLength(3);
  expect(
    screen.getByRole('columnheader', { name: 'Select' })
  ).toBeInTheDocument();
  expect(
    screen.getByRole('columnheader', { name: 'Channel' })
  ).toBeInTheDocument();

  const rows = screen.getAllByRole('row');
  const firstDataRow = rows[1];
  const secondDataRow = rows[2];

  expect(
    within(firstDataRow).getByRole('rowheader', { name: '0' })
  ).toBeInTheDocument();
  expect(
    within(secondDataRow).getByRole('rowheader', { name: '1' })
  ).toBeInTheDocument();
  expect(within(firstDataRow).getByText('channel_1_C')).toBeInTheDocument();
  expect(within(secondDataRow).getByText('channel_1_A')).toBeInTheDocument();
});
