import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ButtonHTMLAttributes, SVGProps } from 'react';
import { ProjectModel } from '@/karabo/common/project/api';
import type { SelectProjectSceneDialogProps } from '../types/project.types';
import LoadProjectScene from '../LoadProjectScene';
import { loadRootProject } from '../utils/rootProjectActions';

const mockShowProjects = jest.fn();
const mockPromise = Promise.resolve();
jest.mock('@/lib/singletons/api', () => ({
  getPanelWrangler: () => ({ showProjects: mockShowProjects }),
}));

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
  loadRootProject: jest.fn(() => ({
    controller: new AbortController(),
    promise: mockPromise,
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
    render(<LoadProjectScene />);

    fireEvent.click(screen.getByRole('button', { name: 'Load Project' }));
    expect(dialogProps?.open).toBe(true);
    await act(async () => {
      dialogProps?.onProjectSelected('CONTROLS', project);
    });

    expect(dialogProps?.open).toBe(false);
    expect(mockShowProjects).toHaveBeenCalledTimes(1);
    expect(loadRootProject).toHaveBeenCalledWith({
      domain: 'CONTROLS',
      projectUuid: project.uuid,
    });
  });

  it('reveals Projects only after the complete load succeeds', async () => {
    let resolve: (() => void) | undefined;
    jest.mocked(loadRootProject).mockReturnValueOnce({
      controller: new AbortController(),
      abort: jest.fn(),
      promise: new Promise<void>((done) => {
        resolve = done;
      }),
    });
    render(<LoadProjectScene />);
    act(() =>
      dialogProps?.onProjectSelected(
        'CONTROLS',
        new ProjectModel({ uuid: 'root' })
      )
    );
    expect(mockShowProjects).not.toHaveBeenCalled();
    await act(async () => resolve!());
    expect(mockShowProjects).toHaveBeenCalledTimes(1);
  });

  it('does not reveal Projects when the load fails', async () => {
    jest.mocked(loadRootProject).mockReturnValueOnce({
      controller: new AbortController(),
      abort: jest.fn(),
      promise: Promise.reject(new Error('Load failed')),
    });
    render(<LoadProjectScene />);
    await act(async () =>
      dialogProps?.onProjectSelected(
        'CONTROLS',
        new ProjectModel({ uuid: 'root' })
      )
    );
    expect(mockShowProjects).not.toHaveBeenCalled();
  });

  it('closes a cancelled dialog without loading a root', () => {
    render(<LoadProjectScene />);
    fireEvent.click(screen.getByRole('button', { name: 'Load Project' }));

    act(() => dialogProps?.onCancel());

    expect(dialogProps?.open).toBe(false);
    expect(loadRootProject).not.toHaveBeenCalled();
  });
});
