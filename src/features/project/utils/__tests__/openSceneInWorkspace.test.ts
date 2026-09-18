import { SceneModel } from '@/karabo/common/scenemodel/api';
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

    expect(broadcast_event).toHaveBeenCalledWith(KaraboEvent.OpenScene, {
      model,
    });

    const [, payload] = (broadcast_event as jest.Mock).mock.calls[0];
    expect(payload).toEqual({ model });
  });
});
