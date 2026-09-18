import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import AppRouter from '../AppRouter';
import { appRoutes } from '../../routes';

jest.mock('../../AppBody', () => ({
  __esModule: true,
  default: jest.requireActual('react-router-dom').Outlet,
}));
jest.mock('@/features/workspace/api', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return { WorkspacePage: () => React.createElement('div', null, 'Workspace') };
});

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}

it('sends the retired scene route through the normal fallback without forwarding its query', async () => {
  render(
    <MemoryRouter
      initialEntries={[
        '/scene?host=old-host&port=44444&domain=CONTROLS&projectUuid=old-project&sceneUuid=old-scene',
      ]}
    >
      <AppRouter
        routes={appRoutes}
        indexRedirect="main"
        fallbackRedirect="main"
      />
      <LocationProbe />
    </MemoryRouter>
  );

  await waitFor(() =>
    expect(screen.getByTestId('location').textContent).toBe('/main')
  );
  expect(screen.getByText('Workspace')).toBeInTheDocument();
});
