export interface SceneURLParams {
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
  if (sceneData) {
    return {
      domain: sceneData[3],
      projectName: sceneData[4],
      uuid: sceneData[5],
    };
  } else {
    return undefined;
  }
}
