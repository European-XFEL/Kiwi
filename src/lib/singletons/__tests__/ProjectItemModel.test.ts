import { ProjectModel } from '@/karabo/common/project/api';
import { KaraboEvent } from '@/lib/events';
import { Mediator } from '../Mediator';
import { ProjectItemModel } from '../ProjectItemModel';

const mockMediator = new Mediator();
jest.mock('../api', () => ({ getMediator: () => mockMediator }));

describe('ProjectItemModel', () => {
  it('notifies listeners after setting or clearing the active project', () => {
    const model = new ProjectItemModel();
    const root = new ProjectModel({ uuid: 'root' });
    const listener = jest.fn(() => ({
      domain: model.domain,
      root: model.root,
    }));
    const unsubscribe = mockMediator.on(
      KaraboEvent.RootProjectChanged,
      listener
    );

    try {
      model.setRoot('CONTROLS', root);
      expect(listener).toHaveNthReturnedWith(1, { domain: 'CONTROLS', root });

      model.clearRoot();
      expect(listener).toHaveNthReturnedWith(2, {
        domain: undefined,
        root: undefined,
      });
      model.clearRoot();
      expect(listener).toHaveNthReturnedWith(3, {
        domain: undefined,
        root: undefined,
      });
      expect(listener).toHaveBeenCalledTimes(3);
    } finally {
      unsubscribe();
    }
  });

  it('announces changes when the same root object is set again', () => {
    const model = new ProjectItemModel();
    const root = new ProjectModel({ uuid: 'root' });
    const listener = jest.fn(() =>
      model.root?.subprojects.map((project) => project.uuid)
    );
    const unsubscribe = mockMediator.on(
      KaraboEvent.RootProjectChanged,
      listener
    );

    try {
      model.setRoot('CONTROLS', root);
      root.subprojects = [new ProjectModel({ uuid: 'motors' })];
      model.setRoot('CONTROLS', root);

      expect(listener).toHaveNthReturnedWith(1, []);
      expect(listener).toHaveNthReturnedWith(2, ['motors']);
      expect(listener).toHaveBeenCalledTimes(2);
    } finally {
      unsubscribe();
    }
  });
});
