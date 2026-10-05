import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChartPlot } from '../components/ChartPlot';
import { ChartLegend } from '../components/ChartLegend';

test.each(['', 'Title'])(
  'positions the legend beyond the Y gutter with title %p',
  (title) => {
    const toggleCurve = jest.fn();
    const props = {
      view: {
        containerRef: React.createRef<HTMLDivElement>(),
        selectionRef: React.createRef<HTMLDivElement>(),
        yAxisWidth: 68,
      },
      testId: 'trend-chart' as const,
      title,
      legend: (
        <ChartLegend
          keys={['DEV.a', 'DEV.b']}
          view={{ hiddenCurves: new Set(), toggleCurve }}
        />
      ),
    };
    const view = render(<ChartPlot {...props} />);
    const legend = screen.getByLabelText('Graph legend');
    expect(legend.parentElement).toHaveStyle({
      top: title ? '26px' : '10px',
      left: '76px',
    });
    // Categorical axes can change their measured width during navigation.
    view.rerender(
      <ChartPlot {...props} view={{ ...props.view, yAxisWidth: 120 }} />
    );
    expect(legend.parentElement).toHaveStyle({ left: '128px' });
    fireEvent.click(screen.getByRole('button', { name: 'DEV.b' }));
    expect(toggleCurve).toHaveBeenCalledWith('DEV.b');
  }
);
