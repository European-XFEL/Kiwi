/** SceneModel — root container for a Karabo scene. */

import { BaseSceneObjectData } from './bases';

export class SceneModel extends BaseSceneObjectData {
  simple_name = '';
  uuid = '';

  width = 1024;
  height = 768;
  file_format_version = 2;

  /** Preserves unknown SVG attributes for round-trip fidelity. */
  extra_attributes: Record<string, string> = {};

  children: BaseSceneObjectData[] = [];
}
