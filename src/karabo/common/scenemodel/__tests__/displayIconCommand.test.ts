import { DisplayIconCommandModel, readScene } from '@/karabo/common/api';

describe('DisplayIconCommand scene reader', () => {
  test.each([
    ['krb:icon_name="Start"', 'Start'],
    ['', ''],
  ])('reads icon attribute %s', (attribute, iconName) => {
    const scene = readScene(`
      <svg:svg xmlns:krb="http://karabo.eu/scene" xmlns:svg="http://www.w3.org/2000/svg" krb:version="2" width="200" height="100">
        <svg:rect krb:class="DisplayComponent" krb:widget="DisplayIconCommand"
          x="12" y="23" width="40" height="30" krb:keys="DEV.start, OTHER.stop" ${attribute} />
      </svg:svg>
    `);
    expect(scene.children).toHaveLength(1);
    expect(scene.children[0]).toBeInstanceOf(DisplayIconCommandModel);
    expect(scene.children[0]).toMatchObject({
      klass: 'DisplayIconCommand',
      parent_component: 'DisplayComponent',
      x: 12,
      y: 23,
      width: 40,
      height: 30,
      keys: ['DEV.start', 'OTHER.stop'],
      icon_name: iconName,
    });
  });
});
