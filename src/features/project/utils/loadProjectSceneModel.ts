import {
  findProjectModelInProject,
  findSceneModelInProject,
  isProjectInitialized,
  ProjectModel,
} from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { Hash, HashList } from '@/karabo/data/api';
import { KaraboEvent } from '@/lib/events';
import { getDbConn, getMediator, getProjectModel } from '@/lib/singletons/api';

const cancelledMessage = 'Scene loading was cancelled.';

type LoadProjectSceneModelParams = {
  domain: string;
  projectUuid: string;
  sceneUuid: string;
  signal?: AbortSignal;
};

function waitForEvent(
  event: KaraboEvent,
  signal?: AbortSignal,
  accepts: (hash: Hash) => boolean = () => true
): Promise<Hash> {
  if (signal?.aborted) {
    return Promise.reject(new Error(cancelledMessage));
  }

  return new Promise((resolve, reject) => {
    let unsubscribe: () => void = () => undefined;

    const cleanup = () => {
      unsubscribe();
      signal?.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      reject(new Error(cancelledMessage));
    };

    unsubscribe = getMediator().on(event, (hash) => {
      if (!accepts(hash)) {
        return;
      }

      cleanup();
      resolve(hash);
    });

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function findLoadedProject(
  domain: string,
  projectUuid: string
): ProjectModel | undefined {
  const projectModel = getProjectModel();
  if (projectModel.domain !== domain || !projectModel.root) {
    return undefined;
  }

  return findProjectModelInProject(projectModel.root, projectUuid)
    ? projectModel.root
    : undefined;
}

async function listProjectByUuid(
  domain: string,
  projectUuid: string,
  signal?: AbortSignal
): Promise<ProjectModel> {
  const projectsPromise = waitForEvent(KaraboEvent.ListProjects, signal);
  getDbConn().listProjects(domain);

  const hash = await projectsPromise;
  const reason = hash.getValue<string>('reason');
  if (reason.length > 0) {
    throw new Error(reason);
  }

  const project = hash
    .getValue<HashList>('reply.items')
    .map(
      (item) =>
        new ProjectModel({
          uuid: item.getValue('uuid'),
          date: item.getValue('date'),
          simple_name: item.getValue('simple_name'),
          is_trashed: item.getValue('is_trashed'),
        })
    )
    .filter((item) => !item.is_trashed)
    .find((item) => item.uuid === projectUuid);

  if (!project) {
    throw new Error(`Project "${projectUuid}" was not found in ${domain}.`);
  }

  return project;
}

async function ensureProjectLoaded(
  domain: string,
  project: ProjectModel,
  signal?: AbortSignal
): Promise<void> {
  if (isProjectInitialized(project)) {
    return;
  }

  const projectLoaded = waitForEvent(
    KaraboEvent.DatabaseBusy,
    signal,
    (hash) => hash.has('is_processing') && !hash.getValue('is_processing')
  );
  getDbConn().loadProject(domain, project);

  const hash = await projectLoaded;
  const loadingFailed = hash.has('loading_failed')
    ? hash.getValue<boolean>('loading_failed')
    : false;
  if (loadingFailed) {
    throw new Error(`Could not load project "${project.simple_name}".`);
  }
}

export async function loadProjectSceneModel({
  domain,
  projectUuid,
  sceneUuid,
  signal,
}: LoadProjectSceneModelParams): Promise<SceneModel> {
  const projectModel = getProjectModel();
  const project =
    findLoadedProject(domain, projectUuid) ??
    (await listProjectByUuid(domain, projectUuid, signal));

  await ensureProjectLoaded(domain, project, signal);
  projectModel.setRoot(domain, project);

  const sceneProject = findProjectModelInProject(project, projectUuid);
  const scene = sceneProject
    ? findSceneModelInProject(sceneProject, sceneUuid)
    : undefined;
  if (!scene) {
    throw new Error(
      `Scene "${sceneUuid}" was not found in project "${project.simple_name}".`
    );
  }

  return scene;
}
