import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectModel } from '@/karabo/common/project/api';
import ProjectsTable from '../ProjectTable';

const projects = [
  new ProjectModel({ uuid: 'project-a', simple_name: 'Alignment' }),
  new ProjectModel({ uuid: 'project-b', simple_name: 'Beamline' }),
];

describe('ProjectsTable', () => {
  it('reports the clicked project while selection is available', async () => {
    const user = userEvent.setup();
    const onProjectClick = jest.fn();

    render(
      <ProjectsTable projects={projects} onProjectClick={onProjectClick} />
    );
    await user.click(screen.getByText('Beamline'));

    expect(onProjectClick).toHaveBeenCalledTimes(1);
    expect(onProjectClick.mock.calls[0][0].uuid).toBe('project-b');
  });

  it('ignores clicks while selection is disabled', async () => {
    const user = userEvent.setup();
    const onProjectClick = jest.fn();

    render(
      <ProjectsTable
        projects={projects}
        selectedProject={projects[0]}
        onProjectClick={onProjectClick}
        selectionDisabled
      />
    );
    await user.click(screen.getByText('Beamline'));

    expect(onProjectClick).not.toHaveBeenCalled();
  });

  it('marks its rows as disabled for assistive technology', () => {
    const { rerender } = render(
      <ProjectsTable projects={projects} onProjectClick={jest.fn()} />
    );
    expect(screen.getByText('Alignment').closest('tr')).not.toHaveAttribute(
      'aria-disabled'
    );

    rerender(
      <ProjectsTable
        projects={projects}
        onProjectClick={jest.fn()}
        selectionDisabled
      />
    );
    expect(screen.getByText('Alignment').closest('tr')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('lets keyboard users choose a project', async () => {
    const user = userEvent.setup();
    const onProjectClick = jest.fn();

    render(
      <ProjectsTable projects={projects} onProjectClick={onProjectClick} />
    );
    await user.tab();
    await user.tab();
    await user.keyboard('{Enter}');

    expect(onProjectClick).toHaveBeenCalledTimes(1);
    expect(onProjectClick.mock.calls[0][0].uuid).toBe('project-b');
  });

  it('keeps disabled projects out of the tab order', async () => {
    const user = userEvent.setup();

    render(
      <ProjectsTable
        projects={projects}
        onProjectClick={jest.fn()}
        selectionDisabled
      />
    );
    await user.tab();

    expect(document.body).toHaveFocus();
  });

  // Filtering is local to the already loaded list and sends no request, so it
  // stays usable while the dialog waits.
  it('keeps filtering available while selection is disabled', async () => {
    const user = userEvent.setup();
    const onQueryChange = jest.fn();

    render(
      <ProjectsTable
        projects={projects}
        onProjectClick={jest.fn()}
        query=""
        onQueryChange={onQueryChange}
        selectionDisabled
      />
    );
    await user.type(screen.getByPlaceholderText('Filter projects...'), 'B');

    expect(onQueryChange).toHaveBeenCalled();
  });
});
