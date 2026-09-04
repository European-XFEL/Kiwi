import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AccessLevel } from '@/karabo/data/enums';
import { DisplayTrendGraphModel } from '@/karabo/common/api';
import { ProxyStatus } from '@/lib/binding/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import DisplayTrendGraph from '../DisplayTrendGraph';

jest.mock('react-plotly.js', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    __esModule: true,
    default: ({ revision }: { revision?: number }) =>
      ReactActual.createElement('div', {
        'data-testid': 'trend-plot',
        'data-revision': revision,
      }),
  };
});

jest.mock('../../../hooks/useDisplayTrendGraph', () => ({
  useDisplayTrendGraph: () => ({
    series: [
      {
        timestamps: new Float64Array([1]),
        values: new Float64Array([42]),
      },
    ],
    isOffline: false,
  }),
}));

const makeContext = (): ControllerContainerContext => {
  const proxy = {
    root: { deviceId: 'DEVICE', status: ProxyStatus.ONLINE },
    path: 'value',
    binding: { displayedName: 'Value' },
  } as unknown as ControllerContainerContext['proxies'][number];

  return {
    proxy,
    proxies: [proxy],
    userAccessLevel: AccessLevel.OBSERVER,
  };
};

describe('DisplayTrendGraph', () => {
  it('resets the plot view from the right-side toolbar', () => {
    const model = new DisplayTrendGraphModel();
    model.keys = ['DEVICE.value'];

    render(<DisplayTrendGraph model={model} ctx={makeContext()} />);

    const plot = screen.getByTestId('trend-plot');
    const toolbar = screen.getByRole('toolbar', {
      name: 'Trend graph controls',
    });

    expect(toolbar.previousElementSibling).toContainElement(plot);
    expect(toolbar.parentElement).toHaveClass('border-2');
    expect(toolbar).toHaveClass('bg-transparent');
    expect(toolbar).not.toHaveClass('border-l');
    expect(plot).toHaveAttribute('data-revision', '0');

    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));

    expect(plot).toHaveAttribute('data-revision', '1');
  });
});
