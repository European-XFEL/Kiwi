import { decodeTopicServerMap } from '../utils';

describe('decodeTopicServerMap', () => {
  it('decodes the topic server mapping format used in .env.production', () => {
    expect(
      decodeTopicServerMap(
        'SA1:sa1-br-sys-con-gui3:8090;SA2:sa2-br-sys-con-gui3:8090;SA3:localhost:44448'
      )
    ).toEqual({
      SA1: { hostname: 'sa1-br-sys-con-gui3', hostport: 8090 },
      SA2: { hostname: 'sa2-br-sys-con-gui3', hostport: 8090 },
      SA3: { hostname: 'localhost', hostport: 44448 },
    });
  });

  it('returns undefined for missing or empty input', () => {
    expect(decodeTopicServerMap()).toBeUndefined();
    expect(decodeTopicServerMap('')).toBeUndefined();
  });

  it('ignores malformed entries while decoding valid topic mappings', () => {
    expect(
      decodeTopicServerMap(
        'SA1:sa1-br-sys-con-gui3:8090;invalid-entry;SA2:sa2-br-sys-con-gui3:8090:extra;SA3:localhost:44448'
      )
    ).toEqual({
      SA1: { hostname: 'sa1-br-sys-con-gui3', hostport: 8090 },
      SA3: { hostname: 'localhost', hostport: 44448 },
    });
  });
});
