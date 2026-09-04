import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import LoadProjectScene from '../LoadProjectScene';
import { openSceneInWorkspace } from '../utils/openSceneInWorkspace';
import { loadProjectSceneModel } from '../utils/loadProjectSceneModel';

const mockSetRoot = jest.fn();

const mockProjectModelState: {
  root?: ProjectModel;
  setRoot: (domain: string, project: ProjectModel) => void;
} = {
  root: undefined,
  setRoot: mockSetRoot,
};

let dialogProps:
  | {
      open: boolean;
      onSceneSelected: (
        domain: string,
        project: ProjectModel,
        scene: SceneModel
      ) => void;
      onCancel: () => void;
    }
  | undefined;

jest.mock('@/components/api', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    Button: ({ children, ...props }: any) =>
      ReactActual.createElement('button', props, children),
  };
});

jest.mock('lucide-react', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    FolderOpen: (props: any) => ReactActual.createElement('svg', props),
  };
});

jest.mock('../SelectProjectSceneDialog', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    __esModule: true,
    default: (props: any) => {
      dialogProps = props;
      return ReactActual.createElement('div', {
        'data-testid': 'select-project-scene-dialog',
      });
    },
  };
});

jest.mock('../utils/openSceneInWorkspace', () => ({
  openSceneInWorkspace: jest.fn(),
}));

jest.mock('../utils/loadProjectSceneModel', () => ({
  loadProjectSceneModel: jest.fn(),
}));

jest.mock('@/lib/singletons/api', () => ({
  getProjectModel: () => mockProjectModelState,
}));

describe('LoadProjectScene', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dialogProps = undefined;
    mockProjectModelState.root = makeProject('current-project', 'Current');
  });

  it('loads a scene from another project before opening it', async () => {
    const selectedProject = makeProject('other-project', 'Other');
    const partialScene = makeScene('scene-1', 'Scene 1');
    const loadedScene = makeScene('scene-1', 'Scene 1');
    (loadProjectSceneModel as jest.Mock).mockResolvedValue(loadedScene);

    render(<LoadProjectScene />);

    fireEvent.click(screen.getByRole('button', { name: 'Load Project Scene' }));

    dialogProps?.onSceneSelected('CONTROLS', selectedProject, partialScene);

    await waitFor(() => {
      expect(loadProjectSceneModel).toHaveBeenCalledWith({
        domain: 'CONTROLS',
        projectUuid: 'other-project',
        sceneUuid: 'scene-1',
      });
      expect(openSceneInWorkspace).toHaveBeenCalledWith({ model: loadedScene });
    });
  });
});

function makeProject(uuid: string, name: string): ProjectModel {
  return new ProjectModel({
    uuid,
    simple_name: name,
    date: '2026-07-01T00:00:00',
  });
}

function makeScene(uuid: string, name: string): SceneModel {
  return new SceneModel({
    uuid,
    simple_name: name,
    width: 800,
    height: 600,
    initialized: true,
  });
}
