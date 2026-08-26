export interface SceneURLParams {
  host: string;
  port: number;
  domain: string;
  projectUuid: string;
  sceneUuid: string;
}

export interface DeviceSceneURLParams {
  host: string;
  port: number;
  deviceId: string;
  sceneName: string;
}

// TODO: Add support for parameters for device-provided scenes
export function sceneParamsFromURL(
  queryParams: string
): SceneURLParams | undefined {
  const search = new URLSearchParams(queryParams);
  const host = search.get('host');
  const portStr = search.get('port');
  const domain = search.get('domain');
  const projectUuid = search.get('projectUuid');
  const sceneUuid = search.get('sceneUuid') ?? search.get('uuid');

  if (!host || !portStr || !domain || !projectUuid || !sceneUuid)
    return undefined;

  const port = Number.parseInt(portStr, 10);
  if (Number.isNaN(port)) return undefined;

  return { host, port, domain, projectUuid, sceneUuid };
}

export function scenePathFromParams(params: SceneURLParams): string {
  const search = new URLSearchParams({
    host: params.host,
    port: String(params.port),
    domain: params.domain,
    projectUuid: params.projectUuid,
    sceneUuid: params.sceneUuid,
  });

  return `/scene?${search.toString()}`;
}
