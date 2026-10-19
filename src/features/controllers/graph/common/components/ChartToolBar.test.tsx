import { fireEvent, render, screen } from '@testing-library/react';
import { ChartToolBar } from './ChartToolBar';

test('exposes navigation and places extension tools after reset', () => {
  const selectTool = jest.fn();
  const reset = jest.fn();
  render(
    <ChartToolBar tool="pointer" selectTool={selectTool} reset={reset}>
      <button>Future image tool</button>
    </ChartToolBar>
  );
  expect(screen.getByRole('button', { name: 'Pointer' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Zoom' }));
  expect(selectTool).toHaveBeenCalledWith('zoom');
  fireEvent.click(screen.getByRole('button', { name: 'Move' }));
  expect(selectTool).toHaveBeenCalledWith('pan');
  fireEvent.click(screen.getByRole('button', { name: 'Reset View' }));
  expect(reset).toHaveBeenCalledTimes(1);
  expect(
    screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? button.textContent)
  ).toEqual(['Pointer', 'Zoom', 'Move', 'Reset View', 'Future image tool']);
});
