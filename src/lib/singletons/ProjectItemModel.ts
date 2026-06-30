import { ProjectModel } from '@/karabo/common/project/api';

export class ProjectItemModel {
  private _root_model: ProjectModel | undefined;

  constructor() {}

  public set root(model: ProjectModel | undefined) {
    // Create adapters for views
    this._root_model = model;
  }

  public get root(): ProjectModel | undefined {
    return this._root_model;
  }
}
