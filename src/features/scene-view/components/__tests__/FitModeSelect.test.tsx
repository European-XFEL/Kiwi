import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import FitModeSelect from '../FitModeSelect';

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
  it('reflects the controlled fit mode value', () => {
    render(<FitModeSelect fitMode="fit-width" onFitModeChange={jest.fn()} />);

    expect(screen.getByText('Fit to Width')).toBeInTheDocument();
  });

  it('reports changes made through the shared select control', () => {
    const onFitModeChange = jest.fn();

    render(
      <FitModeSelect fitMode="fit-page" onFitModeChange={onFitModeChange} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fit to Width' }));

    expect(onFitModeChange).toHaveBeenCalledWith('fit-width');
  });

  it('uses the native select while fullscreen so browser popup handling is preserved', () => {
    const onFitModeChange = jest.fn();

    render(
      <FitModeSelect
        fitMode="fit-page"
        onFitModeChange={onFitModeChange}
        isFullscreen
      />
    );

    const select = screen.getByRole('combobox', { name: 'Fit mode' });
    fireEvent.change(select, { target: { value: 'fit-height' } });

    expect(onFitModeChange).toHaveBeenCalledWith('fit-height');
    expect(screen.queryByTestId('fit-mode-select')).not.toBeInTheDocument();
  });
});
