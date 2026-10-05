import { fireEvent, render, screen } from '@testing-library/react';
import { ChartLegend } from '../components/ChartLegend';
import { TRACE_COLORS } from '../constants';

test.each([[], ['DEV.a']])(
  'omits legends with fewer than two curves (%p)',
  (...keys) => {
    render(
      <ChartLegend
        keys={keys}
        view={{ hiddenCurves: new Set(), toggleCurve: jest.fn() }}
      />
    );
    expect(screen.queryByLabelText('Graph legend')).not.toBeInTheDocument();
  }
);

test('preserves labels, palette, accessibility and toggling', () => {
  const keys = Array.from({ length: 7 }, (_, index) => `DEV.value${index}`);
  const toggleCurve = jest.fn();
  render(
    <ChartLegend
      keys={keys}
      view={{ hiddenCurves: new Set([keys[1]]), toggleCurve }}
    />
  );
  keys.forEach((key, index) => {
    const button = screen.getByRole('button', { name: key });
    expect(button).toHaveAttribute(
      'aria-pressed',
      index === 1 ? 'false' : 'true'
    );
    expect(button).toHaveStyle({ opacity: index === 1 ? '0.4' : '1' });
    expect(button.firstElementChild).toHaveStyle({
      backgroundColor: TRACE_COLORS[index % TRACE_COLORS.length],
    });
  });
  fireEvent.click(screen.getByRole('button', { name: keys[1] }));
  expect(toggleCurve).toHaveBeenCalledWith(keys[1]);
});
