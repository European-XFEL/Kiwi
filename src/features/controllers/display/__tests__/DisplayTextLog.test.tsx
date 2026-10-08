import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DisplayTextLogModel } from '@/karabo/common/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { AccessLevel } from '@/karabo/data/enums';
import { Timestamp } from '@/karabo/data';
import {
  BindingRoot,
  DeviceProxy,
  PropertyProxy,
  StringBinding,
} from '@/lib/binding/api';
import DisplayTextLog from '../DisplayTextLog';

function createContext(value?: string): ControllerContainerContext {
  const root = new DeviceProxy('DEV');
  root.binding = new BindingRoot();
  const binding = new StringBinding({ value });
  root.binding.value!.set('log', binding);
  const proxy = new PropertyProxy(root, 'log');
  return { proxy, proxies: [proxy], userAccessLevel: AccessLevel.OBSERVER };
}

function mockClipboard() {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  return writeText;
}

test('renders bound text in a scrollable region and supports a missing value', () => {
  const { rerender } = render(
    <DisplayTextLog
      model={new DisplayTextLogModel()}
      ctx={createContext('log contents')}
    />
  );
  const log = screen.getByRole<HTMLDivElement>('region', {
    name: 'Text log',
  });

  expect(log).toHaveTextContent('log contents');
  expect(log).toHaveAttribute('tabindex', '0');

  rerender(
    <DisplayTextLog model={new DisplayTextLogModel()} ctx={createContext()} />
  );
  expect(log).toBeEmptyDOMElement();
});

test('appends each new binding value once and leaves the initial value unchanged', async () => {
  const ctx = createContext('first');
  const valueUpdate = jest.spyOn(ctx.proxy!, 'value_update');
  ctx.proxy!.binding!.timestamp = new Timestamp('2024-01-02T03:04:05Z');
  const { rerender } = render(
    <DisplayTextLog model={new DisplayTextLogModel()} ctx={ctx} />
  );
  expect(valueUpdate).not.toHaveBeenCalled();
  const log = screen.getByRole<HTMLDivElement>('region', {
    name: 'Text log',
  });

  expect(log.textContent).toMatch(/^\[\d{2}:\d{2}:\d{2}\]: first$/);

  (ctx.proxy!.binding as StringBinding).setValue(
    'second',
    new Timestamp('2024-01-02T04:05:06Z')
  );
  rerender(<DisplayTextLog model={new DisplayTextLogModel()} ctx={ctx} />);

  await waitFor(() =>
    expect(log.textContent).toMatch(
      /^\[\d{2}:\d{2}:\d{2}\]: first\n\[\d{2}:\d{2}:\d{2}\]: second$/
    )
  );
  const appendedText = log.textContent;

  rerender(<DisplayTextLog model={new DisplayTextLogModel()} ctx={ctx} />);
  expect(log.textContent).toBe(appendedText);
});

test('auto-follows content after the text changes', () => {
  const ctx = createContext('first');
  const { rerender } = render(
    <DisplayTextLog model={new DisplayTextLogModel()} ctx={ctx} />
  );
  const log = screen.getByRole<HTMLDivElement>('region', {
    name: 'Text log',
  });
  Object.defineProperty(log, 'scrollHeight', {
    configurable: true,
    value: 300,
  });

  (ctx.proxy!.binding as StringBinding).setValue('second', undefined);
  rerender(<DisplayTextLog model={new DisplayTextLogModel()} ctx={ctx} />);

  expect(log.scrollTop).toBe(300);
});

test('selects all text and copies only the current selection', async () => {
  const writeText = mockClipboard();
  render(
    <DisplayTextLog
      model={new DisplayTextLogModel()}
      ctx={createContext('first line\nsecond line')}
    />
  );
  const log = screen.getByRole<HTMLDivElement>('region', {
    name: 'Text log',
  });
  const textNode = log.firstChild!;
  const selection = window.getSelection()!;
  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, 5);
  selection.removeAllRanges();
  selection.addRange(range);
  fireEvent.contextMenu(log);

  const copySelected = await screen.findByRole('menuitem', {
    name: 'Copy Selected',
  });
  expect(copySelected).toBeEnabled();
  fireEvent.click(copySelected);
  await waitFor(() => expect(writeText).toHaveBeenCalledWith('first'));

  fireEvent.contextMenu(log);
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Select All' }));
  expect(selection.toString()).toBe('first line\nsecond line');
});

test('disables Copy Selected when the log has no selection', async () => {
  render(
    <DisplayTextLog
      model={new DisplayTextLogModel()}
      ctx={createContext('text')}
    />
  );
  const log = screen.getByRole<HTMLDivElement>('region', {
    name: 'Text log',
  });
  fireEvent.contextMenu(log);

  expect(
    await screen.findByRole('menuitem', { name: 'Copy Selected' })
  ).toHaveAttribute('aria-disabled', 'true');
});

test('clears displayed text until a new bound value arrives', async () => {
  const ctx = createContext('initial');
  const { rerender } = render(
    <DisplayTextLog model={new DisplayTextLogModel()} ctx={ctx} />
  );
  const log = screen.getByRole<HTMLDivElement>('region', {
    name: 'Text log',
  });

  fireEvent.click(screen.getByRole('button', { name: 'Clear text log' }));
  expect(log).toBeEmptyDOMElement();

  (ctx.proxy!.binding as StringBinding).setValue('updated', undefined);
  rerender(<DisplayTextLog model={new DisplayTextLogModel()} ctx={ctx} />);
  await waitFor(() =>
    expect(log.textContent).toMatch(/^\[\d{2}:\d{2}:\d{2}\]: updated$/)
  );
});
