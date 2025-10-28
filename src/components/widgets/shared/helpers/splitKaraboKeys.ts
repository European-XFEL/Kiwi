export function splitKaraboKeys(karaboKeys: string) {
  const i = karaboKeys.indexOf(".");
  return {
    deviceId: karaboKeys.slice(0, i),
    propertyId: karaboKeys.slice(i + 1),
  };
}
