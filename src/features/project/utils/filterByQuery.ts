export function filterByQuery<T>(
  items: T[],
  query: string,
  getSearchText: (item: T) => string
): T[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) =>
    getSearchText(item).toLowerCase().includes(normalizedQuery)
  );
}
