import { ProjectModel } from './model';
import { BaseProjectObjectModel } from './bases';
import { SceneModel, readScene } from '../scenemodel/api';
import { decodeXML, Hash } from '@/karabo/data/api';
import {
  PROJECT_DB_TYPE_PROJECT,
  PROJECT_DB_TYPE_SCENE,
  PROJECT_OBJECT_CATEGORIES,
} from './const';

export const _PROJECT_ITEM_TYPES: Record<string, any> = {
  // subprojects: ProjectModel,
  scenes: SceneModel,
};

type Metadata = Record<string, string>;

function _scene_reader(
  xml: string,
  existing: SceneModel,
  metadata: Record<string, string>
): SceneModel {
  const meta = db_metadata_reader(metadata);
  const scene = readScene(xml);
  Object.assign(existing, meta);
  existing.file_format_version = scene.file_format_version;
  existing.extra_attributes = scene.extra_attributes; // needs copy
  existing.width = scene.width;
  existing.height = scene.height;
  existing.children = scene.children;
  existing.initialized = true;
  return existing;
}

function _project_reader(
  xml: string,
  existing: ProjectModel,
  metadata: Record<string, string>
): ProjectModel {
  // Build the models from the project, in our case: SceneModels
  function _get_items(hsh: any, typeName: string): any[] {
    const Klass = _PROJECT_ITEM_TYPES[typeName];
    const entries = hsh.getValue(typeName);
    return (Array.isArray(entries) ? entries : [entries]).map(
      (h: any) => new Klass({ uuid: h.getValue('uuid'), initialized: false })
    );
  }

  const meta = db_metadata_reader(metadata);
  meta['is_trashed'] = metadata['is_trashed'] === 'true';
  const hsh = decodeXML(xml);

  const projectHash = hsh.getValue(PROJECT_DB_TYPE_PROJECT) as Hash;
  for (const key of PROJECT_OBJECT_CATEGORIES) {
    meta[key] = _get_items(projectHash, key);
  }
  Object.assign(existing, meta);
  existing.initialized = true;
  return existing;
}

/**
 * Read the DB metadata common to project model objects.
 */
export function db_metadata_reader(
  metadata: Record<string, string>
): Record<string, any> {
  return {
    uuid: metadata['uuid'],
    simple_name: metadata['simple_name'] ?? '',
    date: metadata['date'] ?? '',
  };
}

/**
 * Unwrap a blob of XML into two independent documents.
 */
function _unwrap_child_element_xml(xml: string): [string, string] {
  const startIndex = xml.indexOf('>');
  const endIndex = xml.lastIndexOf('</xml>');

  if (startIndex === -1 || endIndex === -1) {
    throw new Error('Invalid XML wrapper');
  }

  const contentStart = startIndex + 1;
  const parent = xml.slice(0, contentStart) + xml.slice(endIndex);
  const child = xml.slice(contentStart, endIndex);

  return [parent, child];
}

/**
 * Deserialize a project model object.
 *
 * @param xml The XML string
 * @param existing Optional preexisting object to fill
 * @returns A project data model object
 */
export function readProjectItemModel(
  xml: string,
  existing: BaseProjectObjectModel
): any {
  const factories: Record<string, any> = {
    [PROJECT_DB_TYPE_PROJECT]: _project_reader,
    [PROJECT_DB_TYPE_SCENE]: _scene_reader,
  };

  // Unwrap the model XML into parent and child elements
  const [parentXml, childXml] = _unwrap_child_element_xml(xml);

  // Parse the parent XML and extract attributes as metadata
  const parentDoc = new DOMParser().parseFromString(
    parentXml,
    'application/xml'
  );

  const parserError = parentDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid XML');
  }

  const parentElement = parentDoc.documentElement;
  const metadata: Metadata = {};

  for (const attr of Array.from(parentElement.attributes)) {
    metadata[attr.name] = attr.value;
  }

  const itemType = metadata['item_type'];
  const factory = itemType ? factories[itemType] : undefined;

  if (!factory) {
    throw new Error(`No factory found for item_type: ${itemType}`);
  }

  // Construct from the child data + metadata
  return factory(childXml, existing, metadata);
}
