import { Hash } from "./karabo_hash/types";
import { GuiServerConnector } from "./GuiServerConnector";
import {
  ListDomainsResult,
  ListProjectsResult,
  ListProjectScenesResult,
  LoadProjectItemsResult,
  ProjectSceneInfo,
  isSceneInfo,
  DbItemInfo,
  isProjectContentsInfo,
} from "./karabo_data/ProjectDbInfo";
import {
  buildBeginUserSessionHash,
  buildListDomainsHash,
  buildListProjectsHash,
  buildLoadItemsHash,
} from "./karabo_hash/builders/project_db";
import {
  beginUserSessionResultFromHash,
  listDomainsResultFromHash,
  listProjectsResultFromHash,
  loadProjectItemsResultFromHash,
} from "./karabo_hash/decoders/project_db";

export class ProjectDBConnector {
  // #region Singleton
  private constructor() {
    // Registers the handlers for the hash types related to the ProjectDB
    GuiServerConnector.inst.registerHashHandler(
      "projectBeginUserSession",
      this.#_onProjectBeginUserSession
    );
    GuiServerConnector.inst.registerHashHandler(
      "projectListDomains",
      this.#_onListDomainsHash
    );
    GuiServerConnector.inst.registerHashHandler(
      "projectListItems",
      this.#_onListProjectsHash
    );
    GuiServerConnector.inst.registerHashHandler(
      "projectLoadItems",
      this.#_onLoadItemsHash
    );
  }

  static #_inst?: ProjectDBConnector;
  static get inst(): ProjectDBConnector {
    if (!ProjectDBConnector.#_inst) {
      ProjectDBConnector.#_inst = new ProjectDBConnector();
    }
    return ProjectDBConnector.#_inst;
  }
  // #endregion

  // #region List Projects
  listProjects(
    domain: string,
    onProjects: (projectsInfo: ListProjectsResult) => void
  ): void {
    this.#_ensureDBInitialized();
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
    GuiServerConnector.inst.sendHash(buildListProjectsHash(domain));
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
          error_msg: "Error decoding the list of projects",
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
    uuidProject: string,
    onScenes: (scenesInfo: ListProjectScenesResult) => void
  ): void {
    this.#_ensureDBInitialized();
    // Stores the callback to be called when the list of scenes is ready.
    if (this.#_onListScenesCallback) {
      // There's already a pending getScenes operation. Refuse the new request.
      const scenesInfo = {
        scenes: [],
        error_msg:
          "There's already a pending listScenes operation. Cannot start a new one!",
      };
      onScenes(scenesInfo);
      return;
    }
    this.#_onListScenesCallback = onScenes;
    // Starts the sequence of operations to get the list of scenes of a project.
    // Differently from the listDomains and listProjects operations, listScenes
    // requires multiple round-trips of "loadItems" operations.
    this.#_collectedScenes = [];
    this.#_loadItemsErr = undefined;
    this.#_pendingLoadItems = 1;
    const projectItem = {
      domain: domain,
      uuid: uuidProject,
    };
    GuiServerConnector.inst.sendHash(buildLoadItemsHash([projectItem]));
  }

  // The callback to be registered by an external caller for the listScenes operation.
  #_onListScenesCallback?: (scenesInfo: ListProjectScenesResult) => void;

  // Internal data to keep track of the sequence of projectLoadItems operations
  // involved in a listScenes operation.
  #_pendingLoadItems: number = 0;
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
      itemsInfo = loadProjectItemsResultFromHash(hash);
      if (itemsInfo.error_msg !== undefined) {
        // An error occurred; store the message and interrupt the operation.
        this.#_loadItemsErr = itemsInfo.error_msg;
        // return;
      }
    } catch (e) {
      if (e instanceof Error) {
        this.#_loadItemsErr = (e as Error).message;
      } else {
        this.#_loadItemsErr = "Error loading project items";
      }
      console.error(`Error loading project items: ${e}`);
      // return;
    }
    if (itemsInfo !== undefined) {
      // Iterates through the retrieved project items, collecting the scenes and
      // dispatching new loadProjectItems requests for subprojects.
      const itemsToQuery: DbItemInfo[] = [];
      for (const item of itemsInfo.projectItems) {
        if (isProjectContentsInfo(item)) {
          // For a project, load its contained scenes and subprojects
          for (const scene of item.scenes) {
            itemsToQuery.push({ domain: scene.domain, uuid: scene.uuid });
          }
          for (const subproject of item.subprojects) {
            itemsToQuery.push({
              domain: subproject.domain,
              uuid: subproject.uuid,
            });
          }
          if (itemsToQuery.length > 0) {
            this.#_pendingLoadItems += 1;
            GuiServerConnector.inst.sendHash(buildLoadItemsHash(itemsToQuery));
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
    }
  };

  // #endregion

  // #region List Domains
  listDomains(onDomains: (domainsInfo: ListDomainsResult) => void): void {
    this.#_ensureDBInitialized();
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
    GuiServerConnector.inst.sendHash(buildListDomainsHash());
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
          error_msg: "Error decoding the list of domains",
        };
        console.error(`Error decoding the list of domains: ${e}`);
      }
    }
    domainsInfo.domains.sort((a, b) => a.localeCompare(b));
    this.#_onListDomainsCallback?.(domainsInfo!);
    this.#_onListDomainsCallback = undefined;
  };
  // #endregion

  // #region ProjectDB Initialization
  #_ensureDBInitialized(): void {
    if (!GuiServerConnector.inst.isProjectDBInitialized) {
      GuiServerConnector.inst.sendHash(buildBeginUserSessionHash());
    }
  }

  // Handler for projectBeginUserSession responses received from the GUI Server
  #_onProjectBeginUserSession = (hash: Hash): void => {
    let dbInitialized = false;
    try {
      dbInitialized = beginUserSessionResultFromHash(hash);
    } catch (e) {
      console.error(`Error decoding the beginUserSession result: ${e}`);
    }
    GuiServerConnector.inst.projectDBInitialized = dbInitialized;
    // Tells an external party interested in ProjectDB initialization errors about the error.
    if (!dbInitialized) {
      this.#_onDBInitializationError?.();
    }
  };

  // Handler for ProjectDB initialization errors - to be set by an external party
  #_onDBInitializationError?: () => void;
  set onDBInitializationError(handler: () => void) {
    this.#_onDBInitializationError = handler;
  }
  // #endregion
}
