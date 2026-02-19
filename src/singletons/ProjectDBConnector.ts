import { readScene } from '@/karabo-common/readers/readScene';
import { Hash, HashList, HashValues } from '@/karabo-hash/hash';
import {
  DbItemInfo,
  isProjectContentsInfo,
  isSceneInfo,
  ListProjectScenesResult,
  ListProjectsResult,
  LoadProjectItemsResult,
  LoadProjectSceneResult,
  ProjectItemInfo,
  ProjectSceneInfo,
} from '@/karabo_data/ProjectDbInfo';
import { XMLParser } from 'fast-xml-parser';

import { getNetwork } from '@/singletons/api';
import { ProjectSceneCache } from '@/store/ProjectSceneCache';

import {
  KaraboEvent,
  KaraboEventMap,
  register_for_broadcasts,
  unregister_for_broadcasts,
} from '@/events';

export class ProjectDBConnector {
  private readonly eventMap: KaraboEventMap;
  // The active loadItemHandler: onLoadItemsHash during a listScenes operation,
  // onLoadSceneHash during a getScene operation or undefined while none of
  // those operations are taking place
  private _activeLoadItemsHandler?: (hash: Hash) => void;
  private _sceneCache = new ProjectSceneCache();

  public constructor() {
    this.eventMap = {
      [KaraboEvent.ListItems]: this._onEventListItems,
      [KaraboEvent.LoadProjectItems]: this._onEventLoadProjectItems,
    };

    register_for_broadcasts(this.eventMap);
  }

  dispose() {
    unregister_for_broadcasts(this.eventMap);
  }

  private _onEventLoadProjectItems = (data: Hash): void => {
    if (this._activeLoadItemsHandler) {
      this._activeLoadItemsHandler(data);
    }
  };

  // #region List Projects

  public listProjects(
    domain: string,
    onProjects: (projectsInfo: ListProjectsResult) => void
  ): void {
    this._onListProjectsCallback = onProjects;
    getNetwork().onProjectListItems(domain);
  }

  // The callback to be registered by an external caller for the listProjects operation.
  private _onListProjectsCallback?: (projectsInfo: ListProjectsResult) => void;

  // The internal callback registered to handle projectListItems messages
  // received from the GUI Server. Responsible for dispatching the call to the
  // callback registered by the external caller of listProjects.
  private _onEventListItems = (hash: Hash): void => {
    let projectsInfo: ListProjectsResult;
    try {
      projectsInfo = this._listProjectsResultFromHash(hash);
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
    this._onListProjectsCallback?.(projectsInfo);
    this._onListProjectsCallback = undefined;
  };

  // #endregion

  // #region List Scenes
  public listScenes(
    domain: string,
    projectName: string,
    uuidProject: string,
    onScenes: (scenesInfo: ListProjectScenesResult) => void
  ): void {
    // Stores the callback to be called when the list of scenes is ready.
    if (this._onListScenesCallback || this._onGetSceneCallback) {
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
    this._activeLoadItemsHandler = this._onLoadItemsHash;

    this._onListScenesCallback = onScenes;
    // Starts the sequence of operations to get the list of scenes of a project.
    // Differently from the listDomains and listProjects operations, listScenes
    // requires multiple round-trips of "loadItems" operations.
    this._collectedScenes = [];
    this._projectName = projectName;
    this._loadItemsErr = undefined;
    this._pendingLoadItems = 1;
    const projectItem = {
      domain: domain,
      uuid: uuidProject,
      item_type: 'project',
    };
    getNetwork().onProjectLoadItems(this._loadItemsHashList([projectItem]));
  }

  // The callback to be registered by an external caller for the listScenes operation.
  private _onListScenesCallback?: (scenesInfo: ListProjectScenesResult) => void;

  // Internal data to keep track of the sequence of projectLoadItems operations
  // involved in a listScenes operation.
  private _pendingLoadItems: number = 0;
  private _projectName: string = '';
  private _collectedScenes?: ProjectSceneInfo[];
  private _loadItemsErr?: string;

  // The internal callback for all the intermediary projectLoadItems operations invoked
  // by the ProjectDBConnector - responsible for keeping track of when the sequence of
  // projectLoadItems operations has been completed and dispatch the call to
  // _onListScenesCallback
  _onLoadItemsHash = (data: Hash): void => {
    const hash = data as unknown as Hash;
    this._pendingLoadItems -= 1;
    if (this._loadItemsErr !== undefined) {
      // An error has already happened during one of the loadProjectItems
      // operation; don't go ahead.
      return;
    }
    let itemsInfo: LoadProjectItemsResult | undefined = undefined;
    try {
      itemsInfo = this._loadProjectItemsResultFromHash(this._projectName, hash);
      if (itemsInfo.error_msg !== undefined) {
        // An error occurred; store the message and interrupt the operation.
        this._loadItemsErr = itemsInfo.error_msg;
      }
    } catch (e) {
      if (e instanceof Error) {
        this._loadItemsErr = (e as Error).message;
      } else {
        this._loadItemsErr = 'Error loading project items';
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
            this._pendingLoadItems += 1;
            getNetwork().onProjectLoadItems(
              this._loadItemsHashList(itemsToQuery)
            );
          }
        } else if (isSceneInfo(item)) {
          const sceneIdx = this._collectedScenes?.findIndex(
            (scene) => scene.uuid === item.uuid
          );
          if (sceneIdx === -1) {
            this._collectedScenes?.push(item);
          }
        }
      }
    }
    // If there's no more pending LoadProjectItems operation we can call the
    // external listScenes callback with the listScenes result.
    if (this._pendingLoadItems === 0 || this._loadItemsErr !== undefined) {
      let listScenesResult: ListProjectScenesResult;
      if (this._loadItemsErr !== undefined) {
        listScenesResult = {
          scenes: [],
          error_msg: this._loadItemsErr,
        };
      } else {
        listScenesResult = {
          scenes: this._collectedScenes!.sort((a, b) =>
            a.name.localeCompare(b.name)
          ),
        };
      }
      this._onListScenesCallback?.(listScenesResult);
      this._onListScenesCallback = undefined;
      // Avoid retaining the set of collected scenes for more time than needed.
      // If not here, they would be retained until another listScenes operation
      // is launched.
      this._collectedScenes = undefined;
      this._activeLoadItemsHandler = undefined;
    }
  };

  // #endregion

  // #region GetScene
  public getScene(
    domain: string,
    projectName: string,
    uuid: string,
    onScene: (loadSceneResult: LoadProjectSceneResult) => void
  ): void {
    const sceneInfo = this._sceneCache.getSceneInfo(domain, uuid);
    if (sceneInfo) {
      // Scene was found in cache - call the onScene handler and leave
      const loadSceneResult = {
        scene: sceneInfo,
        error_msg: undefined,
      };
      onScene(loadSceneResult);
      return;
    }
    // Stores the callback to be called when the GUI Server sends back the scene.
    if (this._onGetSceneCallback || this._onListScenesCallback) {
      // There's already a pending getScene or listScene operation. Postpone the request.
      // Those operations can't be concurrently executed because they handle "projectLoadItems"
      // hashes sent by the GUI Server differently.
      setTimeout(() => this.getScene(domain, projectName, uuid, onScene), 100);
      return;
    }
    // Registers the handler for handling projectLoadItems messages from the GUI Server
    // for the duration of the getScene operation.
    this._activeLoadItemsHandler = this._onLoadSceneHash;

    this._onGetSceneCallback = onScene;
    this._projectName = projectName;
    getNetwork().onProjectLoadItems(
      this._loadItemsHashList([
        { domain: domain, uuid: uuid, item_type: 'scene' },
      ])
    );
  }

  // The callback to be registered by an external caller of the getScene operation.
  _onGetSceneCallback?: (scenesInfo: LoadProjectSceneResult) => void;

  private _onLoadSceneHash = (hash: Hash): void => {
    let itemsInfo: LoadProjectItemsResult | undefined = undefined;
    let loadSceneErr: string | undefined = undefined;
    try {
      itemsInfo = this._loadProjectItemsResultFromHash(this._projectName, hash);
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
      this._onGetSceneCallback?.({
        scene: undefined,
        error_msg: loadSceneErr,
      });
    } else {
      const sceneInfo = itemsInfo!.projectItems[0] as ProjectSceneInfo;
      this._sceneCache.storeSceneInfo(sceneInfo);
      this._onGetSceneCallback?.({
        scene: {
          domain: sceneInfo.domain,
          projectName: this._projectName,
          uuid: sceneInfo.uuid,
          item_type: sceneInfo.item_type,
          name: sceneInfo.name,
          description: sceneInfo.description,
          svg: sceneInfo.svg,
          dateModified: sceneInfo.dateModified,
        },
        error_msg: undefined,
      });
    }
    this._onGetSceneCallback = undefined;
    // Unregister the hash handler for the duration of the getScene operation.
    this._activeLoadItemsHandler = undefined;
  };

  // #endregion

  // #region ListDomains

  public listDomains() {
    getNetwork().onProjectListDomains();
  }

  // #endregion

  // #region Hash building utilities

  private _loadItemsHashList = (items: DbItemInfo[]): HashList => {
    let itemsHashes: Hash[] = [];
    for (const item of items) {
      const itemHash = new Hash({
        domain: item.domain,
        uuid: item.uuid,
        item_type: item.item_type,
      });
      itemsHashes.push(itemHash);
    }
    return new HashList(itemsHashes);
  };

  // #endregion

  // #region Hash decoding utilities

  private _listProjectsResultFromHash = (hash: Hash): ListProjectsResult => {
    const reason = hash.get('reason') as string;
    if (reason.length > 0) {
      // An error occurred
      return { error_msg: reason, projects: [] };
    } else {
      const itemsHashes = hash.getValue('reply.items') as HashValues[];
      const domain = hash.getValue('request.args.domain') as string;
      const projects: ProjectItemInfo[] = itemsHashes.map((hv: HashValues) => {
        const item = new Hash(hv);
        return {
          domain: domain,
          uuid: item.getValue('uuid') as string,
          name: item.getValue('simple_name') as string,
          dateModified: item.getValue('date') as string,
          isTrashed: item.getValue('is_trashed') as boolean,
          item_type: 'project',
        };
      });
      return { error_msg: undefined, projects: projects };
    }
  };

  private _loadProjectItemsResultFromHash = (
    projectName: string,
    hash: Hash
  ): LoadProjectItemsResult => {
    const reason = hash.getValue('reason') as string;
    if (reason.length > 0) {
      // An error occurred
      return { error_msg: reason, projectItems: [] };
    } else {
      const items: DbItemInfo[] = [];
      const itemHashes = hash.getValue(
        'reply.items'
      ) as unknown as HashValues[];
      //console.log(itemHashes);
      for (let i = 0; i < itemHashes.length; i++) {
        const item = new Hash(itemHashes[i]);
        const domain = item.getValue('domain') as string;
        const uuid = item.getValue('uuid') as string;
        const xml = item.getValue('xml') as string;
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '@_',
          allowBooleanAttributes: true,
        });
        //console.log(xml);
        const xmlObj = parser.parse(xml);
        const itemType = xmlObj.xml['@_item_type'];
        if (itemType === 'project') {
          // Build a ProjectContentsInfo object
          const scenes: DbItemInfo[] = [];
          const xmlScenes =
            // Some XML's have an "artificial" root and some not
            xmlObj.xml['root'] !== undefined
              ? xmlObj.xml.root.project.scenes
              : xmlObj.xml.project.scenes;
          if (xmlScenes['KRB_Item'] !== undefined) {
            for (let i = 0; i < xmlScenes.KRB_Item.length; i++) {
              scenes.push({
                domain: domain,
                uuid: xmlScenes.KRB_Item[i].uuid['#text'],
                item_type: itemType,
              });
            }
          }
          const subprojects: DbItemInfo[] = [];
          const xmlSubprojects =
            // Some XML's have an "artificial" root and some not
            xmlObj.xml['root'] !== undefined
              ? xmlObj.xml.root.project.subprojects
              : xmlObj.xml.project.subprojects;
          if (xmlSubprojects['KRB_Item'] !== undefined) {
            for (let i = 0; i < xmlSubprojects.KRB_Item.length; i++) {
              subprojects.push({
                domain: domain,
                uuid: xmlSubprojects.KRB_Item[i].uuid['#text'],
                item_type: 'project', // A subproject is a project
              });
            }
          }
          const item = {
            domain: domain,
            uuid: uuid,
            name: xmlObj.xml['@_simple_name'],
            isTrashed: xmlObj.xml['@_is_trashed'],
            dateModified: xmlObj.xml['@_date'],
            scenes: scenes,
            subprojects: subprojects,
            item_type: itemType,
          };
          items.push(item);
        } else if (itemType === 'scene') {
          // TODO: remove — temporary debug to inspect readScene output
          console.log('[readScene] model:', readScene(xml));
          // Build a ProjectSceneInfo object
          const item = {
            domain: domain,
            projectName: projectName,
            uuid: uuid,
            name: xmlObj.xml['@_simple_name'],
            description: xmlObj.xml['@_description'],
            dateModified: xmlObj.xml['@_date'],
            // NOTE: Some older scenes have the root element of the svg as "svg",
            //       while some newer scenes have "svg:svg"
            svg:
              xmlObj.xml['svg:svg'] != undefined
                ? JSON.stringify(xmlObj.xml['svg:svg'])
                : JSON.stringify(xmlObj.xml['svg']),
            item_type: itemType,
          };
          //console.log(item);
          items.push(item);
        }
      }
      return {
        projectItems: items,
      };
    }
  };

  // #endregion
} // class ProjectDBConnector
