export interface UserRecentSceneModel extends RecentSceneModel {
  userId: string;
}

export interface RecentSceneModel {
  domain: string;
  uuid: string;
  name: string;
  projectName: string;
}

export interface RecentScenesByUser {
  userId: string;
  scenes: RecentSceneModel[];
}
