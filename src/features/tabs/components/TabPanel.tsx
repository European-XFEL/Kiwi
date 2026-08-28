import { memo } from 'react';
import { cn } from '@/components/api';
import type { TabPanelViewProps } from '../types';

const TabPanel = memo(function TabPanel({
  id,
  labelledBy,
  isActive,
  children,
  className,
}: TabPanelViewProps) {
  return (
    <section
      aria-labelledby={labelledBy}
      hidden={!isActive}
      id={id}
      role="tabpanel"
      tabIndex={0}
      className={cn(
        'h-full min-h-0 outline-none',
        className ?? 'overflow-auto bg-background p-5'
      )}
    >
      {children}
    </section>
  );
});

TabPanel.displayName = 'TabPanel';

export default TabPanel;
