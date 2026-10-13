import type { ApplicationMode } from '@/store/api';
import type { CinemaLaunch, CinemaLaunchResult } from './types';
import {
  CINEMA_PATH,
  CINEMA_LAUNCH_KEY,
  CINEMA_BOOKMARK_INSTRUCTION,
} from './const';

function validateLaunch(launch: CinemaLaunch): CinemaLaunch {
  if (
    !Array.isArray(launch.sceneUuids) ||
    launch.sceneUuids.length === 0 ||
    launch.sceneUuids.some(
      (uuid) => typeof uuid !== 'string' || !uuid || /\s/.test(uuid)
    )
  ) {
    throw new Error('Cinema requires at least one non-empty scene_uuid.');
  }
  if ((launch.host === undefined) !== (launch.port === undefined)) {
    throw new Error('Cinema host and port must be supplied together.');
  }
  if (
    launch.host !== undefined &&
    (typeof launch.host !== 'string' ||
      !launch.host ||
      /[\s/?#@&=%]/.test(launch.host) ||
      !Number.isInteger(launch.port) ||
      launch.port! < 1 ||
      launch.port! > 65535)
  ) {
    throw new Error('Invalid cinema GUI-server host or port.');
  }
  if (launch.host !== undefined) {
    try {
      const server = new URL(`ws://${launch.host}:${launch.port}`);
      if (server.pathname !== '/') throw new Error('Invalid server path.');
    } catch {
      throw new Error('Invalid cinema GUI-server host or port.');
    }
  }
  return launch;
}

/** Run before constructing the router or starting a session. */
export function captureCinemaLaunch(
  location: Pick<Location, 'search'>,
  storage: Storage,
  replaceAddress: (path: string) => void
): CinemaLaunchResult {
  try {
    if (location.search) {
      // A new launch replaces the old one, including when validation fails.
      storage.removeItem(CINEMA_LAUNCH_KEY);
      const params = new URLSearchParams(location.search);
      if (
        Array.from(params.keys()).some(
          (key) => !['scene_uuid', 'host', 'port'].includes(key)
        ) ||
        params.getAll('host').length > 1 ||
        params.getAll('port').length > 1
      ) {
        throw new Error('Invalid cinema bookmark parameters.');
      }
      const port = params.get('port');
      if (port !== null && !/^\d+$/.test(port)) {
        throw new Error('Invalid cinema GUI-server port.');
      }
      const launch = validateLaunch({
        sceneUuids: params.getAll('scene_uuid'),
        ...(params.has('host') ? { host: params.get('host')! } : {}),
        ...(port !== null ? { port: Number(port) } : {}),
      });
      storage.setItem(CINEMA_LAUNCH_KEY, JSON.stringify(launch));
      return { launch };
    }
    const stored = storage.getItem(CINEMA_LAUNCH_KEY);
    if (!stored) return { launchError: CINEMA_BOOKMARK_INSTRUCTION };
    const launch = validateLaunch(JSON.parse(stored));
    return { launch };
  } catch (error) {
    return {
      launchError:
        error instanceof Error ? error.message : 'Invalid cinema bookmark.',
    };
  } finally {
    replaceAddress(CINEMA_PATH);
  }
}

export function applicationPath(mode: ApplicationMode): string {
  return mode === 'cinema' ? CINEMA_PATH : '/main';
}

export function cinemaServer(
  launch: CinemaLaunch | undefined,
  saved: { lastHost: string; lastPort: number }
) {
  const host = launch?.host ?? saved.lastHost;
  const port = launch?.port ?? saved.lastPort;
  return {
    host,
    port,
    canResume: host === saved.lastHost && port === saved.lastPort,
  };
}

export function buildCinemaUrl(
  origin: string,
  sceneUuid: string,
  host: string,
  port: number
): string {
  const url = new URL(CINEMA_PATH, origin);
  url.search = new URLSearchParams({
    scene_uuid: sceneUuid,
    host,
    port: String(port),
  }).toString();
  return url.toString();
}
