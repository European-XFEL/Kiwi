import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import React from 'react';
import {
  BindingRoot,
  DeviceProxy,
  ProxyStatus,
  StringBinding,
} from '@/lib/binding/api';
import { DisplayTextLogModel } from '@/karabo/common/api';
import { PanelWrangler } from '@/lib/singletons/PanelWrangler';
import { SingletonContext } from '@/testing';
import { Timestamp } from '@/karabo/data/api';
import ControllerPanelStack from '../ControllerPanelStack';
import type { GroupProps, PanelProps } from 'react-resizable-panels';

let mockResize: (layout: Record<string, number>) => void;
let mockLayout: Record<string, number> = {};
let mockRegisteredIds: string[] = [];

// Exercise panel/container lifecycles with real controllers; only the ESM
// resizing dependency and outbound network are replaced.
jest.mock('react-resizable-panels', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    Group: ({
      children,
      groupRef,
      onLayoutChange,
      orientation,
    }: GroupProps) => {
      const nextIds = React.Children.toArray(children).flatMap((child) => {
        if (!React.isValidElement<{ children: React.ReactNode }>(child)) {
          return [];
        }
        return React.Children.toArray(child.props.children).flatMap((panel) => {
          if (React.isValidElement<{ id?: string }>(panel) && panel.props.id) {
            return [panel.props.id];
          }
          return [];
        });
      });
      // V4 finishes registration after the ancestor's layout effect.
      React.useEffect(() => {
        mockRegisteredIds = nextIds;
      });
      mockResize = (layout) => {
        mockLayout = layout;
        onLayoutChange?.(layout);
      };
      if (groupRef && typeof groupRef === 'object') {
        groupRef.current = {
          getLayout: () => {
            const stack = globalThis.document.querySelector<HTMLElement>(
              '[aria-label="Controller panels"] > div'
            );
            if (stack?.style.height === '0px') {
              return {};
            }
            return Object.fromEntries(
              mockRegisteredIds.map((id) => [
                id,
                mockLayout[id] ?? 100 / mockRegisteredIds.length,
              ])
            );
          },
          setLayout: (layout: Record<string, number>) => {
            if (Object.keys(layout).length !== mockRegisteredIds.length) {
              throw new Error('Panel registration is not complete');
            }
            mockResize(layout);
            return layout;
          },
        };
      }
      return React.createElement(
        'div',
        { 'aria-orientation': orientation },
        children
      );
    },
    Panel: ({ children, id, defaultSize }: PanelProps) =>
      React.createElement(
        'div',
        { id, 'data-default-size': defaultSize },
        children
      ),
    Separator: () => React.createElement('div', { role: 'separator' }),
  };
});

function textModel(key: string) {
  const model = new DisplayTextLogModel();
  model.keys = [key];
  model.height = 350;
  return model;
}

function stackHeight(): number {
  const stack = screen.getByRole('region', { name: 'Controller panels' });
  return parseFloat((stack.firstElementChild as HTMLElement).style.height);
}

function panelHeight(id: string): number {
  const panelCount = Object.keys(mockLayout).length;
  return (mockLayout[id] / 100) * (stackHeight() - (panelCount - 1) * 8);
}

async function withStack(
  test: (fixture: {
    wrangler: PanelWrangler;
    device: DeviceProxy;
    first: StringBinding;
    network: { onStopMonitoringDevice: jest.Mock };
    renderStack: (visible?: boolean) => React.ReactNode;
  }) => void | Promise<void>
) {
  const wrangler = new PanelWrangler();
  const device = new DeviceProxy('DEV');
  const binding = new BindingRoot();
  const first = new StringBinding({ value: 'first entry' });
  binding.value!.set('first', first);
  binding.value!.set('second', new StringBinding({ value: 'second entry' }));
  device.binding = binding;
  device.status = ProxyStatus.OFFLINE;
  const topology = { getDevice: () => device };
  const network = { onStopMonitoringDevice: jest.fn() };
  function Stack({ isVisible }: { isVisible: boolean }) {
    const snapshot = React.useSyncExternalStore(
      wrangler.subscribe,
      wrangler.getSnapshot
    );
    return (
      <ControllerPanelStack
        panels={snapshot.right.controllerPanels}
        isVisible={isVisible}
      />
    );
  }
  await SingletonContext.run(
    { panel_wrangler: wrangler, topology, network },
    async () => {
      try {
        await test({
          wrangler,
          device,
          first,
          network,
          renderStack: (isVisible = true) => <Stack isVisible={isVisible} />,
        });
      } finally {
        cleanup();
        wrangler.dispose();
      }
    }
  );
}

describe('ControllerPanelStack', () => {
  beforeEach(() => {
    mockLayout = {};
    mockRegisteredIds = [];
  });

  it('passes measured pixel dimensions to the controller without remounting it', async () => {
    const observers: {
      callback: ResizeObserverCallback;
      target?: Element;
      observer: ResizeObserver;
    }[] = [];
    const resizeObserver = jest
      .spyOn(window, 'ResizeObserver')
      .mockImplementation((callback) => {
        const record = {
          callback,
          target: undefined as Element | undefined,
          observer: {
            observe: (target: Element) => {
              record.target = target;
            },
            unobserve: jest.fn(),
            disconnect: jest.fn(),
          },
        };
        observers.push(record);
        return record.observer;
      });
    try {
      await withStack(async ({ wrangler, device, renderStack }) => {
        const addMonitor = jest.spyOn(device, 'addMonitor');
        wrangler.openControllerPanel(textModel('DEV.first'));
        const view = render(renderStack());
        const content = screen
          .getByRole('region', { name: 'DEV.first' })
          .querySelector('header')!.nextElementSibling!;
        const observer = observers.find((record) => record.target === content);
        expect(observer).toBeDefined();
        const log = screen.getByRole('region', { name: 'Text log' });
        for (const size of [
          { width: 640, height: 400 },
          { width: 520, height: 280 },
        ]) {
          act(() =>
            observer!.callback(
              [{ target: content, contentRect: size } as ResizeObserverEntry],
              observer!.observer
            )
          );
          expect(content.firstElementChild).toHaveStyle({
            width: `${size.width}px`,
            height: `${size.height}px`,
          });
          expect(screen.getByRole('region', { name: 'Text log' })).toBe(log);
        }
        expect(addMonitor).toHaveBeenCalledTimes(1);
        view.unmount();
        expect(observer!.observer.disconnect).toHaveBeenCalledTimes(1);
      });
    } finally {
      resizeObserver.mockRestore();
    }
  });

  it('preserves resized panel heights when opening and closing neighbors', async () => {
    await withStack(async ({ wrangler, first, renderStack }) => {
      const firstId = wrangler.openControllerPanel(textModel('DEV.first'))!;
      const view = render(renderStack());
      await waitFor(() => expect(mockLayout[firstId]).toBe(100));
      expect(stackHeight()).toBe(428);
      expect(
        screen
          .getByRole('region', { name: 'DEV.first' })
          .querySelector('header')
      ).toHaveStyle({ height: '28px' });
      act(() => first.setValue('later entry', new Timestamp()));
      const log = screen.getByRole('region', { name: 'Text log' });
      expect(log).toHaveTextContent('first entry');
      const secondId = wrangler.openControllerPanel(textModel('DEV.second'))!;
      view.rerender(renderStack());
      await waitFor(() => expect(mockLayout[secondId]).toBe(50));
      expect(screen.getAllByRole('region', { name: 'Text log' })).toHaveLength(
        2
      );
      expect(screen.getAllByRole('region', { name: 'Text log' })[0]).toBe(log);
      expect(mockLayout).toEqual({ [firstId]: 50, [secondId]: 50 });
      expect(stackHeight()).toBe(864);
      act(() => mockResize({ [firstId]: 80, [secondId]: 20 }));
      expect(panelHeight(firstId)).toBeCloseTo(684.8);
      expect(panelHeight(secondId)).toBeCloseTo(171.2);
      expect(log).toHaveTextContent('first entry');
      expect(log).toHaveTextContent('later entry');
      wrangler.openControllerPanel(textModel('DEV.first'));
      view.rerender(renderStack());
      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole('region', { name: 'DEV.first' })
        )
      );
      expect(mockLayout).toEqual({ [firstId]: 80, [secondId]: 20 });
      expect(screen.getAllByRole('region', { name: 'Text log' })[0]).toBe(log);
      view.rerender(renderStack(false));
      expect(
        screen.queryByRole('region', { name: 'Text log' })
      ).not.toBeInTheDocument();
      view.rerender(renderStack());
      await waitFor(() =>
        expect(
          screen.getAllByRole('region', { name: 'Text log' })
        ).toHaveLength(2)
      );
      expect(mockLayout).toEqual({ [firstId]: 80, [secondId]: 20 });
      const restoredLog = screen.getAllByRole('region', {
        name: 'Text log',
      })[0];
      const thirdId = wrangler.openControllerPanel(textModel('OTHER.value'))!;
      view.rerender(renderStack());
      await waitFor(() => expect(mockLayout[thirdId]).toBeCloseTo(33.3333));
      expect(mockLayout[firstId]).toBeCloseTo(53.3333);
      expect(mockLayout[secondId]).toBeCloseTo(13.3333);
      expect(mockLayout[thirdId]).toBeCloseTo(33.3333);
      expect(panelHeight(firstId)).toBeCloseTo(684.8);
      expect(panelHeight(secondId)).toBeCloseTo(171.2);
      expect(panelHeight(thirdId)).toBeCloseTo(428);
      expect(screen.getAllByRole('region', { name: 'Text log' })[0]).toBe(
        restoredLog
      );
      fireEvent.click(screen.getByRole('button', { name: 'Close DEV.second' }));
      view.rerender(renderStack());
      await waitFor(() => expect(mockLayout[thirdId]).toBeCloseTo(38.4615));
      expect(mockLayout[firstId]).toBeCloseTo(61.5385);
      expect(mockLayout[thirdId]).toBeCloseTo(38.4615);
      expect(panelHeight(firstId)).toBeCloseTo(684.8);
      expect(panelHeight(thirdId)).toBeCloseTo(428);
      expect(stackHeight()).toBeCloseTo(1120.8);
      expect(screen.getAllByRole('region', { name: 'Text log' })[0]).toBe(
        restoredLog
      );
    });
  });

  it('retains a collapsed survivor without scheduling layout retries', async () => {
    await withStack(async ({ wrangler, renderStack }) => {
      const firstId = wrangler.openControllerPanel(textModel('DEV.first'))!;
      const secondId = wrangler.openControllerPanel(textModel('DEV.second'))!;
      const view = render(renderStack());
      await waitFor(() => expect(mockLayout[firstId]).toBe(50));
      act(() => mockResize({ [firstId]: 0, [secondId]: 100 }));
      const requestFrame = jest.spyOn(window, 'requestAnimationFrame');
      try {
        wrangler.closeControllerPanel(secondId);
        view.rerender(renderStack());
        expect(stackHeight()).toBe(0);
        expect(requestFrame).not.toHaveBeenCalled();
        expect(
          screen.queryByRole('region', { name: 'Text log' })
        ).not.toBeInTheDocument();
        wrangler.openControllerPanel(textModel('DEV.first'));
        view.rerender(renderStack());
        await waitFor(() => expect(mockLayout[firstId]).toBe(100));
        expect(stackHeight()).toBe(428);
        expect(
          screen.getByRole('region', { name: 'Text log' })
        ).toBeInTheDocument();
      } finally {
        requestFrame.mockRestore();
      }
    });
  });

  it('gates monitoring on visibility and zero height and reveals a reused panel', async () => {
    await withStack(async ({ wrangler, device, network, renderStack }) => {
      const addMonitor = jest.spyOn(device, 'addMonitor');
      const removeMonitor = jest.spyOn(device, 'removeMonitor');
      const firstId = wrangler.openControllerPanel(textModel('DEV.first'))!;
      const secondId = wrangler.openControllerPanel(textModel('DEV.second'))!;
      const view = render(renderStack());
      await waitFor(() => expect(mockLayout[firstId]).toBe(50));
      expect(addMonitor).toHaveBeenCalledTimes(2);
      act(() => mockResize({ [firstId]: 0, [secondId]: 100 }));
      expect(screen.getAllByRole('region', { name: 'Text log' })).toHaveLength(
        1
      );
      expect(removeMonitor).toHaveBeenCalledTimes(1);
      expect(network.onStopMonitoringDevice).not.toHaveBeenCalled();
      wrangler.openControllerPanel(textModel('DEV.first'));
      view.rerender(renderStack());
      await waitFor(() => expect(mockLayout[firstId]).toBeCloseTo(33.3333));
      expect(panelHeight(firstId)).toBeCloseTo(428);
      expect(panelHeight(secondId)).toBeCloseTo(856);
      expect(screen.getAllByRole('region', { name: 'Text log' })).toHaveLength(
        2
      );
      expect(document.activeElement).toBe(
        screen.getByRole('region', { name: 'DEV.first' })
      );
      view.rerender(renderStack(false));
      expect(
        screen.queryByRole('region', { name: 'Text log' })
      ).not.toBeInTheDocument();
      expect(removeMonitor).toHaveBeenCalledTimes(3);
      expect(network.onStopMonitoringDevice).toHaveBeenCalledTimes(1);
      view.rerender(renderStack());
      expect(addMonitor).toHaveBeenCalledTimes(5);
      fireEvent.click(
        within(screen.getByRole('region', { name: 'DEV.first' })).getByRole(
          'button',
          { name: 'Close DEV.first' }
        )
      );
      view.rerender(renderStack());
      expect(
        screen.getByRole('region', { name: 'Text log' })
      ).toHaveTextContent('second entry');
      expect(removeMonitor).toHaveBeenCalledTimes(4);
      expect(network.onStopMonitoringDevice).toHaveBeenCalledTimes(1);
      view.unmount();
      expect(network.onStopMonitoringDevice).toHaveBeenCalledTimes(2);
    });
  });
});
