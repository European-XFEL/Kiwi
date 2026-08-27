import { BaseSavableModel } from '../bases';
import { v4 as uuidv4 } from 'uuid';

/** Base class for project-managed objects (scenes, macros, etc.). */
export class BaseProjectObjectModel extends BaseSavableModel {
  simple_name = '';
  uuid = '';
  date = '';

  reset_uuid(): void {
    this.uuid = uuidv4();
  }
}
