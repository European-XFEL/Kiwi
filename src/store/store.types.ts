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
  domain: string;
  projectUuid: string;
  projectName: string;
  uuid: string;
  name: string;
}
