import { useDeferredValue, useState } from 'react';

export type DeferredSearch = {
  query: string;
  deferredQuery: string;
  isPending: boolean;
  setQuery: (q: string) => void;
  clear: () => void;
};

export function useDeferredSearch(): DeferredSearch {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  return {
    query,
    deferredQuery,
    isPending: query !== deferredQuery,
    setQuery,
    clear: () => setQuery(''),
  };
}
