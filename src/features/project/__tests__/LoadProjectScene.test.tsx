import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ButtonHTMLAttributes, SVGProps } from 'react';
import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import type { SelectProjectSceneDialogProps } from '../types/project.types';
import LoadProjectScene from '../LoadProjectScene';
import { loadRootProjectFromDialogSelection } from '../utils/rootProjectActions';

let dialogProps: SelectProjectSceneDialogProps | undefined;

jest.mock('@/components/api', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) =>
      React.createElement('button', props, children),
  };
});

jest.mock('lucide-react', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    FolderOpen: (props: SVGProps<SVGSVGElement>) =>
      React.createElement('svg', props),
  };
});

jest.mock('../SelectProjectSceneDialog', () => ({
  __esModule: true,
  default: (props: SelectProjectSceneDialogProps) => {
    dialogProps = props;
    return null;
  },
}));

jest.mock('../utils/rootProjectActions', () => ({
  loadRootProjectFromDialogSelection: jest.fn(() => ({
    controller: new AbortController(),
    promise: Promise.resolve(),
    abort: jest.fn(),
  })),
}));

describe('LoadProjectScene', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dialogProps = undefined;
  });

  it('closes the dialog and delegates its selection to the root-loading action', async () => {
    const project = new ProjectModel({ uuid: 'motors', simple_name: 'Motors' });
    const scene = new SceneModel({
      uuid: 'motor-scene',
      simple_name: 'Motor Scene',
    });
    render(<LoadProjectScene />);

    fireEvent.click(screen.getByRole('button', { name: 'Load Project Scene' }));
    expect(dialogProps?.open).toBe(true);
    await act(async () => {
      dialogProps?.onSceneSelected('CONTROLS', project, scene);
    });

    expect(dialogProps?.open).toBe(false);
    expect(loadRootProjectFromDialogSelection).toHaveBeenCalledWith(
      'CONTROLS',
      project,
      scene
    );
  });

  it('closes a cancelled dialog without loading a root', () => {
    render(<LoadProjectScene />);
    fireEvent.click(screen.getByRole('button', { name: 'Load Project Scene' }));

    act(() => dialogProps?.onCancel());

    expect(dialogProps?.open).toBe(false);
    expect(loadRootProjectFromDialogSelection).not.toHaveBeenCalled();
  });
});
