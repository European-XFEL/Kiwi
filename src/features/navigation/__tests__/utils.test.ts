import { sceneParamsFromURL, scenePathFromParams } from '../utils';

it('round-trips a bookmark using the scene-owning project', () => {
  const params = {
    host: 'host-a',
    port: 44444,
    domain: 'CONTROLS',
    projectUuid: 'detector-project',
    sceneUuid: 'detector-scene',
  };

  const path = scenePathFromParams(params);
  const query = path.slice(path.indexOf('?'));

  expect(new URLSearchParams(query).has('rootProjectUuid')).toBe(false);
  expect(sceneParamsFromURL(query)).toEqual(params);
});

it('ignores obsolete root context in an existing bookmark', () => {
  const query =
    '?host=host-a&port=44444&domain=CONTROLS&projectUuid=motors&sceneUuid=motor-scene&rootProjectUuid=deleted-parent';

  expect(sceneParamsFromURL(query)).toEqual({
    host: 'host-a',
    port: 44444,
    domain: 'CONTROLS',
    projectUuid: 'motors',
    sceneUuid: 'motor-scene',
  });
});
