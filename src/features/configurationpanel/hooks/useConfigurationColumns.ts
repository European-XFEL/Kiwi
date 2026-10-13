import {
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { ConfigurationNode } from '../ConfigurationTreeModel';
import {
  ColumnWidthContext,
  ModelContext,
} from '../components/ConfigurationTreeContext';
import {
  MIN_COLUMN_WIDTH,
  MAX_VALUE_WIDTH,
  SLOT_DECORATION_WIDTH,
  PROPERTY_DECORATION_WIDTH,
} from '../const';

export function useContentWidth(id: string | symbol, padding: number) {
  const content = useRef<HTMLDivElement>(null);
  const reportWidth = useContext(ColumnWidthContext)!;
  const schemaRevision = useContext(ModelContext)!.schemaRevision;
  useLayoutEffect(() => {
    const element = content.current!;
    const measure = () => {
      const slotLabel = element.querySelector('[data-slot-label]');
      const propertyLabel = element.querySelector('[data-property-label]');
      let width = element.getBoundingClientRect().width;
      const label = slotLabel ?? propertyLabel;
      if (label) {
        const labelWidth =
          label.scrollWidth || label.getBoundingClientRect().width;
        width = 0;
        if (labelWidth > 0) {
          width =
            labelWidth +
            (slotLabel ? SLOT_DECORATION_WIDTH : PROPERTY_DECORATION_WIDTH);
        }
      }
      if (width > 0) {
        reportWidth(id, Math.ceil(width) + padding);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
      reportWidth(id);
    };
  }, [id, padding, reportWidth, schemaRevision]);
  return content;
}

export function useConfigurationColumns({
  data,
  schemaRevision,
}: {
  data: ConfigurationNode[];
  schemaRevision: number;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const widths = useRef(new Map<string | symbol, number>());
  const [propertyWidth, setPropertyWidth] = useState(0);
  const [requestedValueWidth, setValueWidth] = useState<number>();
  const autoSizing = useRef(true);
  const propertyMaximum = Math.max(
    MIN_COLUMN_WIDTH,
    size.width - 2 * MIN_COLUMN_WIDTH
  );
  const visiblePropertyWidth = Math.min(propertyWidth, propertyMaximum);
  const valueMaximum = Math.min(
    MAX_VALUE_WIDTH,
    Math.max(
      MIN_COLUMN_WIDTH,
      size.width - visiblePropertyWidth - MIN_COLUMN_WIDTH
    )
  );
  const defaultValueWidth = Math.floor(
    (size.width - visiblePropertyWidth) * 0.65
  );
  const valueWidth = Math.min(
    valueMaximum,
    Math.max(MIN_COLUMN_WIDTH, requestedValueWidth ?? defaultValueWidth)
  );
  const reportWidth = useCallback((id: string | symbol, width?: number) => {
    if (width === undefined) {
      widths.current.delete(id);
    } else {
      widths.current.set(id, width);
    }
    if (autoSizing.current) {
      setPropertyWidth(Math.max(0, ...widths.current.values()));
    }
  }, []);
  useLayoutEffect(() => {
    autoSizing.current = true;
    setPropertyWidth(Math.max(0, ...widths.current.values()));
  }, [schemaRevision]);
  useLayoutEffect(() => {
    const element = viewport.current!;
    const measure = (width: number, height: number) => {
      setSize((size) =>
        size.width === width && size.height === height
          ? size
          : { width, height }
      );
    };
    measure(element.clientWidth, element.clientHeight);
    const observer = new ResizeObserver(([entry]) =>
      measure(entry.contentRect.width, entry.contentRect.height)
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (
      autoSizing.current &&
      size.width > 0 &&
      size.height > 0 &&
      viewport.current!.clientWidth > 0
    ) {
      setPropertyWidth(Math.max(0, ...widths.current.values()));
      autoSizing.current = false;
    }
  }, [data, size.width, size.height]);

  return {
    viewport,
    size,
    reportWidth,
    widths: [visiblePropertyWidth, valueWidth] as [number, number],
    maxima: [propertyMaximum, valueMaximum] as [number, number],
    onResize: (index: 0 | 1, width: number) => {
      if (index === 0) {
        autoSizing.current = false;
        setPropertyWidth(
          Math.max(MIN_COLUMN_WIDTH, Math.min(propertyMaximum, width))
        );
      } else {
        setValueWidth(
          Math.max(MIN_COLUMN_WIDTH, Math.min(valueMaximum, width))
        );
      }
    },
  };
}
