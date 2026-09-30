import { render } from '@testing-library/react';
import { AccessLevel } from '@/karabo/data/api';
import type { RootProjectBrowser } from '@/features/project/api';
import WorkspaceHeader from '../WorkspaceHeader';
import { createDefaultWorkspaceModel } from '../../utils';
import type { WorkspaceRuntime } from '../../types';

const mockNavBar = jest.fn<null, [unknown]>(() => null);

jest.mock('@/features/navigation', () => ({
  NavBar: (props: unknown) => mockNavBar(props),
}));

const browser = { rootProject: undefined } as RootProjectBrowser;

function renderHeader(
  runtime: WorkspaceRuntime,
  header = createDefaultWorkspaceModel().header
) {
  render(<WorkspaceHeader header={header} runtime={runtime} />);
}

describe('WorkspaceHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hands every piece of state from the runtime down to the NavBar', () => {
    const onGoToHomeTab = jest.fn();
    const activity = { lastActivity: 1, activityLevel: 'active' as const };
    const access = {
      accessLevel: AccessLevel.EXPERT,
      canChangeLevel: true,
      canChangeTo: jest.fn(),
      onChange: jest.fn(),
    };
    const user = { loggedUser: 'Ada', topic: 'TOPIC_A', onLogout: jest.fn() };

    renderHeader({
      connected: true,
      sceneTabOpen: true,
      onGoToHomeTab,
      browser,
      activity,
      access,
      user,
    });

    expect(mockNavBar).toHaveBeenCalledWith({
      browser,
      sceneOpen: true,
      onGoHome: onGoToHomeTab,
      compact: true,
      projectLoading: false,
      activity,
      access,
      user,
    });
  });

  it('tells the NavBar that no scene is open', () => {
    renderHeader({ connected: true, browser });

    expect(mockNavBar).toHaveBeenCalledWith(
      expect.objectContaining({ sceneOpen: false })
    );
  });

  it('tells the NavBar while a project loads', () => {
    renderHeader({ connected: true, browser, projectLoading: true });

    expect(mockNavBar).toHaveBeenCalledWith(
      expect.objectContaining({ projectLoading: true })
    );
  });

  it('renders nothing when the workspace model hides the header', () => {
    const header = { ...createDefaultWorkspaceModel().header, visible: false };

    renderHeader({ connected: true, browser }, header);

    expect(mockNavBar).not.toHaveBeenCalled();
  });
});
