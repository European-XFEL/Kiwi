import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import FitModeSelect from '../FitModeSelect';
import { useActiveSceneStore } from '../../hooks/useActiveScene';

jest.mock('@/components/api', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const actual =
    jest.requireActual<typeof import('@/components/api')>('@/components/api');

  const SelectContext = React.createContext<{
    onValueChange?: (value: string) => void;
    value?: string;
  }>({});

  return {
    ...actual,
    Select: ({
      children,
      onValueChange,
      value,
    }: {
      children: ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
    }) =>
      React.createElement(
        SelectContext.Provider,
        { value: { onValueChange, value } },
        React.createElement(
          'div',
          { 'data-testid': 'fit-mode-select' },
          children
        )
      ),
    SelectTrigger: ({
      children,
      ...props
    }: {
      children: ReactNode;
      [key: string]: unknown;
    }) => React.createElement('button', props, children),
    SelectValue: () => {
      const context = React.useContext(SelectContext);
      return React.createElement('span', null, context.value);
    },
    SelectContent: ({ children }: { children: ReactNode }) =>
      React.createElement('div', null, children),
    SelectItem: ({
      children,
      value,
    }: {
      children: ReactNode;
      value: string;
    }) => {
      const context = React.useContext(SelectContext);
      return React.createElement(
        'button',
        { type: 'button', onClick: () => context.onValueChange?.(value) },
        children
      );
    },
  };
});

describe('FitModeSelect', () => {
  beforeEach(() => {
    useActiveSceneStore.setState({
      loadedSceneRef: undefined,
      fitMode: 'fit-page',
    });
  });

  it('does not render without a loaded scene', () => {
    render(<FitModeSelect />);

    expect(screen.queryByTestId('fit-mode-select')).not.toBeInTheDocument();
  });

  it('updates the fit mode through the shared select control', () => {
    useActiveSceneStore.setState({
      loadedSceneRef: {
        domain: 'MID',
        projectUuid: 'project-1',
        projectName: 'project',
        name: 'scene',
        uuid: 'scene-1',
        width: 800,
        height: 600,
      },
      fitMode: 'fit-page',
    });

    render(<FitModeSelect />);

    fireEvent.click(screen.getByRole('button', { name: 'Fit to Width' }));

    expect(useActiveSceneStore.getState().fitMode).toBe('fit-width');
  });

  it('uses the native select while fullscreen so browser popup handling is preserved', () => {
    useActiveSceneStore.setState({
      loadedSceneRef: {
        domain: 'MID',
        projectUuid: 'project-1',
        projectName: 'project',
        name: 'scene',
        uuid: 'scene-1',
        width: 800,
        height: 600,
      },
      fitMode: 'fit-page',
    });

    render(<FitModeSelect isFullscreen />);

    const select = screen.getByRole('combobox', { name: 'Fit mode' });
    fireEvent.change(select, { target: { value: 'fit-height' } });

    expect(useActiveSceneStore.getState().fitMode).toBe('fit-height');
    expect(screen.queryByTestId('fit-mode-select')).not.toBeInTheDocument();
  });
});
