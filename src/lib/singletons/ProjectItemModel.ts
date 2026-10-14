import { ProjectModel } from '@/karabo/common/project/api';
import type { SceneModel } from '@/karabo/common/scenemodel/api';
import { Signal } from '@/lib/utils';
import { Hash } from '@/karabo/data/api';
import { broadcast_event, KaraboEvent } from '@/lib/events';

type ProjectNodeBase = {
  id: string;
  name: string;
  parent: ProjectTreeNode | null;
};

export type ProjectTreeNode = ProjectNodeBase &
  (
    | {
        kind: 'project' | 'scenes' | 'subprojects';
        model: ProjectModel;
        children: ProjectTreeNode[];
      }
    | { kind: 'scene'; model: SceneModel; children: null }
  );

export type ProjectSnapshot = {
  root: ProjectModel | undefined;
  domain: string | undefined;
  nodes: ProjectTreeNode[];
  projects: ReadonlyMap<string, ProjectEntry>;
};

type ProjectEntry = {
  model: ProjectModel;
  subprojectUuids: Set<string>;
};

export class ProjectItemModel {
  private projects = new Map<string, ProjectEntry>();
  private snapshot: ProjectSnapshot = {
    root: undefined,
    domain: undefined,
    nodes: [],
    projects: this.projects,
  };
  private readonly changed = new Signal();
  private nodes = new Map<string, ProjectTreeNode>();
  private scenes = new Map<string, SceneModel>();
  private sceneProjects = new Map<string, ProjectModel>();

  public getSnapshot = (): ProjectSnapshot => this.snapshot;
  public subscribe = (listener: () => void): (() => void) =>
    this.changed.subscribe(this, listener);

  public getNode(id: string): ProjectTreeNode | undefined {
    return this.nodes.get(id);
  }

  public getProject(uuid: string): ProjectModel | undefined {
    return this.projects.get(uuid)?.model;
  }

  public getScene(uuid: string): SceneModel | undefined {
    return this.scenes.get(uuid);
  }

  public getSceneProject(uuid: string): ProjectModel | undefined {
    return this.sceneProjects.get(uuid);
  }

  public setRoot(domain: string, root: ProjectModel): void {
    const previousNodes =
      this.snapshot.root === root
        ? this.nodes
        : new Map<string, ProjectTreeNode>();
    this.nodes = new Map();
    this.projects = new Map();
    this.scenes.clear();
    this.sceneProjects.clear();
    const visited = new Set<ProjectModel>();

    // Visit every instance: a shared UUID can occur first as a stub. Prefer
    // initialized copies while retaining the child links from all instances.
    const collect = (project: ProjectModel) => {
      if (visited.has(project)) {
        return;
      }
      visited.add(project);
      let entry = this.projects.get(project.uuid);
      if (!entry) {
        entry = { model: project, subprojectUuids: new Set() };
        this.projects.set(project.uuid, entry);
      } else if (!entry.model.initialized && project.initialized) {
        entry.model = project;
      }
      for (const child of project.subprojects) {
        entry.subprojectUuids.add(child.uuid);
        collect(child);
      }
    };
    collect(root);

    for (const { model: project } of this.projects.values()) {
      for (const scene of project.scenes ?? []) {
        const existing = this.scenes.get(scene.uuid);
        if (!existing || (!existing.initialized && scene.initialized)) {
          this.scenes.set(scene.uuid, scene);
          this.sceneProjects.set(scene.uuid, project);
        }
      }
    }

    const syncNode = (data: ProjectTreeNode): ProjectTreeNode => {
      const node = previousNodes.get(data.id) ?? data;
      Object.assign(node, data);
      this.nodes.set(node.id, node);
      return node;
    };
    const build = (
      uuid: string,
      parent: ProjectTreeNode | null,
      ancestors: Set<string>
    ): ProjectTreeNode => {
      const { model: project, subprojectUuids } = this.projects.get(uuid)!;
      const id = `${parent?.id ?? ''}/project:${encodeURIComponent(uuid)}`;
      const node = syncNode({
        id,
        kind: 'project',
        name: project.simple_name,
        model: project,
        parent,
        children: [],
      });
      const sceneGroup = syncNode({
        id: `${id}/scenes`,
        kind: 'scenes',
        name: 'Scenes',
        model: project,
        parent: node,
        children: [],
      });
      const subprojectGroup = syncNode({
        id: `${id}/subprojects`,
        kind: 'subprojects',
        name: 'Subprojects',
        model: project,
        parent: node,
        children: [],
      });
      sceneGroup.children = (project.scenes ?? []).map((scene) =>
        syncNode({
          id: `${sceneGroup.id}/scene:${encodeURIComponent(scene.uuid)}`,
          kind: 'scene',
          name: scene.simple_name,
          model: scene,
          parent: sceneGroup,
          children: null,
        })
      );
      const nextAncestors = new Set(ancestors).add(uuid);
      subprojectGroup.children = [...subprojectUuids]
        .filter((child) => !nextAncestors.has(child))
        .map((child) => build(child, subprojectGroup, nextAncestors));
      node.children = [sceneGroup, subprojectGroup];
      return node;
    };
    this.snapshot = {
      root,
      domain,
      nodes: [build(root.uuid, null, new Set())],
      projects: this.projects,
    };
    broadcast_event(KaraboEvent.RootProjectChanged, new Hash());
    this.changed.fire();
  }

  public clearRoot(): void {
    this.nodes.clear();
    this.projects = new Map();
    this.scenes.clear();
    this.sceneProjects.clear();
    this.snapshot = {
      root: undefined,
      domain: undefined,
      nodes: [],
      projects: this.projects,
    };
    broadcast_event(KaraboEvent.RootProjectChanged, new Hash());
    this.changed.fire();
  }

  public get root(): ProjectModel | undefined {
    return this.snapshot.root;
  }

  public get domain(): string | undefined {
    return this.snapshot.domain;
  }
}
