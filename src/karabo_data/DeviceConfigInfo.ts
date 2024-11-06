export interface DeviceConfigInfo {
  deviceId: string;
  properties: PropertyInfo[];
}

export interface PropertyInfo {
  propertyId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  propertyValue: any;
}
