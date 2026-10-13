export interface CinemaLaunch {
  sceneUuids: string[];
  host?: string;
  port?: number;
}

export interface CinemaLaunchResult {
  launch?: CinemaLaunch;
  launchError?: string;
}
