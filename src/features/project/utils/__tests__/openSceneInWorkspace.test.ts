import { Hash } from '@/karabo/data/hash';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import { openSceneInWorkspace } from '../openSceneInWorkspace';

jest.mock('@/lib/events', () => ({
  KaraboEvent: {
    OpenScene: 'OpenScene',
  },
  broadcast_event: jest.fn(),
}));

describe('openSceneInWorkspace', () => {
  it('opens the scene through the event bus', () => {
    openSceneInWorkspace({
      domain: 'CONTROLS',
      projectName: 'David_test',
      uuid: 'scene-123',
      name: 'beckhoff',
    });

    expect(broadcast_event).toHaveBeenCalledWith(
      KaraboEvent.OpenScene,
      expect.any(Hash)
    );

    const [, hash] = (broadcast_event as jest.Mock).mock.calls[0];
    expect(hash.getValue('uuid')).toBe('scene-123');
    expect(hash.getValue('domain')).toBe('CONTROLS');
    expect(hash.getValue('project')).toBe('David_test');
    expect(hash.getValue('name')).toBe('beckhoff');
  });
});
