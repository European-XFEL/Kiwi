import { BaseSavableModel } from '../bases';

/** Base class for project-managed objects (scenes, macros, etc.). */
export class BaseProjectObjectModel extends BaseSavableModel {
  simple_name = '';
  uuid = '';
  date = '';
}
