export interface TopicRecentSceneInfo extends RecentSceneInfo {
  topic: string;
}

export interface RecentSceneInfo {
  domain: string;
  projectUuid: string;
  uuid: string;
  name: string;
  projectName: string;
}

export interface SceneSize {
  height: number;
  width: number;
}

export interface LoadedSceneRef {
  height: number;
  width: number;
  domain?: string; // defined for project scenes
  projectUuid?: string; // defined for project scenes
  projectName?: string; // defined for project scenes
  deviceId?: string; // defined for device-provided scenes
  uuid: string;
  name: string;
}
