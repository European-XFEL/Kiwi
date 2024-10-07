// #region Data structures for project entities
export interface DbItemInfo {
  domain: string;
  uuid: string;
}

export interface ProjectSceneInfo extends DbItemInfo {
  name: string;
  projectName: string;
  description?: string;
  svg: string;
  /// Last modification date in 'YYYY-MM-DD HH:MM:SS' format
  dateModified: string;
}

export interface ProjectItemInfo extends DbItemInfo {
  name: string;
  isTrashed: boolean;
  /// Last modification date in 'YYYY-MM-DD HH:MM:SS' format
  dateModified: string;
}

export interface ProjectContentsInfo extends ProjectItemInfo {
  scenes: DbItemInfo[]; // Scenes in a project
  subprojects: DbItemInfo[]; // Subprojects in a project
  // Note: macros and devices are not stored for now because they are not used
  //       in Kiwi.
}

// #endregion

// #region Custom type guards for project entities data structures

// TODO: Add type guard for ProjectInfo (with the list of scenes and subprojects)

export const isProjectItemInfo = (
  item: DbItemInfo
): item is ProjectItemInfo => {
  return typeof item === "object" && item !== null && "isTrashed" in item;
};

export const isProjectContentsInfo = (
  item: DbItemInfo
): item is ProjectContentsInfo => {
  return (
    typeof item === "object" &&
    item !== null &&
    "scenes" in item &&
    "subprojects" in item
  );
};

export const isSceneInfo = (item: DbItemInfo): item is ProjectSceneInfo => {
  return typeof item === "object" && item !== null && "svg" in item;
};

// #endregion

// #region Results for List operations for project entities

export interface ListDomainsResult {
  domains: string[];
  error_msg?: string; // undefined if no error
}

export interface ListProjectsResult {
  projects: ProjectItemInfo[];
  error_msg?: string; // undefined if no error
}

export interface LoadProjectItemsResult {
  projectItems: DbItemInfo[];
  error_msg?: string; // undefined if no error
}

export interface LoadProjectSceneResult {
  scene?: ProjectSceneInfo; // undefined if error
  error_msg?: string; // undefined if no error
}

export interface ListProjectScenesResult {
  scenes: ProjectSceneInfo[];
  error_msg?: string; // undefined if no error
}
// #endregion
