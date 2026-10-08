import { fireEvent, render, screen } from '@testing-library/react';
import { AccessLevel, Hash, HashAttributes, HashType } from '@/karabo/data/api';
import {
  BaseBinding,
  BoolBinding,
  StringBinding,
  DeviceProxy,
  PropertyProxy,
  ProxyStatus,
} from '@/lib/binding/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { callDeviceSlot } from '@/lib/request';
import { showMessageBox } from '@/lib/messagebox';
import { openDeviceSceneLinkInWorkspace } from '@/features/project/api';
import { BoolButtonDelegate, StringButtonDelegate } from '../delegates';

jest.mock('@/lib/request', () => ({ callDeviceSlot: jest.fn() }));
jest.mock('@/lib/messagebox', () => ({ showMessageBox: jest.fn() }));
jest.mock('@/features/project/api', () => ({
  openDeviceSceneLinkInWorkspace: jest.fn(),
}));

function context(): ControllerContainerContext {
  const root = new DeviceProxy('DEV');
  root.status = ProxyStatus.ALIVE;
  root.binding.value!.set('state', new StringBinding({ value: 'ACTIVE' }));
  root.binding.value!.set(
    'table',
    new BaseBinding({
      attributes: new HashAttributes({
        requiredAccessLevel: AccessLevel.OPERATOR,
        allowedStates: ['ACTIVE'],
      }),
    })
  );
  const proxy = new PropertyProxy(root, 'table');
  return { proxy, proxies: [proxy], userAccessLevel: AccessLevel.OPERATOR };
}

beforeEach(() => jest.clearAllMocks());

test('boolean requests recheck live permissions before sending, including after confirmation', () => {
  const ctx = context();
  const binding = new BoolBinding();
  const rowData = new Hash({ run: true });
  const { rerender } = render(
    <BoolButtonDelegate
      binding={binding}
      value={true}
      ctx={ctx}
      rowData={rowData}
    />
  );
  ctx.proxy!.root.status = ProxyStatus.OFFLINE;
  fireEvent.click(screen.getByRole('button'));
  expect(callDeviceSlot).not.toHaveBeenCalled();
  ctx.proxy!.root.status = ProxyStatus.ALIVE;
  binding.displayType = 'TableBoolButton|confirmation=1';
  rerender(
    <BoolButtonDelegate
      binding={binding}
      value={true}
      ctx={ctx}
      rowData={rowData}
    />
  );
  const confirm = jest.spyOn(window, 'confirm').mockImplementation(() => {
    ctx.proxy!.root.getBinding('state')!.setValue('ERROR', undefined);
    return true;
  });
  fireEvent.click(screen.getByRole('button'));
  expect(callDeviceSlot).not.toHaveBeenCalled();
  confirm.mockRestore();
});

test('boolean action honors value, availability, table access and state', () => {
  const ctx = context();
  const binding = new BoolBinding();
  binding.displayedName = 'Run';
  binding.hashType = HashType.Bool;
  const { rerender } = render(
    <BoolButtonDelegate binding={binding} value={false} ctx={ctx} />
  );
  expect(screen.getByRole('button')).toBeDisabled();
  rerender(<BoolButtonDelegate binding={binding} value={true} ctx={ctx} />);
  expect(screen.getByRole('button')).toBeEnabled();
  ctx.userAccessLevel = AccessLevel.OBSERVER;
  rerender(<BoolButtonDelegate binding={binding} value={true} ctx={ctx} />);
  expect(screen.getByRole('button')).toBeDisabled();
  ctx.userAccessLevel = AccessLevel.OPERATOR;
  ctx.proxy!.root.status = ProxyStatus.OFFLINE;
  rerender(<BoolButtonDelegate binding={binding} value={true} ctx={ctx} />);
  expect(screen.getByRole('button')).toBeDisabled();
  ctx.proxy!.root.status = ProxyStatus.ALIVE;
  ctx.proxy!.root.getBinding('state')!.setValue('ERROR', undefined);
  rerender(<BoolButtonDelegate binding={binding} value={true} ctx={ctx} />);
  expect(screen.getByRole('button')).toBeDisabled();
});

test('confirmation gates the request and sends original row with visible index and schema column', () => {
  const ctx = context();
  const binding = new BoolBinding();
  binding.displayType = 'TableBoolButton|confirmation=1';
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  const rowData = new Hash({ run: true, hidden: 'original' });
  render(
    <BoolButtonDelegate
      binding={binding}
      value={true}
      ctx={ctx}
      rowData={rowData}
      row={0}
      column={2}
      header="run"
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'table' }));
  expect(callDeviceSlot).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole('button'));
  const [handler, device, slot, options] =
    jest.mocked(callDeviceSlot).mock.calls[0];
  const params = options!;
  expect(device).toBe('DEV');
  expect(slot).toBe('requestAction');
  expect(params.action).toBe('TableButton');
  expect(params.path).toBe('table');
  expect(params.table.getValue('rowData')).toBe(rowData);
  expect(params.table.getValue('row')).toBe(0);
  expect(params.table.getValue('column')).toBe(2);
  expect(params.table.getValue('header')).toBe('run');
  handler(false, new Hash({ reason: 'transport' }));
  expect(showMessageBox).toHaveBeenCalledWith(
    expect.objectContaining({ variant: 'error', msg: 'transport' })
  );
  handler(
    true,
    new Hash({
      payload: new Hash({ success: false, reason: 'payload failed' }),
    })
  );
  expect(showMessageBox).toHaveBeenLastCalledWith(
    expect.objectContaining({ msg: 'payload failed' })
  );
  confirm.mockRestore();
});

test('string buttons open URLs and named or default device scenes, ignoring malformed links', () => {
  const ctx = context();
  const binding = new StringBinding();
  binding.displayedName = 'Open';
  const open = jest.spyOn(window, 'open').mockReturnValue(null);
  const { rerender } = render(
    <StringButtonDelegate
      binding={binding}
      value="url|https://example.com/path"
      ctx={ctx}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Open' }));
  expect(open).toHaveBeenCalledWith(
    'https://example.com/path',
    '_blank',
    'noopener,noreferrer'
  );
  rerender(
    <StringButtonDelegate
      binding={binding}
      value="deviceScene|device_id=OTHER&name=overview"
      ctx={ctx}
    />
  );
  fireEvent.click(screen.getByRole('button'));
  expect(openDeviceSceneLinkInWorkspace).toHaveBeenCalledWith(
    'OTHER',
    'overview'
  );
  rerender(
    <StringButtonDelegate
      binding={binding}
      value="deviceScene|device_id=OTHER"
      ctx={ctx}
    />
  );
  fireEvent.click(screen.getByRole('button'));
  expect(openDeviceSceneLinkInWorkspace).toHaveBeenLastCalledWith(
    'OTHER',
    undefined
  );
  jest.clearAllMocks();
  for (const value of [
    'url|bad',
    'url|javascript:alert(1)',
    'deviceScene|name=x',
    'unknown|x',
    'broken',
  ]) {
    rerender(
      <StringButtonDelegate binding={binding} value={value} ctx={ctx} />
    );
    fireEvent.click(screen.getByRole('button'));
  }
  expect(open).not.toHaveBeenCalled();
  expect(openDeviceSceneLinkInWorkspace).not.toHaveBeenCalled();
  open.mockRestore();
});
