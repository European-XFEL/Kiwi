import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { getPanelWrangler } from '@/lib/singletons/api';
import { ControllerContainer } from '@/features/scene-view/components/widgets/ControllerContainer';
import { getRenderer } from '@/features/scene-view/renderRegistry';
import '@/features/scene-view/renderers';
import type { ControllerPanelModel } from '../types';
import { CONTROLLER_PANEL_HEADER_HEIGHT } from './controllerPanelSizing';

export default function ControllerPanel({
  panel,
  isVisible,
}: {
  panel: ControllerPanelModel;
  isVisible: boolean;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return;
    }
    const updateSize = (width: number, height: number) => {
      setSize((current) => {
        if (current.width === width && current.height === height) {
          return current;
        }
        return { width, height };
      });
    };
    updateSize(content.clientWidth, content.clientHeight);
    const observer = new ResizeObserver(([entry]) => {
      updateSize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  const Renderer = getRenderer(panel.model);
  let controllerContent: ReactNode = null;
  if (isVisible && Renderer) {
    controllerContent = (
      <ControllerContainer
        width={size.width}
        height={size.height}
        objectId={panel.id}
        model={panel.model}
        Renderer={Renderer}
      />
    );
  }
  return (
    <section
      id={`${panel.id}-content`}
      role="region"
      aria-label={panel.title}
      tabIndex={-1}
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background focus-visible:outline focus-visible:outline-ring"
    >
      <header
        className="flex shrink-0 items-center gap-2 border-b bg-[#d7d7d7] px-2"
        style={{ height: CONTROLLER_PANEL_HEADER_HEIGHT }}
      >
        <span className="min-w-0 flex-1 truncate text-xs" title={panel.title}>
          {panel.title}
        </span>
        <button
          type="button"
          aria-label={`Close ${panel.title}`}
          className="rounded p-0.5 hover:bg-accent focus-visible:outline focus-visible:outline-ring"
          onClick={() => getPanelWrangler().closeControllerPanel(panel.id)}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </header>
      <div
        ref={contentRef}
        className="w-full min-h-0 min-w-0 flex-1 overflow-hidden bg-canvas"
      >
        {controllerContent}
      </div>
    </section>
  );
}
