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
  const search = new URLSearchParams(queryParams);
  const host = search.get('host');
  const portStr = search.get('port');
  const domain = search.get('domain');
  const projectName = search.get('projectName');
  const uuid = search.get('uuid');

  if (!host || !portStr || !domain || !projectName || !uuid) return undefined;

  const port = Number.parseInt(portStr, 10);
  if (Number.isNaN(port)) return undefined;

  return { host, port, domain, projectName, uuid };
}
