import { Hash } from 'karabo-ts';
import { getNetwork } from '@/singletons/api';
import {
  ListDomainsResult,
  ListProjectsResult,
  ListProjectScenesResult,
  LoadProjectItemsResult,
  ProjectSceneInfo,
  isSceneInfo,
  DbItemInfo,
  isProjectContentsInfo,
  LoadProjectSceneResult,
} from '../karabo_data/ProjectDbInfo';
import {
  buildListDomainsHash,
  buildListProjectsHash,
  buildLoadItemsHash,
} from '../karabo_hash/builders/project_db';
import {
  listDomainsResultFromHash,
  listProjectsResultFromHash,
  loadProjectItemsResultFromHash,
} from '../karabo_hash/decoders/project_db';

export class ProjectDBConnector {
  public constructor() {
    // Registers the handlers for the hash types related to the ProjectDB
    getNetwork().registerHashHandler(
      'projectListDomains',
      this.#_onListDomainsHash
    );
    getNetwork().registerHashHandler(
      'projectListItems',
      this.#_onListProjectsHash
    );
  }

  // #region List Projects
  listProjects(
    domain: string,
    onProjects: (projectsInfo: ListProjectsResult) => void
  ): void {
    // Stores the callback to be called when the GUI Server sends back the list of projects.
    if (this.#_onListProjectsCallback) {
      // There's already a pending getProjects operation. Refuse the new request.
      const projectsInfo = {
        projects: [],
        error_msg:
          "There's already a pending listProjects operation. Cannot start a new one!",
      };
      onProjects(projectsInfo);
      return;
    }
    this.#_onListProjectsCallback = onProjects;
    getNetwork().sendHash(buildListProjectsHash(domain));
  }

  // The callback to be registered by an external caller for the listProjects operation.
  #_onListProjectsCallback?: (projectsInfo: ListProjectsResult) => void;

  // The internal callback registered to handle projectListItems messages
  // received from the GUI Server. Responsible for dispatching the call to the
  // callback registered by the external caller of listProjects.
  #_onListProjectsHash = (hash: Hash): void => {
    let projectsInfo: ListProjectsResult;
    try {
      projectsInfo = listProjectsResultFromHash(hash);
    } catch (e) {
      if (e instanceof Error) {
        projectsInfo = {
          projects: [],
          error_msg: (e as Error).message,
        };
      } else {
        projectsInfo = {
          projects: [],
          error_msg: 'Error decoding the list of projects',
        };
        console.error(`Error decoding the list of projects: ${e}`);
      }
    }
    projectsInfo.projects.sort((a, b) => a.name.localeCompare(b.name));
    this.#_onListProjectsCallback?.(projectsInfo);
    this.#_onListProjectsCallback = undefined;
  };

  // #endregion

  // #region List Scenes
  listScenes(
    domain: string,
    projectName: string,
    uuidProject: string,
    onScenes: (scenesInfo: ListProjectScenesResult) => void
  ): void {
    // Stores the callback to be called when the list of scenes is ready.
    if (this.#_onListScenesCallback || this.#_onGetSceneCallback) {
      // There's already a pending getScenes operation. Refuse the new request.
      const scenesInfo = {
        scenes: [],
        error_msg:
          "There's already a pending listScenes operation. Cannot start a new one!",
      };
      onScenes(scenesInfo);
      return;
    }
    // Registers the handler for handling projectLoadItems messages from the GUI Server
    // for the duration of the listScenes operation.
    getNetwork().registerHashHandler(
      'projectLoadItems',
      this.#_onLoadItemsHash
    );
    this.#_onListScenesCallback = onScenes;
    // Starts the sequence of operations to get the list of scenes of a project.
    // Differently from the listDomains and listProjects operations, listScenes
    // requires multiple round-trips of "loadItems" operations.
    this.#_collectedScenes = [];
    this.#_projectName = projectName;
    this.#_loadItemsErr = undefined;
    this.#_pendingLoadItems = 1;
    const projectItem = {
      domain: domain,
      uuid: uuidProject,
      item_type: 'project',
    };
    getNetwork().sendHash(buildLoadItemsHash([projectItem]));
  }

  // The callback to be registered by an external caller for the listScenes operation.
  #_onListScenesCallback?: (scenesInfo: ListProjectScenesResult) => void;

  // Internal data to keep track of the sequence of projectLoadItems operations
  // involved in a listScenes operation.
  #_pendingLoadItems: number = 0;
  #_projectName: string = '';
  #_collectedScenes?: ProjectSceneInfo[];
  #_loadItemsErr?: string;

  // The internal callback for all the intermediary projectLoadItems operations invoked
  // by the ProjectDBConnector - responsible for keeping track of when the sequence of
  // projectLoadItems operations has been completed and dispatch the call to
  // #_onListScenesCallback
  #_onLoadItemsHash = (hash: Hash): void => {
    this.#_pendingLoadItems -= 1;
    if (this.#_loadItemsErr !== undefined) {
      // An error has already happened during one of the loadProjectItems
      // operation; don't go ahead.
      return;
    }
    let itemsInfo: LoadProjectItemsResult | undefined = undefined;
    try {
      itemsInfo = loadProjectItemsResultFromHash(this.#_projectName, hash);
      if (itemsInfo.error_msg !== undefined) {
        // An error occurred; store the message and interrupt the operation.
        this.#_loadItemsErr = itemsInfo.error_msg;
      }
    } catch (e) {
      if (e instanceof Error) {
        this.#_loadItemsErr = (e as Error).message;
      } else {
        this.#_loadItemsErr = 'Error loading project items';
      }
      console.error(`Error loading project items: ${e}`);
    }
    if (itemsInfo !== undefined) {
      // Iterates through the retrieved project items, collecting the scenes and
      // dispatching new loadProjectItems requests for subprojects.
      const itemsToQuery: DbItemInfo[] = [];
      for (const item of itemsInfo.projectItems) {
        if (isProjectContentsInfo(item)) {
          // For a project, load its contained scenes and subprojects
          for (const scene of item.scenes) {
            itemsToQuery.push({
              domain: scene.domain,
              uuid: scene.uuid,
              item_type: 'scene',
            });
          }
          for (const subproject of item.subprojects) {
            itemsToQuery.push({
              domain: subproject.domain,
              uuid: subproject.uuid,
              item_type: 'project',
            });
          }
          if (itemsToQuery.length > 0) {
            this.#_pendingLoadItems += 1;
            getNetwork().sendHash(buildLoadItemsHash(itemsToQuery));
          }
        } else if (isSceneInfo(item)) {
          const sceneIdx = this.#_collectedScenes?.findIndex(
            (scene) => scene.uuid === item.uuid
          );
          if (sceneIdx === -1) {
            this.#_collectedScenes?.push(item);
          }
        }
      }
    }
    // If there's no more pending LoadProjectItems operation we can call the
    // external listScenes callback with the listScenes result.
    if (this.#_pendingLoadItems === 0 || this.#_loadItemsErr !== undefined) {
      let listScenesResult: ListProjectScenesResult;
      if (this.#_loadItemsErr !== undefined) {
        listScenesResult = {
          scenes: [],
          error_msg: this.#_loadItemsErr,
        };
      } else {
        listScenesResult = {
          scenes: this.#_collectedScenes!.sort((a, b) =>
            a.name.localeCompare(b.name)
          ),
        };
      }
      this.#_onListScenesCallback?.(listScenesResult);
      this.#_onListScenesCallback = undefined;
      // Avoid retaining the set of collected scenes for more time than needed.
      // If not here, they would be retained until another listScenes operation
      // is launched.
      this.#_collectedScenes = undefined;
      // Unregister the hash handler for the duration of the listScenes operation.
      getNetwork().unregisterHashHandler('projectLoadItems');
    }
  };

  // #endregion

  // #region GetScene
  getScene(
    domain: string,
    projectName: string,
    uuid: string,
    onScene: (loadSceneResult: LoadProjectSceneResult) => void
  ): void {
    // Stores the callback to be called when the GUI Server sends back the scene.
    if (this.#_onGetSceneCallback || this.#_onListScenesCallback) {
      // There's already a pending getScene or listScene operation. Refuse the new request.
      // Those operations can't be concurrently executed because they handle "projectLoadItems"
      // hashes sent by the GUI Server differently.
      const loadSceneResult: LoadProjectSceneResult = {
        scene: undefined,
        error_msg:
          "There's already a pending getScene operation. Cannot start a new one!",
      };
      onScene(loadSceneResult);
      return;
    }
    // Registers the handler for handling projectLoadItems messages from the GUI Server
    // for the duration of the getScene operation.
    getNetwork().registerHashHandler(
      'projectLoadItems',
      this.#_onLoadSceneHash
    );
    this.#_onGetSceneCallback = onScene;
    this.#_projectName = projectName;
    getNetwork().sendHash(
      buildLoadItemsHash([{ domain: domain, uuid: uuid, item_type: 'scene' }])
    );
  }

  // The callback to be registered by an external caller for the getScene operation.
  #_onGetSceneCallback?: (scenesInfo: LoadProjectSceneResult) => void;

  #_onLoadSceneHash = (hash: Hash): void => {
    let itemsInfo: LoadProjectItemsResult | undefined = undefined;
    let loadSceneErr: string | undefined = undefined;
    try {
      itemsInfo = loadProjectItemsResultFromHash(this.#_projectName, hash);
      if (itemsInfo.error_msg !== undefined) {
        // An error occurred
        loadSceneErr = itemsInfo.error_msg;
      }
    } catch (e) {
      if (e instanceof Error) {
        loadSceneErr = (e as Error).message;
      } else {
        loadSceneErr = 'Error getting project scene';
      }
      console.error(`Error loading project scene: ${loadSceneErr}`);
    }
    if (itemsInfo === undefined) {
      loadSceneErr = 'Error loading project scene - no scene returned';
    } else if (itemsInfo!.projectItems.length !== 1) {
      // An error occurred - only one item should have been returned.
      loadSceneErr = 'Error loading project scene - multiple items returned';
    } else if (!isSceneInfo(itemsInfo!.projectItems[0])) {
      // An error occurred - the returned item is not a scene.
      loadSceneErr = 'Error loading project scene - no scene returned';
    }
    if (loadSceneErr !== undefined) {
      // An error occurred
      this.#_onGetSceneCallback?.({
        scene: undefined,
        error_msg: loadSceneErr,
      });
    } else {
      const sceneInfo = itemsInfo!.projectItems[0] as ProjectSceneInfo;
      this.#_onGetSceneCallback?.({
        scene: {
          domain: sceneInfo.domain,
          projectName: this.#_projectName,
          uuid: sceneInfo.uuid,
          name: sceneInfo.name,
          description: sceneInfo.description,
          svg: sceneInfo.svg,
          dateModified: sceneInfo.dateModified,
        },
        error_msg: undefined,
      });
    }
    this.#_onGetSceneCallback = undefined;
    // Unregister the hash handler for the duration of the getScene operation.
    getNetwork().unregisterHashHandler('projectLoadItems');
  };

  // #endregion

  // #region List Domains
  listDomains(onDomains: (domainsInfo: ListDomainsResult) => void): void {
    // Stores the callback to be called when the GUI Server sends back the list of domains.
    if (this.#_onListDomainsCallback) {
      // There's already a pending getDomains operation. Refuse the new request.
      const domainsInfo = {
        domains: [],
        error_msg:
          "There's already a pending listDomains operation. Cannot start a new one!",
      };
      onDomains(domainsInfo);
      return;
    }
    this.#_onListDomainsCallback = onDomains;
    getNetwork().sendHash(buildListDomainsHash());
  }
  #_onListDomainsCallback?: (domainsInfo: ListDomainsResult) => void;

  // The internal callback for handling a projectListDomains result received
  // from the GUI Server. Responsible for dispatching the call to
  // #_onListDomainsCallback registered by the external caller that invoked
  // listDomains.
  #_onListDomainsHash = (hash: Hash): void => {
    let domainsInfo: ListDomainsResult;
    try {
      domainsInfo = listDomainsResultFromHash(hash);
    } catch (e) {
      if (e instanceof Error) {
        domainsInfo = {
          domains: [],
          error_msg: (e as Error).message,
        };
      } else {
        domainsInfo = {
          domains: [],
          error_msg: 'Error decoding the list of domains',
        };
        console.error(`Error decoding the list of domains: ${e}`);
      }
    }
    domainsInfo.domains.sort((a, b) => a.localeCompare(b));
    this.#_onListDomainsCallback?.(domainsInfo!);
    this.#_onListDomainsCallback = undefined;
  };
  // #endregion
}
