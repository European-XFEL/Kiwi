import React from 'react';
import * as formatting from '../../table/formatTableCell';
import * as delegateSelection from '../../table/getDisplayDelegate';
import * as limits from '../../table/getMinMax';
import { fireEvent, render, screen, within } from '@testing-library/react';
import {
  FilterTableElementModel,
  TableElementModel,
} from '@/karabo/common/api';
import { AccessLevel, Hash, HashAttributes, Schema } from '@/karabo/data/api';
import {
  DeviceProxy,
  PropertyProxy,
  VectorHashBinding,
  StringBinding,
  ProxyStatus,
} from '@/lib/binding/api';
import { callDeviceSlot } from '@/lib/request';
import { getStateColor } from '@/lib/Indicators';
import { FilterTableElement } from '../TableElement';
import TableElement from '../TableElement';

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
  const rows = [
    new Hash({ name: 'Zulu', run: true }),
    new Hash({ name: 'alpha', run: true }),
    new Hash({ name: 'Alpha[1]', run: false }),
  ];
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
  return { ctx, binding, rows, root, schema };
}

function names() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent);
}

test('literal case-insensitive filtering, clear, selector, and consecutive visible row numbers', () => {
  const { ctx } = fixture();
  const model = new FilterTableElementModel();
  model.showFilterKeyColumn = true;
  render(<FilterTableElement model={model} ctx={ctx} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Filter' }), {
    target: { value: 'ALPHA[' },
  });
  expect(names()).toEqual(['Alpha[1]']);
  expect(screen.getByRole('rowheader')).toHaveTextContent('0');
  fireEvent.click(screen.getByRole('button', { name: 'Clear Filter' }));
  expect(names()).toEqual(['Zulu', 'alpha', 'Alpha[1]']);
  fireEvent.change(screen.getByRole('combobox', { name: 'Filter column' }), {
    target: { value: 'run' },
  });
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'false' } });
  expect(names()).toEqual(['Alpha[1]']);
});

test('sorting starts at column zero ascending, toggles, and sends original row and visible index', () => {
  const { ctx, rows } = fixture();
  const model = new FilterTableElementModel();
  model.sortingEnabled = true;
  render(<FilterTableElement model={model} ctx={ctx} />);
  expect(names()).toEqual(['Alpha[1]', 'Zulu', 'alpha']);
  fireEvent.click(screen.getByRole('button', { name: 'Name' }));
  expect(names()).toEqual(['alpha', 'Zulu', 'Alpha[1]']);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'zulu' } });
  fireEvent.click(
    within(screen.getAllByRole('row')[1]).getByRole('button', { name: 'Run' })
  );
  const params = jest.mocked(callDeviceSlot).mock.calls.at(-1)![3]!;
  expect(params.table.getValue('rowData')).toBe(rows[0]);
  expect(params.table.getValue('row')).toBe(0);
  expect(params.table.getValue('column')).toBe(1);
  expect(params.table.getValue('header')).toBe('run');
});

test('schema replacement removes selected column, falls back to first column, and live values replace rows', () => {
  const { ctx, root, schema } = fixture();
  const model = new FilterTableElementModel();
  model.filterKeyColumn = 1;
  model.showFilterKeyColumn = true;
  const { rerender } = render(<FilterTableElement model={model} ctx={ctx} />);
  expect(screen.getByRole('combobox')).toHaveValue('run');
  schema.erase('run');
  const next = new VectorHashBinding({
    attributes: new HashAttributes({ rowSchema: new Schema('row', schema) }),
  });
  next.setValue([new Hash({ name: 'replacement' })], undefined);
  root.binding.value!.set('table', next);
  root.schema_update.fire();
  rerender(<FilterTableElement model={model} ctx={ctx} />);
  expect(screen.getByRole('combobox')).toHaveValue('name');
  expect(names()).toEqual(['replacement']);
  next.setValue([], undefined);
  rerender(<FilterTableElement model={model} ctx={ctx} />);
  expect(screen.getAllByRole('row')).toHaveLength(1);
  expect(screen.getByRole('textbox')).toBeInTheDocument();
});

test('editable alias uses display delegates without staging edits and honors content sizing', () => {
  const { ctx } = fixture();
  const model = new TableElementModel();
  model.klass = 'EditableTableElement';
  model.resizeToContents = true;
  render(<TableElement model={model} ctx={ctx} />);
  expect(screen.getAllByRole('button', { name: 'Run' })).toHaveLength(3);
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(ctx.proxy.edit_value).toBeUndefined();
  expect(screen.getByRole('table')).toHaveStyle({ width: 'max-content' });
});

test('empty schema keeps filter controls available and sorting is stable for equal displayed strings', () => {
  const { ctx, binding } = fixture();
  const model = new FilterTableElementModel();
  model.sortingEnabled = true;
  const first = new Hash({ name: 'same', run: true });
  const second = new Hash({ name: 'same', run: false });
  binding.setValue([first, second], undefined);
  const { rerender } = render(<FilterTableElement model={model} ctx={ctx} />);
  expect(
    within(screen.getAllByRole('row')[1]).getByRole('button', { name: 'Run' })
  ).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Name' }));
  expect(
    within(screen.getAllByRole('row')[1]).getByRole('button', { name: 'Run' })
  ).toBeEnabled();
  binding.attributes = new HashAttributes({
    rowSchema: new Schema('row', new Hash()),
  });
  rerender(<FilterTableElement model={model} ctx={ctx} />);
  expect(screen.getByText('No data')).toBeInTheDocument();
  expect(screen.getByRole('textbox')).toBeInTheDocument();
});

test('a configuration awaiting the new schema columns does not crash rendering', () => {
  const { ctx, binding, schema } = fixture();
  schema.setElement(
    'newColumn',
    new Hash(),
    new HashAttributes({ nodeType: 0, valueType: 'STRING' })
  );
  binding.attributes = new HashAttributes({
    rowSchema: new Schema('row', schema),
  });
  render(
    <FilterTableElement model={new FilterTableElementModel()} ctx={ctx} />
  );
  expect(
    screen.getByRole('columnheader', { name: 'newColumn' })
  ).toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(1);
});

test.each([false, true])(
  'last column stretches with content sizing %s',
  (resizeToContents) => {
    const { ctx } = fixture();
    const model = new TableElementModel();
    model.resizeToContents = resizeToContents;
    render(<TableElement model={model} ctx={ctx} />);
    expect(screen.getByRole('table')).toHaveStyle({ minWidth: '100%' });
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveStyle({
      width: '1%',
    });
    expect(screen.getByRole('columnheader', { name: 'Run' })).toHaveStyle({
      width: 'auto',
    });
  }
);

test('schema State columns color the whole cell and update with live values', () => {
  const { ctx, binding, schema } = fixture();
  schema.setElement(
    'state',
    new Hash(),
    new HashAttributes({
      nodeType: 0,
      valueType: 'STRING',
      displayType: 'State',
    })
  );
  binding.attributes = new HashAttributes({
    rowSchema: new Schema('row', schema),
  });
  binding.setValue(
    [new Hash({ name: 'device', run: true, state: 'ACTIVE' })],
    undefined
  );
  const model = new TableElementModel();
  const { rerender } = render(<TableElement model={model} ctx={ctx} />);
  expect(screen.getByRole('cell', { name: 'ACTIVE' })).toHaveStyle({
    backgroundColor: getStateColor('ACTIVE'),
  });
  binding.setValue(
    [new Hash({ name: 'device', run: true, state: 'ERROR' })],
    undefined
  );
  rerender(<TableElement model={model} ctx={ctx} />);
  expect(screen.getByRole('cell', { name: 'ERROR' })).toHaveStyle({
    backgroundColor: getStateColor('ERROR'),
  });
});

function HookCell({ value }: delegateSelection.DelegateProps) {
  const [caption] = React.useState('custom');
  return (
    <span>
      {caption}:{String(value)}
    </span>
  );
}

test.each([false, true])(
  'column overrides replace built-ins in filtered=%s',
  (filtered) => {
    const { ctx, binding, root, schema } = fixture();
    const normalModel = new TableElementModel();
    const filteredModel = new FilterTableElementModel();
    function View(props: {
      ctx: typeof ctx;
      delegatesByColumn?: Readonly<
        Record<number, delegateSelection.TableDelegate | undefined>
      >;
    }) {
      return filtered ? (
        <FilterTableElement {...props} model={filteredModel} />
      ) : (
        <TableElement {...props} model={normalModel} />
      );
    }
    const getStyle = jest.fn<
      React.CSSProperties,
      [delegateSelection.DelegateProps]
    >(() => ({
      backgroundColor: 'rgb(255, 0, 0)',
    }));
    const delegatesByColumn = { 0: { Component: HookCell, getStyle }, 1: {} };
    const { rerender } = render(
      <View ctx={ctx} delegatesByColumn={delegatesByColumn} />
    );
    expect(screen.getByText('custom:Zulu')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'custom:Zulu' })).toHaveStyle({
      backgroundColor: 'rgb(255, 0, 0)',
    });
    expect(
      screen.queryByRole('button', { name: 'Run' })
    ).not.toBeInTheDocument();
    expect(getStyle.mock.calls[0][0]).toMatchObject({
      value: 'Zulu',
      binding: binding.rowSchema!.name,
      ctx,
      rowData: ctx.proxy.value[0],
      row: 0,
      column: 0,
      header: 'name',
    });
    rerender(
      <View ctx={ctx} delegatesByColumn={{ 0: { getStyle }, 1: undefined }} />
    );
    expect(screen.getByRole('cell', { name: 'Zulu' })).toHaveStyle({
      backgroundColor: 'rgb(255, 0, 0)',
    });
    expect(screen.getAllByRole('button', { name: 'Run' })).toHaveLength(3);
    const inherited = Object.create({ 1: {} });
    rerender(<View ctx={ctx} delegatesByColumn={inherited} />);
    expect(screen.getAllByRole('button', { name: 'Run' })).toHaveLength(3);
    const reordered = new Hash();
    reordered.setElement(
      'run',
      schema.getValue('run'),
      schema.getAttributes('run')
    );
    reordered.setElement(
      'name',
      schema.getValue('name'),
      schema.getAttributes('name')
    );
    const next = new VectorHashBinding({
      attributes: new HashAttributes({
        rowSchema: new Schema('row', reordered),
      }),
    });
    next.setValue(ctx.proxy.value, undefined);
    root.binding.value!.set('table', next);
    root.schema_update.fire();
    rerender(<View ctx={ctx} delegatesByColumn={delegatesByColumn} />);
    expect(screen.getAllByText('custom:true')).toHaveLength(2);
    expect(screen.getByRole('cell', { name: 'Zulu' })).toBeInTheDocument();
  }
);

test('query, direction and overrides reuse row validation and prepared sort keys', () => {
  const { ctx, binding, rows } = fixture();
  const model = new FilterTableElementModel();
  model.sortingEnabled = true;
  const delegatesByColumn = {
    0: { Component: HookCell },
    1: { Component: HookCell },
  };
  const has = jest.spyOn(rows[0], 'has');
  const format = jest.spyOn(formatting, 'formatTableCell');
  const prepare = jest.spyOn(delegateSelection, 'getDisplayDelegate');
  const { rerender } = render(
    <FilterTableElement
      model={model}
      ctx={ctx}
      delegatesByColumn={delegatesByColumn}
    />
  );
  expect(format).toHaveBeenCalledTimes(3);
  const checks = has.mock.calls.length;
  format.mockClear();
  fireEvent.click(screen.getByRole('button', { name: 'Name' }));
  expect(format).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'alpha' } });
  expect(has).toHaveBeenCalledTimes(checks);
  fireEvent.click(screen.getByRole('button', { name: 'Clear Filter' }));
  format.mockClear();
  rerender(
    <FilterTableElement
      model={model}
      ctx={ctx}
      delegatesByColumn={{ ...delegatesByColumn }}
    />
  );
  expect(has).toHaveBeenCalledTimes(checks);
  expect(format).not.toHaveBeenCalled();
  expect(prepare).not.toHaveBeenCalled();
  binding.setValue([...rows], undefined);
  rerender(
    <FilterTableElement
      model={model}
      ctx={ctx}
      delegatesByColumn={delegatesByColumn}
    />
  );
  expect(has.mock.calls.length).toBeGreaterThan(checks);
  jest.restoreAllMocks();
});

test('built-in column preparation survives query, sort and value updates and refreshes for schema or map replacement', () => {
  const { ctx, binding, schema, rows } = fixture();
  schema.setElement(
    'color',
    new Hash(),
    new HashAttributes({
      nodeType: 0,
      valueType: 'STRING',
      displayType: 'TableColor|yes=red&yes=blue&bad=invalid&default=green',
    })
  );
  schema.setElement(
    'progress',
    new Hash(),
    new HashAttributes({
      nodeType: 0,
      valueType: 'DOUBLE',
      displayType: 'TableProgressBar',
      minInc: 0,
      maxInc: 10,
    })
  );
  binding.attributes = new HashAttributes({
    rowSchema: new Schema('row', schema),
  });
  const data = rows.map(
    (row, index) =>
      new Hash({
        name: row.getValue('name'),
        run: true,
        color: index === 0 ? 'yes' : 'bad',
        progress: 5,
      })
  );
  binding.setValue(data, undefined);
  const prepare = jest.spyOn(delegateSelection, 'getDisplayDelegate');
  const prepareLimits = jest.spyOn(limits, 'getMinMax');
  const has = jest.spyOn(data[0], 'has');
  const model = new FilterTableElementModel();
  model.sortingEnabled = true;
  const { rerender } = render(<FilterTableElement model={model} ctx={ctx} />);
  expect(prepare).toHaveBeenCalledTimes(4);
  expect(prepareLimits).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('cell', { name: 'yes' })).toHaveStyle({
    backgroundColor: 'rgb(255, 0, 0)',
  });
  expect(
    screen.getAllByRole('cell', { name: 'bad' })[0].style.backgroundColor
  ).toBe('');
  const checks = has.mock.calls.length;
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'alpha' } });
  fireEvent.click(screen.getByRole('button', { name: 'Name' }));
  fireEvent.click(screen.getByRole('button', { name: 'Clear Filter' }));
  rerender(<FilterTableElement model={model} ctx={ctx} />);
  expect(has).toHaveBeenCalledTimes(checks);
  binding.setValue([...data], undefined);
  rerender(<FilterTableElement model={model} ctx={ctx} />);
  expect(has.mock.calls.length).toBeGreaterThan(checks);
  expect(prepare).toHaveBeenCalledTimes(4);
  expect(prepareLimits).toHaveBeenCalledTimes(1);
  const afterValueChecks = has.mock.calls.length;
  rerender(
    <FilterTableElement model={model} ctx={ctx} delegatesByColumn={{}} />
  );
  expect(prepare).toHaveBeenCalledTimes(8);
  expect(prepareLimits).toHaveBeenCalledTimes(2);
  expect(has).toHaveBeenCalledTimes(afterValueChecks);
  schema.setElement(
    'progress',
    new Hash(),
    new HashAttributes({
      nodeType: 0,
      valueType: 'DOUBLE',
      displayType: 'TableProgressBar',
      minInc: 0,
      maxInc: 20,
    })
  );
  binding.attributes = new HashAttributes({
    rowSchema: new Schema('row', schema),
  });
  rerender(
    <FilterTableElement model={model} ctx={ctx} delegatesByColumn={{}} />
  );
  expect(prepare).toHaveBeenCalledTimes(12);
  expect(prepareLimits).toHaveBeenCalledTimes(3);
  expect(has.mock.calls.length).toBeGreaterThan(afterValueChecks);
  expect(screen.getAllByRole('progressbar')[0]).toHaveAttribute(
    'aria-valuenow',
    '25'
  );
  jest.restoreAllMocks();
});

test.each([false, true])(
  'unchanged built-in table rerenders skip cell reads and formatting, filtered=%s',
  (filtered) => {
    const { ctx, rows, binding } = fixture();
    const format = jest.spyOn(formatting, 'formatTableCell');
    const read = jest.spyOn(rows[0], 'getValue');
    const normalModel = new TableElementModel();
    const filteredModel = new FilterTableElementModel();
    const view = () =>
      filtered ? (
        <FilterTableElement model={filteredModel} ctx={ctx} />
      ) : (
        <TableElement model={normalModel} ctx={ctx} />
      );
    const { rerender } = render(view());
    format.mockClear();
    read.mockClear();
    rerender(view());
    expect(names()).toEqual(['Zulu', 'alpha', 'Alpha[1]']);
    expect(format).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
    const replacement = [
      new Hash({ name: 'updated', run: false }),
      new Hash({ name: 'alpha', run: true }),
    ];
    binding.setValue(replacement, undefined);
    rerender(view());
    expect(names()).toEqual(['updated', 'alpha']);
    expect(screen.getAllByRole('rowheader')).toHaveLength(2);
    expect(
      within(screen.getAllByRole('row')[1]).getByRole('button', {
        name: 'Run',
      })
    ).toBeDisabled();
    fireEvent.click(
      within(screen.getAllByRole('row')[2]).getByRole('button', {
        name: 'Run',
      })
    );
    const params = jest.mocked(callDeviceSlot).mock.calls.at(-1)![3]!;
    expect(params.table.getValue('rowData')).toBe(replacement[1]);
    jest.restoreAllMocks();
  }
);

test('direction changes refresh action payloads with the new visible row', () => {
  const { ctx, rows } = fixture();
  const model = new FilterTableElementModel();
  model.sortingEnabled = true;
  render(<FilterTableElement model={model} ctx={ctx} />);
  fireEvent.click(screen.getByRole('button', { name: 'Name' }));
  expect(names()).toEqual(['alpha', 'Zulu', 'Alpha[1]']);
  fireEvent.click(
    within(screen.getAllByRole('row')[1]).getByRole('button', { name: 'Run' })
  );
  const params = jest.mocked(callDeviceSlot).mock.calls.at(-1)![3]!;
  expect(params.table.getValue('rowData')).toBe(rows[1]);
  expect(params.table.getValue('row')).toBe(0);
});

test('memoized built-in tables refresh action availability from a mutable context', () => {
  const { ctx, root, binding } = fixture();
  binding.requiredAccessLevel = AccessLevel.OPERATOR;
  const model = new TableElementModel();
  const { rerender } = render(<TableElement model={model} ctx={ctx} />);
  const action = () =>
    within(screen.getAllByRole('row')[1]).getByRole('button', { name: 'Run' });
  expect(action()).toBeEnabled();
  root.status = ProxyStatus.OFFLINE;
  rerender(<TableElement model={model} ctx={ctx} />);
  expect(action()).toBeDisabled();
  root.status = ProxyStatus.ALIVE;
  rerender(<TableElement model={model} ctx={ctx} />);
  expect(action()).toBeEnabled();
  ctx.userAccessLevel = AccessLevel.OBSERVER;
  rerender(<TableElement model={model} ctx={ctx} />);
  expect(action()).toBeDisabled();
  ctx.userAccessLevel = AccessLevel.OPERATOR;
  binding.attributes.set('allowedStates', ['ACTIVE']);
  root.getBinding('state')!.setValue('ERROR', undefined);
  rerender(<TableElement model={model} ctx={ctx} />);
  expect(action()).toBeDisabled();
  root.getBinding('state')!.setValue('ACTIVE', undefined);
  rerender(<TableElement model={model} ctx={ctx} />);
  expect(action()).toBeEnabled();
});

test('column delegates skip unchanged renders and refresh on value replacement', () => {
  const { ctx, binding } = fixture();
  const rendered = jest.fn();
  const styled = jest.fn(() => ({ opacity: 0.5 }));
  function ValueCell({ value }: delegateSelection.DelegateProps) {
    rendered();
    return <span>{String(value)}</span>;
  }
  const delegatesByColumn = {
    0: {
      Component: ValueCell,
      getStyle: styled,
    },
  };
  const model = new TableElementModel();
  const { rerender } = render(
    <TableElement
      model={model}
      ctx={ctx}
      delegatesByColumn={delegatesByColumn}
    />
  );
  rendered.mockClear();
  styled.mockClear();
  rerender(
    <TableElement
      model={model}
      ctx={ctx}
      delegatesByColumn={delegatesByColumn}
    />
  );
  expect(rendered).not.toHaveBeenCalled();
  expect(styled).not.toHaveBeenCalled();
  binding.setValue([new Hash({ name: 'updated', run: true })], undefined);
  rerender(
    <TableElement
      model={model}
      ctx={ctx}
      delegatesByColumn={delegatesByColumn}
    />
  );
  expect(screen.getByRole('cell', { name: 'updated' })).toHaveStyle({
    opacity: 0.5,
  });
  expect(rendered).toHaveBeenCalledTimes(1);
  expect(styled).toHaveBeenCalledTimes(1);
});

test('style delegates refresh row context when the table is replaced', () => {
  const { ctx, binding } = fixture();
  const delegatesByColumn = {
    0: {
      getStyle: ({ rowData }: delegateSelection.DelegateProps) => ({
        opacity: rowData!.getValue('run') ? 1 : 0.5,
      }),
    },
  };
  const model = new TableElementModel();
  const view = () => (
    <TableElement
      model={model}
      ctx={ctx}
      delegatesByColumn={delegatesByColumn}
    />
  );
  const { rerender } = render(view());
  expect(screen.getByRole('cell', { name: 'Zulu' })).toHaveStyle({
    opacity: 1,
  });
  binding.setValue([new Hash({ name: 'Zulu', run: false })], undefined);
  rerender(view());
  expect(screen.getByRole('cell', { name: 'Zulu' })).toHaveStyle({
    opacity: 0.5,
  });
});
