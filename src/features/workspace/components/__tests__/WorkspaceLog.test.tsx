import { StrictMode } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { toast } from 'sonner';
import { getLogger } from '@/lib/singletons/api';
import { Logger } from '@/lib/singletons/Logger';
import { SingletonContext } from '@/testing';
import WorkspaceLog from '../WorkspaceLog';

describe('WorkspaceLog', () => {
  let context: SingletonContext;
  let clipboardDescriptor: PropertyDescriptor | undefined;
  const writeText = jest.fn();

  beforeEach(() => {
    context = new SingletonContext({ logger: new Logger() });
    clipboardDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      'clipboard'
    );
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    writeText.mockReset().mockResolvedValue(undefined);
    for (const level of ['debug', 'info', 'warn', 'error'] as const) {
      jest.spyOn(console, level).mockImplementation(() => {});
    }
  });

  afterEach(() => {
    cleanup();
    window.getSelection()?.removeAllRanges();
    if (clipboardDescriptor) {
      Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
    } else {
      Reflect.deleteProperty(navigator, 'clipboard');
    }
    context.restore();
    jest.restoreAllMocks();
  });

  it('renders local timestamps, levels, colors, and literal whitespace-preserving text', () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date(2026, 9, 2, 12, 34, 56).getTime());
    render(<WorkspaceLog />);
    act(() => {
      getLogger().debug('debug message');
      getLogger().info('<b>literal</b>\n  spaces');
      getLogger().warn('warning message');
      getLogger().error('error message');
    });
    const panel = screen.getByRole('region');
    expect(panel).toHaveClass('bg-canvas');
    expect(panel.children[0]).toHaveTextContent(
      '2026-10-02 12:34:56 - DEBUG - debug message'
    );
    expect(panel.children[0]).toHaveClass('text-canvas-foreground/70');
    expect(panel.children[1].textContent).toBe(
      '2026-10-02 12:34:56 - INFO - <b>literal</b>\n  spaces'
    );
    expect(panel.children[1]).toHaveClass(
      'whitespace-pre-wrap',
      'text-canvas-foreground'
    );
    expect(panel.querySelector('b')).toBeNull();
    expect(panel.children[2]).toHaveClass('text-amber-700');
    expect(panel.children[3]).toHaveClass('text-red-700');
    expect(
      screen.getByRole('button', { name: 'Clear log' }).querySelector('img')
    ).toHaveAttribute('src', 'edit-clear-icon');
  });

  it('starts expanded, collects while folded, reopens, and clears', () => {
    render(<WorkspaceLog />);
    const toggle = screen.getByRole('button', { name: 'Application log' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(
      document.getElementById(toggle.getAttribute('aria-controls')!)
    ).toBeVisible();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    act(() => getLogger().warn('while folded'));
    expect(screen.queryByRole('region')).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByText(/WARN - while folded/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Clear log' }));
    expect(screen.getByRole('region')).toBeEmptyDOMElement();
    expect(getLogger().getSnapshot()).toEqual([]);
  });

  it('cleans up in Strict Mode, retains history, and starts expanded on remount', () => {
    const logger = getLogger();
    logger.info('before mount');
    const view = render(
      <StrictMode>
        <WorkspaceLog />
      </StrictMode>
    );
    act(() => logger.info('retained'));
    expect(logger.getSnapshot()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Application log' }));
    view.unmount();
    logger.info('after unmount');
    expect(logger.getSnapshot()).toHaveLength(1);
    render(
      <StrictMode>
        <WorkspaceLog />
      </StrictMode>
    );
    expect(screen.getByText(/INFO - retained/)).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Application log' })
    ).toHaveAttribute('aria-expanded', 'true');
    act(() => logger.info('remounted'));
    expect(logger.getSnapshot()).toHaveLength(2);
  });

  it('follows the bottom, preserves earlier reading position, and follows on reopening', () => {
    render(<WorkspaceLog />);
    const panel = screen.getByRole('region');
    Object.defineProperties(panel, {
      scrollHeight: { configurable: true, value: 200 },
      clientHeight: { configurable: true, value: 64 },
    });
    panel.scrollTop = 136;
    fireEvent.scroll(panel);
    act(() => getLogger().info('first'));
    expect(panel.scrollTop).toBe(200);
    const row = panel.children[0];
    Object.defineProperties(row, {
      offsetTop: { configurable: true, value: 4 },
      offsetHeight: { configurable: true, value: 48 },
    });
    panel.scrollTop = 20;
    fireEvent.scroll(panel);
    act(() => getLogger().info('second'));
    expect(panel.scrollTop).toBe(20);
    const toggle = screen.getByRole('button', { name: 'Application log' });
    fireEvent.click(toggle);
    act(() => getLogger().info('folded'));
    fireEvent.click(toggle);
    expect(panel.scrollTop).toBe(200);
  });

  it('keeps the visible entry anchored when the oldest entry is dropped', () => {
    render(<WorkspaceLog />);
    const panel = screen.getByRole('region');
    act(() => {
      for (let index = 0; index < 100; index++) getLogger().info(String(index));
    });
    Object.defineProperties(panel, {
      scrollHeight: { configurable: true, value: 1600 },
      clientHeight: { configurable: true, value: 64 },
    });
    Array.from(panel.children).forEach((row) => {
      Object.defineProperties(row, {
        offsetTop: {
          configurable: true,
          get: () => Array.from(panel.children).indexOf(row) * 16,
        },
        offsetHeight: { configurable: true, value: 16 },
      });
    });
    panel.scrollTop = 163;
    fireEvent.scroll(panel);
    act(() => getLogger().info('100'));
    expect(panel.scrollTop).toBe(147);
  });

  it('replaces the browser context menu and selects only log entries', async () => {
    render(<WorkspaceLog />);
    act(() => getLogger().info('select me'));
    const panel = screen.getByRole('region');
    expect(fireEvent.contextMenu(panel)).toBe(false);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Select all' }));
    const selection = window.getSelection()!;
    expect(selection.toString()).toBe(panel.textContent);
    expect(selection.getRangeAt(0).commonAncestorContainer).toBe(panel);
    expect(screen.queryByRole('menu')).toBeNull();
    await waitFor(() => expect(panel).toHaveFocus());
  });

  it('copies all retained entries as plain text with line breaks when no log text is selected', async () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date(2026, 9, 2, 12, 34, 56).getTime());
    render(<WorkspaceLog />);
    act(() => {
      getLogger().info('<b>literal</b>\n  spaces');
      getLogger().warn('warning');
    });
    const range = document.createRange();
    range.selectNodeContents(
      screen.getByRole('button', { name: 'Application log' })
    );
    window.getSelection()!.addRange(range);
    fireEvent.contextMenu(screen.getByRole('region'));
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Copy to clipboard' })
    );
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        '2026-10-02 12:34:56 - INFO - <b>literal</b>\n  spaces\n2026-10-02 12:34:56 - WARN - warning'
      )
    );
  });

  it('copies selected log text', async () => {
    render(<WorkspaceLog />);
    act(() => getLogger().info('copy this part'));
    const panel = screen.getByRole('region');
    const text = panel.firstChild!.firstChild!;
    const range = document.createRange();
    range.setStart(text, text.textContent!.indexOf('copy'));
    range.setEnd(text, text.textContent!.indexOf(' part'));
    window.getSelection()!.addRange(range);
    fireEvent.contextMenu(panel);
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Copy to clipboard' })
    );
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('copy this'));
  });

  it('disables empty log actions and closes the menu with Escape', () => {
    render(<WorkspaceLog />);
    fireEvent.contextMenu(screen.getByRole('region'));
    expect(
      screen.getByRole('menuitem', { name: 'Select all' })
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByRole('menuitem', { name: 'Copy to clipboard' })
    ).toHaveAttribute('aria-disabled', 'true');
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('reports a clipboard failure', async () => {
    writeText.mockRejectedValue(new Error('Clipboard denied'));
    const showError = jest.spyOn(toast, 'error').mockReturnValue('copy-error');
    render(<WorkspaceLog />);
    act(() => getLogger().info('message'));
    fireEvent.contextMenu(screen.getByRole('region'));
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Copy to clipboard' })
    );
    await waitFor(() =>
      expect(showError).toHaveBeenCalledWith('Could not copy log to clipboard.')
    );
  });

  it.each([{ key: 'ContextMenu' }, { key: 'F10', shiftKey: true }])(
    'opens the menu from the keyboard with $key',
    (key) => {
      render(<WorkspaceLog />);
      const panel = screen.getByRole('region');
      panel.focus();
      fireEvent.keyDown(panel, key);
      expect(
        screen.getByRole('menuitem', { name: 'Select all' })
      ).toBeVisible();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
      expect(screen.queryByRole('menu')).toBeNull();
    }
  );
});
