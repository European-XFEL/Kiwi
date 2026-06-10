import { Hash, HashList, HashValues } from '@/karabo/data/api';
import {
  ListProjectScenesResult,
  LoadProjectItemsResult,
  LoadProjectSceneResult,
  ProjectSceneCache,
  BaseProjectObjectModel,
} from '@/karabo/common/project/api';
import { XMLParser } from 'fast-xml-parser';
import {
  readSceneFromSvgJson,
  SceneModel,
} from '@/karabo/common/scenemodel/api';
import { getNetwork } from '@/lib/singletons/api';

import {
  broadcast_event,
  KaraboEvent,
  KaraboEventMap,
  register_for_broadcasts,
  unregister_for_broadcasts,
} from '@/lib/events';
import { ProjectQueryableItem } from '@/karabo/common/project/ProjectModel';

enum DbConnectionState {
  IDLE,
  GETTING_PROJECTS,
  GETTING_PROJECT_SCENES,
  GETTING_SCENE,
}

export class DbConnection {
  private readonly eventMap: KaraboEventMap;
  // The active loadItemHandler: onLoadItemsHash during a listScenes operation,
  // onLoadSceneHash during a getScene operation or undefined while none of
  // those operations are taking place
  private _activeLoadItemsHandler?: (hash: Hash) => void;
  private _sceneCache = new ProjectSceneCache();
  private _state = DbConnectionState.IDLE;

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

  public listProjects(domain: string): void {
    this._state = DbConnectionState.GETTING_PROJECTS;
    getNetwork().onProjectListItems(domain);
  }

  // The internal callback registered to handle projectListItems messages
  // received from the GUI Server. Responsible for dispatching the call to the
  // callback registered by the external caller of listProjects.
  private _onEventListItems = (hash: Hash): void => {
    this._state = DbConnectionState.IDLE;
    broadcast_event(KaraboEvent.ListProjects, hash);
  };

  // #endregion

  // #region List Scenes
  public listScenes(
    domain: string,
    projectName: string,
    uuidProject: string,
    onScenes: (scenesInfo: ListProjectScenesResult) => void
  ): void {
    if (this._state != DbConnectionState.IDLE) {
      // Only starts a listScenes operation while idle
      console.warn(
        "Cannot start a 'listScenes' operation while not in IDLE state"
      );
      return;
    }
    this._state = DbConnectionState.GETTING_PROJECT_SCENES;
    this._onListScenesCallback = onScenes;
    // Registers the handler for handling projectLoadItems messages from the GUI Server
    // for the duration of the listScenes operation.
    this._activeLoadItemsHandler = this._onLoadItemsHash;

    // Starts the sequence of operations to get the list of scenes of a project.
    // Differently from the listDomains and listProjects operations, listScenes
    // requires multiple round-trips of "loadItems" operations.
    this._collectedScenes = [];
    this._domain = domain;
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
  private _domain: string = '';
  private _projectName: string = '';
  private _collectedScenes?: SceneModel[];
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
      itemsInfo = this._loadProjectItemsResultFromHash(hash);
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
      // Iterates through the retrieved project items, collecting the scenes
      const itemsToQuery: ProjectQueryableItem[] = [];
      for (const item of itemsInfo.projectItems) {
        if (item != null && 'scenes' in item) {
          // Project contains multiple scenes; loads them
          const projectScenes = item['scenes'] as Object[];
          for (const scene of projectScenes) {
            itemsToQuery.push({
              domain: scene['domain'],
              uuid: scene['uuid'],
              item_type: 'scene',
            });
          }
          if (itemsToQuery.length > 0) {
            this._pendingLoadItems += 1;
            getNetwork().onProjectLoadItems(
              this._loadItemsHashList(itemsToQuery)
            );
          }
        } else if (item != null && 'svg' in item) {
          // Project contains a single scene, collect it
          const sceneIdx = this._collectedScenes?.findIndex(
            (scene) => scene.uuid === item.uuid
          );
          if (sceneIdx === -1) {
            this._collectedScenes?.push(
              new SceneModel({
                uuid: item['uuid'],
                simple_name: item['simple_name'],
                svg: item['svg'] as string,
                date: item['date'],
              })
            );
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
          domain: this._domain,
          projectName: this._projectName,
          scenes: [],
          error_msg: this._loadItemsErr,
        };
      } else {
        listScenesResult = {
          domain: this._domain,
          projectName: this._projectName,
          scenes: this._collectedScenes!.sort((a, b) =>
            a.simple_name.localeCompare(b.simple_name)
          ),
        };
      }
      this._state = DbConnectionState.IDLE;
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
    //cache lookup - note that the cache is only for scenes, so we don't need to check the projectName
    const sceneInfo = this._sceneCache.getSceneInfo(domain, uuid);
    if (sceneInfo && sceneInfo.svg) {
      // Scene was found in cache - rebuild model from cached JSON and return
      const model = readSceneFromSvgJson(JSON.parse(sceneInfo.svg));
      onScene({ sceneModel: model, error_msg: undefined });
      return;
    }
    // Stores the callback to be called when the GUI Server sends back the scene.
    if (this._state != DbConnectionState.IDLE) {
      // There's already a pending operation. Postpone the request.
      // Those operations can't be concurrently executed because they handle "projectLoadItems"
      // hashes sent by the GUI Server differently.
      setTimeout(() => this.getScene(domain, projectName, uuid, onScene), 100);
      return;
    }
    this._state = DbConnectionState.GETTING_SCENE;
    // Registers the handler for handling projectLoadItems messages from the GUI Server
    // for the duration of the getScene operation.
    this._activeLoadItemsHandler = this._onLoadSceneHash;

    this._onGetSceneCallback = onScene;
    this._domain = domain;
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
      itemsInfo = this._loadProjectItemsResultFromHash(hash);
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
    } else if (
      itemsInfo!.projectItems[0] != null &&
      !('svg' in itemsInfo!.projectItems[0])
    ) {
      // An error occurred - the returned item is not a scene.
      loadSceneErr = 'Error loading project scene - no scene returned';
    }
    if (loadSceneErr !== undefined) {
      // An error occurred
      this._onGetSceneCallback?.({
        sceneModel: undefined,
        error_msg: loadSceneErr,
      });
    } else {
      const sceneData = itemsInfo!.projectItems[0];
      const sceneInfo = {
        domain: sceneData['domain'],
        project_name: this._projectName,
        uuid: sceneData['uuid'],
        item_type: 'scene',
        simple_name: sceneData['simple_name'],
        svg: sceneData['svg'],
        date: sceneData['date'],
      };
      const sceneModel = readSceneFromSvgJson(JSON.parse(sceneInfo.svg));
      sceneModel.date = sceneInfo['date'];
      sceneModel.simple_name = sceneInfo['simple_name'];
      sceneModel.uuid = sceneInfo['uuid'];
      this._sceneCache.storeSceneInfo(sceneData['domain'], sceneModel);
      this._onGetSceneCallback?.({
        sceneModel: sceneModel,
        error_msg: undefined,
      });
    }
    this._state = DbConnectionState.IDLE;
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

  private _loadItemsHashList = (items: ProjectQueryableItem[]): HashList => {
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

  private _loadProjectItemsResultFromHash = (
    hash: Hash
  ): LoadProjectItemsResult => {
    const reason = hash.getValue('reason') as string;
    if (reason.length > 0) {
      // An error occurred
      return { error_msg: reason, projectItems: [] };
    } else {
      const items: BaseProjectObjectModel[] = [];
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
          const scenes: ProjectQueryableItem[] = [];
          const xmlScenes =
            // Some XML's have an "artificial" root and some not
            xmlObj.xml['root'] !== undefined
              ? xmlObj.xml.root.project.scenes
              : xmlObj.xml.project.scenes;
          if (xmlScenes['KRB_Item'] !== undefined) {
            const krbItems = xmlScenes.KRB_Item;
            if (typeof (krbItems as any).length === 'number') {
              // The project has more than one scene - the XML parser has
              // returned a collection with the length property
              for (let i = 0; i < krbItems.length; i++) {
                scenes.push({
                  domain: domain,
                  uuid: krbItems[i].uuid['#text'],
                  item_type: 'scene',
                });
              }
            } else {
              // The project has a single scene - the XML parser returned a
              // single object instead of a collection with one element
              scenes.push({
                domain: domain,
                uuid: krbItems.uuid['#text'],
                item_type: 'scene',
              });
            }
          }
          const item = {
            domain: domain,
            uuid: uuid,
            simple_name: xmlObj.xml['@_simple_name'],
            is_trashed: xmlObj.xml['@_is_trashed'],
            date: xmlObj.xml['@_date'],
            scenes: scenes,
            item_type: itemType,
          };
          items.push(item);
        } else if (itemType === 'scene') {
          // Build a SceneModel object
          const item = {
            uuid: uuid,
            simple_name: xmlObj.xml['@_simple_name'],
            description: xmlObj.xml['@_description'],
            date: xmlObj.xml['@_date'],
            svg:
              xmlObj.xml['svg:svg'] != undefined
                ? JSON.stringify(xmlObj.xml['svg:svg'])
                : JSON.stringify(xmlObj.xml['svg']),
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
