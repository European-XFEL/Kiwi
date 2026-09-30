import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AccessLevel } from '@/karabo/data/api';
import type { useRootProject } from '@/features/project/api';

const mockProjectBrowser = jest.fn<React.ReactElement, [unknown]>(() =>
  React.createElement('div', { 'data-testid': 'project-browser' })
);
const mockActiveIndicator = jest.fn<null, [unknown]>(() => null);
const mockAccessLevelSelector = jest.fn<null, [unknown]>(() => null);
const mockUserProfile = jest.fn<null, [unknown]>(() => null);

jest.mock('@/app/api', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    KiwiHeader: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) =>
      ReactActual.createElement(
        'header',
        { 'data-testid': 'app-header', ...props },
        children
      ),
  };
});

jest.mock('@/features/project/api', () => ({
  LoadProjectScene: () => null,
  ProjectBrowser: ({ browser }: { browser: unknown }) =>
    mockProjectBrowser(browser),
}));

jest.mock('@/features/user', () => ({
  AccessLevelSelector: (props: unknown) => mockAccessLevelSelector(props),
  UserProfile: (props: unknown) => mockUserProfile(props),
}));

jest.mock('@/features/status', () => ({
  ActiveIndicator: (props: unknown) => mockActiveIndicator(props),
}));

import { NavBar } from '../NavBar';

const browser = { rootProject: {} } as ReturnType<typeof useRootProject>;
const noProject = { rootProject: undefined } as ReturnType<
  typeof useRootProject
>;
const activity = { lastActivity: 1, activityLevel: 'moderate' as const };
const access = {
  accessLevel: AccessLevel.OPERATOR,
  canChangeLevel: true,
  canChangeTo: () => true,
  onChange: jest.fn(),
};
const user = { loggedUser: 'Ada', topic: 'TOPIC_A', onLogout: jest.fn() };

function renderNavBar(
  props: Partial<React.ComponentProps<typeof NavBar>> = {}
) {
  render(
    <NavBar
      browser={browser}
      sceneOpen
      onGoHome={jest.fn()}
      compact
      projectLoading={false}
      activity={activity}
      access={access}
      user={user}
      {...props}
    />
  );
}

describe('NavBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the Home button and the project browser it is given while a scene is open', () => {
    renderNavBar();

    expect(screen.getByTestId('workspace-home-button')).toBeInTheDocument();
    expect(mockProjectBrowser).toHaveBeenCalledWith(browser);
    expect(screen.queryByText('No project loaded')).toBeNull();
  });

  it('shows the loaded project without a Home button while no scene tab is open', () => {
    renderNavBar({ sceneOpen: false });

    expect(mockProjectBrowser).toHaveBeenCalledWith(browser);
    expect(screen.queryByTestId('workspace-home-button')).toBeNull();
  });

  it('says no project is loaded when there is none', () => {
    renderNavBar({ sceneOpen: false, browser: noProject });

    expect(screen.getByText('No project loaded')).toBeInTheDocument();
    expect(mockProjectBrowser).not.toHaveBeenCalled();
  });

  it('shows only the Home button for a device scene without a project', () => {
    renderNavBar({ browser: noProject });

    expect(screen.getByTestId('workspace-home-button')).toBeInTheDocument();
    expect(mockProjectBrowser).not.toHaveBeenCalled();
  });

  it('reports a Home click to its owner', () => {
    const onGoHome = jest.fn();
    renderNavBar({ onGoHome });

    fireEvent.click(screen.getByTestId('workspace-home-button'));

    expect(onGoHome).toHaveBeenCalledTimes(1);
  });

  it('marks the header inert while a project loads', () => {
    renderNavBar({ projectLoading: true });

    expect(screen.getByTestId('app-header')).toHaveAttribute('inert');
    expect(screen.getByTestId('app-header')).toHaveAttribute(
      'aria-busy',
      'true'
    );
  });

  it('hands each widget its own state', () => {
    renderNavBar();

    expect(mockActiveIndicator).toHaveBeenCalledWith(activity);
    expect(mockAccessLevelSelector).toHaveBeenCalledWith(
      expect.objectContaining(access)
    );
    expect(mockUserProfile).toHaveBeenCalledWith(expect.objectContaining(user));
  });

  it('leaves out the user widgets without a session', () => {
    renderNavBar({ access: undefined, user: undefined });

    expect(mockAccessLevelSelector).not.toHaveBeenCalled();
    expect(mockUserProfile).not.toHaveBeenCalled();
  });
});
