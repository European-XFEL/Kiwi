export interface UserRecentSceneInfo extends RecentSceneInfo {
  userId: string;
}

export interface RecentSceneInfo {
  domain: string;
  uuid: string;
  name: string;
  projectName: string;
}

export interface RecentScenesByUser {
  userId: string;
  scenes: RecentSceneInfo[];
}

export interface SceneSize {
  height: number;
  width: number;
}

export interface LoadedSceneRef {
  height: number;
  width: number;
  domain: string;
  projectName: string;
  uuid: string;
  name: string;
}
