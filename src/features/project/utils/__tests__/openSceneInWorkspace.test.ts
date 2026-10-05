import { SceneModel } from '@/karabo/common/scenemodel/api';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import { openSceneInWorkspace } from '../openSceneInWorkspace';
import { getLogger } from '@/lib/singletons/api';
import { Logger } from '@/lib/singletons/Logger';
import { SingletonContext } from '@/testing';

jest.mock('@/lib/events', () => ({
  KaraboEvent: {
    OpenScene: 'OpenScene',
  },
  broadcast_event: jest.fn(),
}));

describe('openSceneInWorkspace', () => {
  let context: SingletonContext;

  beforeEach(() => {
    context = new SingletonContext({ logger: new Logger() });
  });

  afterEach(() => {
    context.restore();
    jest.restoreAllMocks();
  });

  it('opens the scene through the event bus with the model only', () => {
    jest.spyOn(console, 'info').mockImplementation(() => {});
    const unsubscribe = getLogger().subscribe(jest.fn());
    const model = new SceneModel({
      uuid: 'scene-123',
      simple_name: 'beckhoff',
    });

    openSceneInWorkspace({ model });

    expect(getLogger().getSnapshot()).toEqual([
      expect.objectContaining({
        level: 'info',
        message: 'Loading project scene "beckhoff" (scene-123)',
      }),
    ]);
    unsubscribe();

    expect(broadcast_event).toHaveBeenCalledWith(KaraboEvent.OpenScene, {
      model,
    });

    const [, payload] = (broadcast_event as jest.Mock).mock.calls[0];
    expect(payload).toEqual({ model });
  });
});
