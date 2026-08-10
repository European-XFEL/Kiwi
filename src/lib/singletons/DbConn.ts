import { Hash, HashList } from '@/karabo/data/api';
import {
  ProjectModel,
  readProjectItemModel,
  MemCacheWrapper,
  read_lazy_object,
  get_item_type,
  BaseProjectObjectModel,
  ProjectDBCache,
  findProjectModelInProject,
  findSceneModelInProject,
} from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { getNetwork, getProjectModel } from '@/lib/singletons/api';

import {
  broadcast_event,
  KaraboEvent,
  KaraboEventMap,
  register_for_broadcasts,
  unregister_for_broadcasts,
} from '@/lib/events';

enum DbConnectionState {
  IDLE,
  LIST_PROJECTS,
  LOAD_PROJECT,
}

export class DbConnection {
  private readonly eventMap: KaraboEventMap;
  private _cache = new ProjectDBCache();
  private _waiting_for_read = new Map<string, any>();
  private _read_items_buffer = new HashList();

  private _state = DbConnectionState.IDLE;
  private ignore_cache = true;

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

  private is_processing(): boolean {
    return this._waiting_for_read.size > 0;
  }

  private _onEventLoadProjectItems = (data: Hash): void => {
    const success = data.getValue<boolean>('success');
    if (!success) {
      this._waiting_for_read.clear();
      this._read_items_buffer.length = 0;
      const reason = data.getValue<string>('reason');
      console.log(`Not successful reading project items. Error: ${reason}`);
      this._broadcast_is_processing(false, true, true);
      return;
    }
    const items = data.getValue<HashList>('reply.items');
    for (const item of items) {
      const domain = item.getValue('domain') as string;
      const uuid = item.getValue('uuid') as string;
      const xml = item.getValue('xml') as string;
      this._cache.store(domain, uuid, xml);
    }
    // memCache enables bulk
    const memCache = this.buildMemcache(items);
    for (const item of items) {
      const domain = item.getValue('domain') as string;
      const uuid = item.getValue('uuid') as string;
      this._popReading(domain, uuid, success, memCache);
    }
    this.flush();
  };

  // #region List Projects

  public listProjects(domain: string): void {
    this._state = DbConnectionState.LIST_PROJECTS;
    getNetwork().onProjectListItems(domain);
  }

  private _onEventListItems = (hash: Hash): void => {
    this._state = DbConnectionState.IDLE;
    broadcast_event(KaraboEvent.ListProjects, hash);
  };

  // #endregion

  public retrieve(
    domain: string,
    uuid: string,
    existing: BaseProjectObjectModel
  ): string | null {
    let data;
    if (!this.ignore_cache) {
      data = this._cache.retrieve(domain, uuid, existing);
    } else {
      data = null;
    }
    if (data === null) {
      this._pushReading(domain, uuid, existing);
    }
    return data;
  }

  private _pushReading(
    domain: string,
    uuid: string,
    existing: BaseProjectObjectModel
  ) {
    const is_processing = this.is_processing();
    if (!this._waiting_for_read.has(uuid)) {
      this._waiting_for_read.set(uuid, existing);
      const item_type = get_item_type(existing!);
      const projectItem = new Hash({
        domain: domain,
        uuid: uuid,
        item_type: item_type,
      });
      this._read_items_buffer.push(projectItem);
      if (this._read_items_buffer.length >= 50) {
        this.flush();
      }
    }
    this._broadcast_is_processing(is_processing);
  }

  public flush() {
    if (this._read_items_buffer.length > 0) {
      const items = this._read_items_buffer;
      getNetwork().onProjectLoadItems(items);
      this._read_items_buffer.length = 0;
    }
  }

  private _broadcast_is_processing(
    previous_processing: boolean,
    bail: boolean = false,
    loading_failed: boolean = false
  ) {
    if (bail) {
      // Tell the world reading or writing project failed
      broadcast_event(
        KaraboEvent.DatabaseBusy,
        new Hash('is_processing', false, 'loading_failed', loading_failed)
      );
    }
    const is_processing = this.is_processing();
    if (!is_processing) {
      this._state = DbConnectionState.IDLE;
    }
    if (is_processing === previous_processing) {
      return;
    }
    broadcast_event(
      KaraboEvent.DatabaseBusy,
      new Hash('is_processing', is_processing)
    );
  }

  // #region Load Project
  public loadProject(domain: string, project: ProjectModel): void {
    if (this._state != DbConnectionState.IDLE) {
      // Only starts a loadProject operation while idle
      console.warn(
        "Cannot start a 'loadProject' operation while not in IDLE state"
      );
      return;
    }
    this._state = DbConnectionState.LOAD_PROJECT;
    read_lazy_object(domain, project.uuid, this, readProjectItemModel, project);
    // On load project we need to flush
    this.flush();
  }

  private _popReading(
    domain: string,
    uuid: string,
    success: boolean,
    storage: MemCacheWrapper
  ) {
    const is_processing = this.is_processing();
    const obj = this._waiting_for_read.get(uuid);
    if (obj && success) {
      this._waiting_for_read.delete(uuid);
      // Find a way for recursive loading
      read_lazy_object(domain, uuid, storage, readProjectItemModel, obj);
    }
    this._broadcast_is_processing(is_processing);
  }

  private buildMemcache(items: HashList): MemCacheWrapper {
    const data: Record<string, Record<string, any>> = {};
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const domain = item.getValue('domain') as string;
      const uuid = item.getValue('uuid') as string;
      const xml = item.getValue('xml') as string;
      // Initialize
      data[domain] ??= {};
      data[domain][uuid] = xml;
    }
    return new MemCacheWrapper(data, this);
  }

  // #endregion

  // #region GetScene
  public getScene(
    domain: string,
    projectUuid: string,
    sceneUuid: string
  ): SceneModel {
    const projectModel = getProjectModel();
    const project = projectModel.root;

    if (
      projectModel.domain !== domain ||
      !project ||
      project.uuid !== projectUuid
    ) {
      throw new Error('The project model is not loaded for this scene.');
    }

    const sceneProject = findProjectModelInProject(project, projectUuid);
    if (!sceneProject) {
      throw new Error('The project model is not loaded for this scene.');
    }

    const scene = findSceneModelInProject(sceneProject, sceneUuid);

    if (!scene) {
      throw new Error(
        `Scene "${sceneUuid}" was not found in the current project model.`
      );
    }

    return scene;
  }

  // #endregion

  // #region ListDomains

  public listDomains() {
    getNetwork().onProjectListDomains();
  }

  // #endregion
}
