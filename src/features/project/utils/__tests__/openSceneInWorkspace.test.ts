import { SceneModel } from '@/karabo/common/scenemodel/api';
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
  it('opens the scene through the event bus with the model only', () => {
    const model = new SceneModel({
      uuid: 'scene-123',
      simple_name: 'beckhoff',
    });

    openSceneInWorkspace({ model });

    expect(broadcast_event).toHaveBeenCalledWith(
      KaraboEvent.OpenScene,
      expect.any(Hash)
    );

    const [, hash] = (broadcast_event as jest.Mock).mock.calls[0];
    expect(hash.getValue('model')).toBe(model);
    expect(hash.has('uuid')).toBe(false);
    expect(hash.has('domain')).toBe(false);
    expect(hash.has('project')).toBe(false);
  });
});
