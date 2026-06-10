import { SceneModel } from '../scenemodel/api';
import { BaseProjectObjectModel } from './bases';

export class ProjectModel extends BaseProjectObjectModel {
  scenes: SceneModel[] | null = null;
  is_trashed: boolean = false;

  constructor({
    uuid,
    date,
    simple_name,
    is_trashed,
  }: {
    uuid?: string;
    date?: string;
    simple_name?: string;
    is_trashed?: boolean;
  }) {
    super();
    this.uuid = uuid ?? '';
    this.date = date ?? '';
    this.simple_name = simple_name ?? '';
    this.is_trashed = is_trashed ?? false;
  }
}

export interface ProjectQueryableItem {
  domain: string;
  uuid: string;
  item_type: string;
}
