import { LabelModel, SceneModel } from '../../scenemodel/api';
import { readProjectItemModel } from '../io';

function sceneProjectItemXml(childXml: string): string {
  return [
    '<xml item_type="scene" uuid="scene-1" simple_name="Main Scene" date="2026-07-05">',
    childXml,
    '</xml>',
  ].join('');
}

describe('readProjectItemModel', () => {
  it('reads scene metadata from the wrapper and scene data from the child XML', () => {
    const existing = new SceneModel();
    const sceneXml = `
      <svg:svg
          xmlns:krb="http://karabo.eu/scene"
          xmlns:svg="http://www.w3.org/2000/svg"
          krb:version="2"
          krb:uuid="scene-child-uuid"
          width="640"
          height="480"
      >
        <svg:rect
            krb:class="Label"
            x="1"
            y="2"
            width="30"
            height="20"
            krb:text="Beamline"
        />
      </svg:svg>
    `;

    const result = readProjectItemModel(
      sceneProjectItemXml(sceneXml),
      existing
    );

    expect(result).toBe(existing);
    expect(result).toBeInstanceOf(SceneModel);
    expect(result.initialized).toBe(true);
    expect(result.uuid).toBe('scene-1');
    expect(result.simple_name).toBe('Main Scene');
    expect(result.date).toBe('2026-07-05');
    expect(result.width).toBe(640);
    expect(result.height).toBe(480);
    expect(result.file_format_version).toBe(2);
    expect(result.children).toHaveLength(1);
    expect(result.children[0]).toBeInstanceOf(LabelModel);
    expect((result.children[0] as LabelModel).text).toBe('Beamline');
  });

  it('unwraps the child XML before parsing parent metadata', () => {
    const existing = new SceneModel();
    const sceneXml = `
      <svg:svg
          xmlns:krb="http://karabo.eu/scene"
          xmlns:svg="http://www.w3.org/2000/svg"
          width="10"
          height="20"
      >
        <svg:rect
            krb:class="Label"
            x="0"
            y="0"
            width="1"
            height="1"
            krb:text="Child"
        />
      </svg:svg>
    `;

    const result = readProjectItemModel(
      sceneProjectItemXml(sceneXml),
      existing
    );

    expect(result.simple_name).toBe('Main Scene');
    expect(result.children).toHaveLength(1);
    expect((result.children[0] as LabelModel).text).toBe('Child');
  });

  it('rejects XML without a valid project item wrapper', () => {
    expect(() =>
      readProjectItemModel(
        '<xml item_type="scene"><svg:svg xmlns:svg="http://www.w3.org/2000/svg" />',
        new SceneModel()
      )
    ).toThrow('Invalid XML wrapper');
  });
});
