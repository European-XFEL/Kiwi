import {
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { GroupImperativeHandle, Layout } from 'react-resizable-panels';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/api';
import { KaraboEvent, useKaraboEvent } from '@/lib/events';
import type { ControllerPanelModel } from '../types';
import ControllerPanel from './ControllerPanel';
import {
  CONTROLLER_PANEL_SEPARATOR_HEIGHT,
  getDefaultControllerPanelHeight,
} from './controllerPanelSizing';

interface ControllerPanelStackProps {
  panels: ControllerPanelModel[];
  isVisible: boolean;
}

function totalHeight(heights: Record<string, number>): number {
  return Object.values(heights).reduce((sum, height) => sum + height, 0);
}

function toLayout(heights: Record<string, number>): Layout {
  const total = totalHeight(heights);
  return Object.fromEntries(
    Object.entries(heights).map(([id, height]) => {
      if (total > 0) {
        return [id, (height / total) * 100];
      }
      return [id, 100 / Object.keys(heights).length];
    })
  );
}

export default function ControllerPanelStack({
  panels,
  isVisible,
}: ControllerPanelStackProps) {
  const groupRef = useRef<GroupImperativeHandle | null>(null);
  const heightsRef = useRef<Record<string, number>>({});
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [pendingPanelId, setPendingPanelId] = useState<string | undefined>(
    () => panels.at(-1)?.id
  );
  useKaraboEvent(
    KaraboEvent.ControllerPanelActivated,
    ({ id }: { id: string }) => {
      setPendingPanelId(id);
    }
  );
  const synchronizing = useRef(true);
  const renderedHeights = Object.fromEntries(
    panels.map((panel) => [
      panel.id,
      heights[panel.id] ?? getDefaultControllerPanelHeight(panel),
    ])
  );

  const recordLayout = (next: Layout) => {
    // Registration and container-size updates can emit intermediate layouts.
    // Only user resizing should replace our saved pixel heights.
    if (
      synchronizing.current ||
      !isVisible ||
      panels.some((panel) => next[panel.id] === undefined)
    ) {
      return;
    }
    const total = totalHeight(heightsRef.current);
    const weight = panels.reduce((sum, panel) => sum + next[panel.id], 0);
    const nextHeights = Object.fromEntries(
      panels.map((panel) => {
        let height = 0;
        if (weight > 0) {
          height = (next[panel.id] / weight) * total;
        }
        return [panel.id, height];
      })
    );
    heightsRef.current = nextHeights;
    setHeights(nextHeights);
  };

  useLayoutEffect(() => {
    let nextHeights = Object.fromEntries(
      panels.map((panel) => [
        panel.id,
        heightsRef.current[panel.id] ?? getDefaultControllerPanelHeight(panel),
      ])
    );
    const requestedPanel = panels.find((panel) => panel.id === pendingPanelId);
    if (pendingPanelId && !requestedPanel) {
      setPendingPanelId(undefined);
    }
    if (requestedPanel && nextHeights[requestedPanel.id] === 0) {
      nextHeights = {
        ...nextHeights,
        [requestedPanel.id]: getDefaultControllerPanelHeight(requestedPanel),
      };
    }
    synchronizing.current = true;
    heightsRef.current = nextHeights;
    setHeights(nextHeights);
    if (panels.length === 0 || totalHeight(nextHeights) === 0) {
      return;
    }
    if (!isVisible) {
      return;
    }
    const nextLayout = toLayout(nextHeights);
    const currentLayout = groupRef.current?.getLayout();
    // Consuming an activation should not start another resize cycle when the
    // library already has these heights; percentages can differ by rounding.
    if (
      !requestedPanel &&
      currentLayout &&
      Object.keys(currentLayout).length === panels.length &&
      panels.every(
        (panel) =>
          Math.abs(currentLayout[panel.id] - nextLayout[panel.id]) < 0.001
      )
    ) {
      synchronizing.current = false;
      return;
    }

    // V4 finishes registering changed children after ancestor effects. Wait
    // for the current IDs before applying heights to the resized stack.
    let frame: number;
    const synchronize = () => {
      const group = groupRef.current;
      const current = group?.getLayout();
      if (!group || !current) {
        return;
      }
      if (
        Object.keys(current).length !== panels.length ||
        panels.some((panel) => current[panel.id] === undefined)
      ) {
        frame = requestAnimationFrame(synchronize);
        return;
      }
      group.setLayout(nextLayout);
      heightsRef.current = nextHeights;
      setHeights(nextHeights);
      synchronizing.current = false;
      if (requestedPanel) {
        document.getElementById(`${requestedPanel.id}-content`)?.focus();
        setPendingPanelId(undefined);
      }
    };
    frame = requestAnimationFrame(synchronize);
    return () => cancelAnimationFrame(frame);
  }, [pendingPanelId, isVisible, panels]);

  if (panels.length === 0) {
    return null;
  }
  const stackHeight =
    totalHeight(renderedHeights) +
    (panels.length - 1) * CONTROLLER_PANEL_SEPARATOR_HEIGHT;
  return (
    <div
      role="region"
      aria-label="Controller panels"
      className="h-full min-h-0 min-w-0 overflow-x-hidden overflow-y-auto bg-muted"
    >
      <div style={{ height: stackHeight }}>
        <ResizablePanelGroup
          orientation="vertical"
          groupRef={groupRef}
          onLayoutChange={recordLayout}
        >
          {panels.map((panel, index) => {
            let separator: ReactNode = null;
            if (index < panels.length - 1) {
              separator = (
                <ResizableHandle
                  withHandle
                  style={{ height: CONTROLLER_PANEL_SEPARATOR_HEIGHT }}
                />
              );
            }
            return (
              <Fragment key={panel.id}>
                <ResizablePanel
                  id={panel.id}
                  defaultSize={`${getDefaultControllerPanelHeight(panel)}px`}
                  minSize="0%"
                >
                  <ControllerPanel
                    panel={panel}
                    isVisible={isVisible && renderedHeights[panel.id] > 0}
                  />
                </ResizablePanel>
                {separator}
              </Fragment>
            );
          })}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
