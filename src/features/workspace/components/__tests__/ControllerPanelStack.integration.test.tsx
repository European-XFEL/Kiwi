import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { DisplayTextLogModel } from '@/karabo/common/api';
import type { ControllerPanelModel } from '../../types';
import ControllerPanelStack from '../ControllerPanelStack';
import { broadcast_event, KaraboEvent } from '@/lib/events';

jest.unmock('react-resizable-panels');

// Controller lifecycles are covered separately; this suite exercises the real
// resize library's registration, layout changes, and keyboard controls.
jest.mock('../ControllerPanel', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    default: ({
      panel,
      isVisible,
    }: {
      panel: ControllerPanelModel;
      isVisible: boolean;
    }) =>
      React.createElement(
        'section',
        { id: `${panel.id}-content`, tabIndex: -1 },
        isVisible && panel.title
      ),
  };
});

function panel(id: string): ControllerPanelModel {
  const model = new DisplayTextLogModel();
  model.height = 350;
  return { id, title: id, model };
}

function stackHeight(): number {
  const stack = screen.getByRole('region', { name: 'Controller panels' });
  return parseFloat((stack.firstElementChild as HTMLElement).style.height);
}

function share(id: string): number {
  return parseFloat(document.getElementById(id)!.style.flexGrow);
}

function activate(id: string) {
  act(() => broadcast_event(KaraboEvent.ControllerPanelActivated, { id }));
}

describe('ControllerPanelStack with react-resizable-panels', () => {
  let notifyResize: () => void;

  beforeEach(() => {
    // jsdom has no layout engine. Supply measurements from the stack's fixed
    // height and the real library's flex styles without replacing its logic.
    jest
      .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
      .mockImplementation(function (this: HTMLElement) {
        if (this.style.height.endsWith('px')) {
          return parseFloat(this.style.height);
        }
        let container = this.parentElement;
        while (container && !container.style.height.endsWith('px')) {
          container = container.parentElement;
        }
        const height = parseFloat(container?.style.height ?? '0');
        if (!this.hasAttribute('data-panel')) {
          return height;
        }
        if (!height) {
          return 0;
        }
        if (!this.style.flexGrow) {
          return parseFloat(this.style.flexBasis);
        }
        const siblings = Array.from(
          this.parentElement!.children
        ) as HTMLElement[];
        const total = siblings.reduce(
          (sum, sibling) => sum + (parseFloat(sibling.style.flexGrow) || 0),
          0
        );
        const separators = siblings.filter((sibling) =>
          sibling.hasAttribute('data-separator')
        ).length;
        return Math.round(
          ((height - separators * 8) * parseFloat(this.style.flexGrow)) / total
        );
      });
    jest
      .spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
      .mockReturnValue(600);
    jest
      .spyOn(HTMLElement.prototype, 'offsetTop', 'get')
      .mockImplementation(function (this: HTMLElement) {
        return this.parentElement
          ? Array.from(this.parentElement.children).indexOf(this)
          : 0;
      });

    const observers = new Map<
      ResizeObserver,
      { callback: ResizeObserverCallback; targets: Set<Element> }
    >();
    jest.spyOn(window, 'ResizeObserver').mockImplementation((callback) => {
      const targets = new Set<Element>();
      const observer: ResizeObserver = {
        observe: (target) => {
          targets.add(target);
        },
        unobserve: (target) => {
          targets.delete(target);
        },
        disconnect: () => {
          observers.delete(observer);
        },
      };
      observers.set(observer, { callback, targets });
      return observer;
    });
    notifyResize = () => {
      for (const [observer, { callback, targets }] of observers) {
        const entries = Array.from(targets, (target): ResizeObserverEntry => {
          const size = {
            inlineSize: 600,
            blockSize: (target as HTMLElement).offsetHeight,
          };
          return {
            target,
            borderBoxSize: [size],
            contentBoxSize: [size],
            devicePixelContentBoxSize: [size],
            contentRect: new DOMRect(0, 0, size.inlineSize, size.blockSize),
          };
        });
        callback(entries, observer);
      }
    };
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('focuses repeated activations and defers hidden activations until visible', async () => {
    const panels = [panel('first'), panel('second')];
    const view = render(<ControllerPanelStack panels={panels} isVisible />);
    act(() =>
      broadcast_event(KaraboEvent.ControllerPanelActivated, { id: 'first' })
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.getElementById('first-content')
      )
    );
    const separator = screen.getByRole('separator');
    act(() => separator.focus());
    act(() =>
      broadcast_event(KaraboEvent.ControllerPanelActivated, { id: 'first' })
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.getElementById('first-content')
      )
    );
    view.rerender(<ControllerPanelStack panels={panels} isVisible={false} />);
    act(() => separator.focus());
    act(() =>
      broadcast_event(KaraboEvent.ControllerPanelActivated, { id: 'second' })
    );
    expect(document.activeElement).toBe(separator);
    view.rerender(<ControllerPanelStack panels={panels} isVisible />);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.getElementById('second-content')
      )
    );
    expect(share('first')).toBe(50);
    expect(share('second')).toBe(50);
  });

  it('preserves resized heights through insertion, removal, and visibility changes', async () => {
    const first = panel('first');
    const second = panel('second');
    const third = panel('third');
    const view = render(<ControllerPanelStack panels={[first]} isVisible />);
    activate('first');
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.getElementById('first-content')
      )
    );
    expect(share('first')).toBe(100);
    expect(stackHeight()).toBe(428);

    view.rerender(<ControllerPanelStack panels={[first, second]} isVisible />);
    activate('second');
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.getElementById('second-content')
      )
    );
    expect(share('second')).toBe(50);
    const firstContent = document.getElementById('first-content');
    for (let i = 0; i < 6; i++) {
      fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowDown' });
    }
    expect(share('first')).toBe(80);
    expect(share('second')).toBe(20);

    view.rerender(
      <ControllerPanelStack panels={[first, second, third]} isVisible />
    );
    activate('third');
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.getElementById('third-content')
      )
    );
    expect(share('third')).toBeCloseTo(33.3333, 2);
    expect(share('first')).toBeCloseTo(53.3333, 2);
    expect(share('second')).toBeCloseTo(13.3333, 2);
    expect(stackHeight()).toBeCloseTo(1300);

    const panels = [first, third];
    view.rerender(<ControllerPanelStack panels={panels} isVisible />);
    await waitFor(() => expect(share('third')).toBeCloseTo(38.4615, 2));
    expect(share('first')).toBeCloseTo(61.5385, 2);
    expect(stackHeight()).toBeCloseTo(1120.8);
    expect(document.getElementById('first-content')).toBe(firstContent);

    view.rerender(<ControllerPanelStack panels={panels} isVisible={false} />);
    expect(screen.queryByText('first')).not.toBeInTheDocument();
    view.rerender(<ControllerPanelStack panels={panels} isVisible />);
    await waitFor(() => expect(share('first')).toBeCloseTo(61.5385, 2));
    expect(stackHeight()).toBeCloseTo(1120.8);
    expect(screen.getByText('first')).toBeInTheDocument();
  });

  it('restores a zero-height survivor and focuses it on activation', async () => {
    const first = panel('first');
    const second = panel('second');
    const view = render(
      <ControllerPanelStack panels={[first, second]} isVisible />
    );
    activate('first');
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.getElementById('first-content')
      )
    );
    expect(share('first')).toBe(50);
    const separator = screen.getByRole('separator');
    act(() => separator.focus());
    fireEvent.keyDown(separator, { key: 'Home' });
    expect(share('first')).toBe(0);
    expect(screen.queryByText('first')).not.toBeInTheDocument();

    const panels = [first];
    view.rerender(<ControllerPanelStack panels={panels} isVisible />);
    expect(stackHeight()).toBe(0);
    activate('first');
    act(notifyResize);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.getElementById('first-content')
      )
    );
    expect(share('first')).toBe(100);
    expect(stackHeight()).toBe(428);
    expect(screen.getByText('first')).toBeInTheDocument();
  });
});
