import FacilityInfoClient from "./http_clients/FacilityInfoClient";

export interface AppSettings {
  wsProxyURL: string;
  authServerURL: string;
}

export const initAppSettings = async () => {
  const facilityInfo = new FacilityInfoClient();

  const wsProxyURL = await facilityInfo.getWsProxyURL();
  const authServerURL = await facilityInfo.getAuthServerURL();

  return {
    wsProxyURL: wsProxyURL,
    authServerURL: authServerURL,
  };
};
