export interface SceneURLParams {
  host: string;
  port: number;
  domain: string;
  projectName: string;
  uuid: string;
}

export function sceneParamsFromURL(
  queryParams: string
): SceneURLParams | undefined {
  const sceneData = queryParams.match(
    /^.*\?host=([^&]+)&port=([^&]+)&domain=([^&]+)&projectName=([^&]+)&uuid=([^&]+).*$/
  );
  let params: SceneURLParams | undefined = undefined;
  if (sceneData) {
    const portParam = Number.parseInt(sceneData[2]);
    if (!Number.isNaN(portParam)) {
      params = {
        host: sceneData[1],
        port: portParam,
        domain: sceneData[3],
        projectName: sceneData[4],
        uuid: sceneData[5],
      };
    }
  }
  return params;
}
