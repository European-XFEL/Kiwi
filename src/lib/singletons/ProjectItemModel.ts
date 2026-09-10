import { ProjectModel } from '@/karabo/common/project/api';
import { Hash } from '@/karabo/data/api';
import { broadcast_event, KaraboEvent } from '@/lib/events';

export class ProjectItemModel {
  private _root_model: ProjectModel | undefined;
  private _domain: string | undefined;

  constructor() {}

  public setRoot(domain: string, model: ProjectModel): void {
    this._domain = domain;
    this._root_model = model;
    broadcast_event(KaraboEvent.RootProjectChanged, new Hash());
  }

  public clearRoot(): void {
    this._domain = undefined;
    this._root_model = undefined;
    broadcast_event(KaraboEvent.RootProjectChanged, new Hash());
  }

  public get root(): ProjectModel | undefined {
    return this._root_model;
  }

  public get domain(): string | undefined {
    return this._domain;
  }
}
