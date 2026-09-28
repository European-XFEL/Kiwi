declare const __APP_VERSION__: string | undefined;

export const appVersion =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '';
