import { fireEvent, render, screen, within } from '@testing-library/react';
import { VirtuosoMockContext } from 'react-virtuoso';
import {
  FilterTableElementModel,
  TableElementModel,
} from '@/karabo/common/api';
import { AccessLevel, Hash, HashAttributes, Schema } from '@/karabo/data/api';
import {
  DeviceProxy,
  PropertyProxy,
  ProxyStatus,
  StringBinding,
  VectorHashBinding,
} from '@/lib/binding/api';
import { callDeviceSlot } from '@/lib/request';
import { FilterTableView, TableView } from '../TableView';

jest.mock('@/lib/request', () => ({ callDeviceSlot: jest.fn() }));

function fixture() {
  const schema = new Hash();
  schema.setElement(
    'name',
    new Hash(),
    new HashAttributes({
      nodeType: 0,
      valueType: 'STRING',
      displayedName: 'Name',
    })
  );
  schema.setElement(
    'run',
    new Hash(),
    new HashAttributes({
      nodeType: 0,
      valueType: 'BOOL',
      displayedName: 'Run',
      displayType: 'TableBoolButton',
    })
  );
  const binding = new VectorHashBinding({
    attributes: new HashAttributes({ rowSchema: new Schema('row', schema) }),
  });
  const rows = Array.from(
    { length: 1000 },
    (_, index) =>
      new Hash({
        name: `row-${String(index).padStart(4, '0')}`,
        run: true,
        original: index,
      })
  );
  binding.setValue(rows, undefined);
  const root = new DeviceProxy('DEV');
  root.status = ProxyStatus.ALIVE;
  root.binding.value!.set('state', new StringBinding({ value: 'ACTIVE' }));
  root.binding.value!.set('table', binding);
  const proxy = new PropertyProxy(root, 'table');
  const ctx = {
    proxy,
    proxies: [proxy],
    userAccessLevel: AccessLevel.OPERATOR,
  };
  return { binding, rows, ctx };
}

function viewport({ children }: { children: React.ReactNode }) {
  return (
    <VirtuosoMockContext.Provider
      value={{ viewportHeight: 240, itemHeight: 24 }}
    >
      {children}
    </VirtuosoMockContext.Provider>
  );
}

function scrollTo(row: number) {
  const scroller = screen
    .getByRole('table')
    .closest('[data-virtuoso-scroller]')!;
  Object.defineProperties(scroller, {
    scrollHeight: { configurable: true, value: 24000 },
    clientHeight: { configurable: true, value: 240 },
    offsetHeight: { configurable: true, value: 240 },
  });
  fireEvent.scroll(scroller, { target: { scrollTop: row * 24 } });
  return scroller;
}

beforeEach(() => jest.clearAllMocks());

test.each([false, true])(
  'bounds mounted rows with content sizing %s',
  (resizeToContents) => {
    const { ctx } = fixture();
    const model = new TableElementModel();
    model.resizeToContents = resizeToContents;
    render(<TableView model={model} ctx={ctx} />, { wrapper: viewport });
    expect(screen.getAllByRole('rowheader').length).toBeLessThan(30);
    expect(screen.getByText('row-0000')).toBeInTheDocument();
    expect(screen.queryByText('row-0999')).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toHaveStyle({
      width: resizeToContents ? 'max-content' : '100%',
      minWidth: '100%',
    });
    scrollTo(500);
    expect(screen.getByText('row-0500')).toBeInTheDocument();
    expect(screen.queryByText('row-0000')).not.toBeInTheDocument();
    expect(screen.getAllByRole('rowheader').length).toBeLessThan(30);
  }
);

test('complete snapshots replace visible and offscreen values without resetting scroll', () => {
  const { ctx, binding } = fixture();
  const model = new TableElementModel();
  const view = () => <TableView model={model} ctx={ctx} />;
  const { rerender } = render(view(), { wrapper: viewport });
  const scroller = scrollTo(500);
  const replacement = Array.from(
    { length: 1000 },
    (_, index) =>
      new Hash({
        name: `new-${String(index).padStart(4, '0')}`,
        run: false,
        original: index,
      })
  );
  binding.setValue(replacement, undefined);
  rerender(view());
  expect(screen.getByText('new-0500')).toBeInTheDocument();
  expect(screen.queryByText('row-0500')).not.toBeInTheDocument();
  expect(scroller.scrollTop).toBe(12000);
  expect(screen.getByRole('table').closest('[data-virtuoso-scroller]')).toBe(
    scroller
  );
  expect(
    within(screen.getByText('new-0500').closest('tr')!).getByRole('button', {
      name: 'Run',
    })
  ).toBeDisabled();
  scrollTo(0);
  expect(screen.getByText('new-0000')).toBeInTheDocument();
  binding.setValue([new Hash({ name: 'short', run: true })], undefined);
  rerender(view());
  expect(screen.getByText('short')).toBeInTheDocument();
  expect(screen.getAllByRole('rowheader')).toHaveLength(1);
  binding.setValue([], undefined);
  rerender(view());
  expect(screen.queryByRole('rowheader')).not.toBeInTheDocument();
});

test('actions after filtering, descending sorting and scrolling use current original rows and displayed indices', () => {
  const { ctx, binding, rows } = fixture();
  const source = rows.map(
    (row, index) =>
      new Hash({
        name: `${index % 2 ? 'drop' : 'keep'}-${row.getValue('name')}`,
        run: true,
        original: index,
      })
  );
  binding.setValue(source, undefined);
  const model = new FilterTableElementModel();
  model.sortingEnabled = true;
  const view = () => <FilterTableView model={model} ctx={ctx} />;
  const { rerender } = render(view(), { wrapper: viewport });
  fireEvent.change(screen.getByRole('textbox', { name: 'Filter' }), {
    target: { value: 'keep' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Name' }));
  scrollTo(200);
  fireEvent.click(
    within(screen.getByText('keep-row-0598').closest('tr')!).getByRole(
      'button',
      {
        name: 'Run',
      }
    )
  );
  let params = jest.mocked(callDeviceSlot).mock.calls.at(-1)![3]!;
  expect(params.table.getValue('rowData')).toBe(source[598]);
  expect(params.table.getValue('row')).toBe(200);
  expect(params.table.getValue('column')).toBe(1);
  expect(params.table.getValue('header')).toBe('run');
  const replacement = source.map(
    (row, index) =>
      new Hash({
        name: row.getValue('name'),
        run: true,
        original: `snapshot-${index}`,
      })
  );
  binding.setValue(replacement, undefined);
  rerender(view());
  fireEvent.click(
    within(screen.getByText('keep-row-0598').closest('tr')!).getByRole(
      'button',
      {
        name: 'Run',
      }
    )
  );
  params = jest.mocked(callDeviceSlot).mock.calls.at(-1)![3]!;
  expect(params.table.getValue('rowData')).toBe(replacement[598]);
  expect(params.table.getValue('row')).toBe(200);
});

test('retains mounted source row identity across sorting and filtering', () => {
  const { ctx, binding, rows } = fixture();
  binding.setValue(rows.slice(0, 3), undefined);
  const model = new FilterTableElementModel();
  model.sortingEnabled = true;
  render(<FilterTableView model={model} ctx={ctx} />, { wrapper: viewport });
  const originalRow = screen.getByText('row-0000').closest('tr');
  fireEvent.click(screen.getByRole('button', { name: 'Name' }));
  expect(screen.getByText('row-0000').closest('tr')).toBe(originalRow);
  expect(within(originalRow!).getByRole('rowheader')).toHaveTextContent('2');
  fireEvent.change(screen.getByRole('textbox', { name: 'Filter' }), {
    target: { value: 'row-0000' },
  });
  expect(screen.getByText('row-0000').closest('tr')).toBe(originalRow);
  expect(within(originalRow!).getByRole('rowheader')).toHaveTextContent('0');
});
