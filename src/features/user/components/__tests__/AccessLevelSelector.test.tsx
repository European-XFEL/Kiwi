import { fireEvent, render, screen } from '@testing-library/react';
import { AccessLevel } from '@/karabo/data/api';
import AccessLevelSelector from '../AccessLevelSelector';

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

describe('AccessLevelSelector', () => {
  it('is locked when the level cannot change', () => {
    render(
      <AccessLevelSelector
        accessLevel={AccessLevel.OBSERVER}
        canChangeLevel={false}
        canChangeTo={() => false}
        onChange={jest.fn()}
      />
    );

    expect(screen.getByTestId('access-level-locked')).toBeTruthy();
    expect(screen.queryByTestId('access-level-trigger')).toBeNull();
  });

  it('offers the reachable levels and reports the choice to its owner', () => {
    const onChange = jest.fn();
    render(
      <AccessLevelSelector
        accessLevel={AccessLevel.OBSERVER}
        canChangeLevel
        canChangeTo={(level) => level !== AccessLevel.EXPERT}
        onChange={onChange}
      />
    );

    expect(
      screen.getByTestId('access-level-option-expert').hasAttribute('disabled')
    ).toBe(true);
    fireEvent.click(screen.getByTestId('access-level-option-operator'));

    expect(onChange).toHaveBeenCalledWith(AccessLevel.OPERATOR);
  });
});
