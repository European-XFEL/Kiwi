import { ProjectModel } from '@/karabo/common/project/api';

export class ProjectItemModel {
  private _root_model: ProjectModel | undefined;
  private _domain: string | undefined;

  constructor() {}

  public setRoot(domain: string, model: ProjectModel): void {
    this._domain = domain;
    this._root_model = model;
  }

  public set root(model: ProjectModel | undefined) {
    // Create adapters for views
    this._root_model = model;
    if (!model) {
      this._domain = undefined;
    }
  }

  public get root(): ProjectModel | undefined {
    return this._root_model;
  }

  public get domain(): string | undefined {
    return this._domain;
  }
}
