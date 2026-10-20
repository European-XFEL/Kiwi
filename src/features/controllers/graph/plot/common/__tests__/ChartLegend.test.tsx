import { type PlotSettings } from '@/karabo/common/api';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChartLegend } from '../components/ChartLegend';
import { TRACE_COLORS } from '../constants';

test('uses saved duplicate labels and colors while toggling the original hidden key', () => {
  const toggleCurve = jest.fn();
  const plotConfig: PlotSettings = {
    curve_options: [
      { key: 'DEV.a', name: 'Saved', pen_color: '#123456', curve_type: 1 },
      { key: 'DEV.b', name: 'Saved', pen_color: '', curve_type: 2 },
    ],
  };
  render(
    <ChartLegend
      keys={['DEV.b', 'DEV.a', 'DEV.c']}
      plotConfig={plotConfig}
      view={{ hiddenCurves: new Set(['DEV.a']), toggleCurve }}
    />
  );
  const buttons = screen.getAllByRole('button', { name: 'Saved' });
  expect(buttons[0].firstElementChild).toHaveStyle({
    backgroundColor: '#3399ff',
  });
  expect(buttons[1].firstElementChild).toHaveStyle({
    backgroundColor: '#123456',
  });
  expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');
  expect(
    screen.getByRole('button', { name: 'DEV.c' }).firstElementChild
  ).toHaveStyle({ backgroundColor: '#33a02c' });
  fireEvent.click(buttons[1]);
  expect(toggleCurve).toHaveBeenCalledWith('DEV.a');
});

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
