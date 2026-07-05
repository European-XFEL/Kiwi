import { ProjectDBCache } from '../cache';

describe('ProjectDBCache', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('stores and retrieves XML by domain and uuid', () => {
    const cache = new ProjectDBCache();
    const xml = '<xml item_type="scene" simple_name="Main" />';

    cache.store('FXE', 'scene-1', xml);

    expect(cache.retrieve('FXE', 'scene-1')).toBe(xml);
    expect(cache.retrieve('FXE', 'missing')).toBeNull();
    expect(cache.get_available_domains()).toEqual(['FXE']);
  });

  it('lists cached project metadata for one item type', () => {
    const cache = new ProjectDBCache();

    cache.store(
      'FXE',
      'project-1',
      '<xml item_type="project" simple_name="Beamline" is_trashed="True" date="2026-01-02" />'
    );
    cache.store(
      'FXE',
      'scene-1',
      '<xml item_type="scene" simple_name="Overview" date="2026-01-03" />'
    );
    cache.store(
      'SPB',
      'project-2',
      '<xml item_type="project" simple_name="Other" />'
    );
  });
});
