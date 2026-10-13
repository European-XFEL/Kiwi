import { createContext } from 'react';
import type { ConfigurationTreeModel } from '../ConfigurationTreeModel';

export const ModelContext = createContext<ConfigurationTreeModel | null>(null);
export const ColumnWidthContext = createContext<
  ((id: string | symbol, width?: number) => void) | null
>(null);
