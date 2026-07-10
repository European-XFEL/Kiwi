import { getChildObjectId, getSceneObjectDomId } from '../objectId';

describe('getChildObjectId', () => {
  it('derives child ids from the parent object id and child index', () => {
    expect(getChildObjectId('scene', 0)).toBe('scene.0');
    expect(getChildObjectId('scene.0', 1)).toBe('scene.0.1');
    expect(getChildObjectId('scene.0.1', 2)).toBe('scene.0.1.2');
  });
});

describe('getSceneObjectDomId', () => {
  it('builds a semantic DOM id from prefix, React id, and object id', () => {
    expect(getSceneObjectDomId('BoxLayout-child', ':r0:', 'scene:uuid.0')).toBe(
      'BoxLayout-child-r0-scene-uuid-0'
    );
  });
});
