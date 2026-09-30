import { fireEvent, render, screen } from '@testing-library/react';
import UserProfile from '../UserProfile';

jest.mock('@/components/api', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const Pass = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children);

  return {
    ...jest.requireActual('@/components/api'),
    DropdownMenu: Pass,
    DropdownMenuTrigger: Pass,
    DropdownMenuContent: Pass,
    DropdownMenuLabel: Pass,
    DropdownMenuSeparator: () => null,
    DropdownMenuItem: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
      React.createElement('button', props, children),
  };
});

describe('UserProfile', () => {
  it('shows the user it is given with their initials', () => {
    render(<UserProfile loggedUser="Ada Lovelace" onLogout={jest.fn()} />);

    expect(screen.getByText('AL')).toBeTruthy();
    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0);
  });

  it('falls back to the topic when no user name is set', () => {
    render(<UserProfile loggedUser="" topic="TOPIC_A" onLogout={jest.fn()} />);

    expect(screen.getAllByText('TOPIC_A').length).toBeGreaterThan(0);
  });

  it('reports Logout to its owner', () => {
    const onLogout = jest.fn();
    render(<UserProfile loggedUser="Ada" onLogout={onLogout} />);

    fireEvent.click(screen.getByTestId('logout-button'));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
