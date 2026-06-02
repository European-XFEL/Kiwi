import { getScrollableAlignment } from '../sceneLayout';

describe('getScrollableAlignment', () => {
  it('centers actual mode like fit-page', () => {
    expect(getScrollableAlignment('actual')).toEqual({
      justifyItems: 'center',
      alignItems: 'center',
    });
  });
});
