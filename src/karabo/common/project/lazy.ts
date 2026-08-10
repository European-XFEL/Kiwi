import { BaseProjectObjectModel } from './bases';
import { ProjectModel } from './model';

export class MemCacheWrapper {
  public data: Record<string, Record<string, any>> = {};
  private db_iface: any;

  constructor(data: Record<string, Record<string, any>> = {}, db_iface: any) {
    this.data = data;
    this.db_iface = db_iface;
  }

  public flush(): void {
    this.data = {};
  }

  public store(domain: string, uuid: string, data: any): void {
    this.data[domain] ??= {};
    this.data[domain][uuid] = data;
  }

  public retrieve(domain: string, uuid: string, existing?: any): any {
    const domain_data = this.data[domain];
    if (!domain_data) {
      return this.db_iface.retrieve(domain, uuid, existing);
    }

    if (!(uuid in domain_data)) {
      return this.db_iface.retrieve(domain, uuid, existing);
    }

    return domain_data[uuid];
  }
}

function* _walk_project_object(obj) {
  yield obj;
  if (obj instanceof ProjectModel) {
    for (const scene of obj.scenes ?? []) {
      yield scene;
    }
    for (const project of obj.subprojects) {
      yield project;
    }
  }
}

function _read_lazy_object_r(
  domain: string,
  uuid: string,
  db_iface: any,
  reader: any,
  existing: BaseProjectObjectModel,
  requested_objects: Set<string>
) {
  const collected: BaseProjectObjectModel[] = [];

  const data = db_iface.retrieve(domain, uuid, (existing = existing));
  requested_objects.add(uuid);
  if (data) {
    const obj = reader(data, (existing = existing));
    // recursively chec, we know
    for (const child of _walk_project_object(obj)) {
      if (!requested_objects.has(child.uuid)) {
        collected.push(child);
      }
    }
    for (const child of collected) {
      if (child === obj) {
        continue;
      }
      _read_lazy_object_r(
        domain,
        child.uuid,
        db_iface,
        reader,
        child,
        requested_objects
      );
    }
    return obj;
  } else {
    return existing;
  }
}

// Recursively load all project items
export function read_lazy_object(
  domain: string,
  uuid: string,
  db_iface,
  reader,
  existing?
): void {
  const requested_objects = new Set<string>();
  return _read_lazy_object_r(
    domain,
    uuid,
    db_iface,
    reader,
    existing,
    requested_objects
  );
}
