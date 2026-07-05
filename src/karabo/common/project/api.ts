export const asLocalDateTimeString = (utcDateTimeString: string): string => {
  const dateTime = utcDateTimeString.endsWith('Z')
    ? new Date(utcDateTimeString)
    : new Date(utcDateTimeString + 'Z');

  const year = dateTime.getFullYear();
  const month = String(dateTime.getMonth() + 1).padStart(2, '0');
  const day = String(dateTime.getDate()).padStart(2, '0');
  const hour = String(dateTime.getHours()).padStart(2, '0');
  const minute = String(dateTime.getMinutes()).padStart(2, '0');
  const second = String(dateTime.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

export * from './bases';
export * from './io';
export * from './cache';
export * from './lazy';
export * from './utils';
export { ProjectModel, type ProjectQueryableItem } from './model';
