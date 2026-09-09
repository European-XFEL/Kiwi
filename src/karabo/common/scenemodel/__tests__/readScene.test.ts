/**
 * readScene integration test — read SVG from file, verify SceneModel.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ArrowPolygonModel,
  DefsModel,
  LineModel,
  PathModel,
  SceneModel,
  readScene,
  BoxLayoutModel,
  LabelModel,
  UnknownWidgetDataModel,
  DisplayCommandModel,
  DeviceSceneLinkModel,
  WebLinkModel,
} from '@/karabo/common/api';

const SAMPLE_DIR = path.resolve(__dirname, './sample_data');

describe('readScene', () => {
  const graphXml = fs.readFileSync(path.join(SAMPLE_DIR, 'graph.xml'), 'utf-8');

  it('returns a SceneModel instance', () => {
    const scene = readScene(graphXml);
    expect(scene).toBeInstanceOf(SceneModel);
  });

  it('reads scene metadata from the svg root', () => {
    const scene = readScene(graphXml);
    expect(scene.uuid).toBe('e136a103-9faa-4afb-8e93-b1e951558051');
    expect(scene.width).toBe(1052);
    expect(scene.height).toBe(800);
    expect(scene.file_format_version).toBe(2);
  });

  it('produces children from the scene', () => {
    const scene = readScene(graphXml);
    expect(scene.children.length).toBeGreaterThan(0);
  });

  it('preserves top-level XML order in scene.children', () => {
    const orderedXml = `
      <svg:svg xmlns:krb="http://karabo.eu/scene" xmlns:svg="http://www.w3.org/2000/svg" krb:version="2" krb:uuid="order-check" width="200" height="100">
        <svg:g krb:class="BoxLayout" krb:direction="0" krb:x="0" krb:y="0" krb:width="50" krb:height="20">
          <svg:rect krb:class="Label" x="0" y="0" width="50" height="20" krb:text="First" />
        </svg:g>
        <svg:g krb:class="BoxLayout" krb:direction="0" krb:x="60" krb:y="0" krb:width="50" krb:height="20">
          <svg:rect krb:class="Label" x="60" y="0" width="50" height="20" krb:text="Second" />
        </svg:g>
        <svg:g krb:class="BoxLayout" krb:direction="0" krb:x="120" krb:y="0" krb:width="50" krb:height="20">
          <svg:rect krb:class="Label" x="120" y="0" width="50" height="20" krb:text="Third" />
        </svg:g>
      </svg:svg>
    `;

    const scene = readScene(orderedXml);

    expect(scene.children).toHaveLength(3);

    const first = scene.children[0] as BoxLayoutModel;
    const second = scene.children[1] as BoxLayoutModel;
    const third = scene.children[2] as BoxLayoutModel;

    expect(first).toBeInstanceOf(BoxLayoutModel);
    expect(second).toBeInstanceOf(BoxLayoutModel);
    expect(third).toBeInstanceOf(BoxLayoutModel);

    expect((first.children[0] as LabelModel).text).toBe('First');
    expect((second.children[0] as LabelModel).text).toBe('Second');
    expect((third.children[0] as LabelModel).text).toBe('Third');
  });

  it('preserves top-level order for mixed widgets from GUI XML', () => {
    const guiXml = `
      <svg:svg
          xmlns:krb="http://karabo.eu/scene"
          xmlns:svg="http://www.w3.org/2000/svg"
          krb:version="2"
          krb:uuid="918a2987-6e54-46b8-bdba-be6cbd7b42a7"
          height="768"
          width="1024"
      ><svg:rect
              krb:class="Label"
              x="301"
              y="91"
              width="41"
              height="20"
              krb:text="item1"
              krb:font="Source Sans Pro,10,-1,5,50,0,0,0,0,0"
              krb:foreground=""
              krb:frameWidth="0"
              krb:background="transparent"
          /><svg:rect
              krb:class="DisplayComponent"
              krb:widget="DisplayCommand"
              krb:keys="Test/mdl.stop"
              x="380"
              y="220"
              width="46"
              height="24"
              krb:requires_confirmation="false"
          /><svg:g
              krb:direction="0"
              krb:class="BoxLayout"
              krb:x="110"
              krb:y="340"
              krb:height="21"
              krb:width="88"
          ><svg:rect
                  krb:class="Label"
                  x="110"
                  y="340"
                  width="45"
                  height="21"
                  krb:text="Status"
                  krb:font="Source Sans Pro,10,-1,5,50,0,0,0,0,0"
                  krb:foreground="#000000"
                  krb:frameWidth="0"
                  krb:background="transparent"
              /><svg:rect
                  krb:class="DisplayComponent"
                  krb:widget="DisplayLabel"
                  krb:keys="Test/mdl.status"
                  x="155"
                  y="340"
                  width="43"
                  height="21"
              /></svg:g></svg:svg>
    `;

    const scene = readScene(guiXml);

    expect(scene.children).toHaveLength(3);
    expect(scene.children[0]).toBeInstanceOf(LabelModel);
    expect(scene.children[1]).toBeInstanceOf(DisplayCommandModel);
    expect(scene.children[2]).toBeInstanceOf(BoxLayoutModel);

    const topLabel = scene.children[0] as LabelModel;
    const layout = scene.children[2] as BoxLayoutModel;

    expect(topLabel.text).toBe('item1');
    expect((layout.children[0] as LabelModel).text).toBe('Status');
  });

  it('reads layout children recursively', () => {
    const scene = readScene(graphXml);

    // First child should be a shape (svg:rect), find first BoxLayout
    const boxLayout = scene.children.find(
      (child) => child instanceof BoxLayoutModel
    ) as BoxLayoutModel | undefined;

    expect(boxLayout).toBeDefined();
    expect(boxLayout!.children.length).toBeGreaterThan(0);
  });

  it('reads Label widgets with text and appearance', () => {
    const scene = readScene(graphXml);

    // BoxLayout children should preserve XML order in graph.xml.
    const boxLayouts = scene.children.filter(
      (child) => child instanceof BoxLayoutModel
    ) as BoxLayoutModel[];

    expect(boxLayouts).toHaveLength(3);

    const firstBoxLayout = boxLayouts[0];
    const secondBoxLayout = boxLayouts[1];
    const thirdBoxLayout = boxLayouts[2];

    expect(firstBoxLayout).toBeInstanceOf(BoxLayoutModel);
    expect(secondBoxLayout).toBeInstanceOf(BoxLayoutModel);
    expect(thirdBoxLayout).toBeInstanceOf(BoxLayoutModel);

    const firstLabel = firstBoxLayout.children[0] as LabelModel;
    const secondLabel = secondBoxLayout.children[0] as LabelModel;
    const thirdLabel = thirdBoxLayout.children[0] as LabelModel;

    expect(firstLabel).toBeInstanceOf(LabelModel);
    expect(secondLabel).toBeInstanceOf(LabelModel);
    expect(thirdLabel).toBeInstanceOf(LabelModel);

    expect(firstLabel.klass).toBe('Label');
    expect(firstLabel.text).toBe('Update frequency');
    expect(secondLabel.text).toBe('State');
    expect(thirdLabel.text).toBe('Alarm condition');
  });

  it('produces UnknownWidgetDataModel for unrecognized widgets', () => {
    // Use a widget name that has no registered reader
    const xml = `
      <svg:svg xmlns:krb="http://karabo.eu/scene" xmlns:svg="http://www.w3.org/2000/svg"
               krb:version="2" krb:uuid="unknown-test" width="200" height="100">
        <svg:rect krb:widget="FutureWidget" krb:class="DisplayComponent"
                  krb:keys="A/B.x" x="0" y="0" width="50" height="20" />
      </svg:svg>
    `;
    const scene = readScene(xml);

    expect(scene.children).toHaveLength(1);
    expect(scene.children[0]).toBeInstanceOf(UnknownWidgetDataModel);
    expect((scene.children[0] as UnknownWidgetDataModel).klass).toBe(
      'FutureWidget'
    );
  });

  it('reads WebLink and DeviceSceneLink from vacumm.xml as link models', () => {
    const vacummXml = fs.readFileSync(
      path.join(SAMPLE_DIR, 'vacumm.xml'),
      'utf-8'
    );
    const scene = readScene(vacummXml);

    const webLinks = scene.children.filter(
      (child) => child instanceof WebLinkModel
    ) as WebLinkModel[];

    const deviceLinks = scene.children.filter(
      (child) => child instanceof DeviceSceneLinkModel
    ) as DeviceSceneLinkModel[];

    expect(webLinks.length).toBeGreaterThan(0);
    expect(deviceLinks.length).toBeGreaterThan(0);
    expect(webLinks[0].klass).toBe('WebLink');
    expect(deviceLinks[0].klass).toBe('DeviceSceneLink');
  });

  it('reads ArrowPolygonModel groups when defs markers are interleaved in the scene XML', () => {
    const xml = `
      <svg:svg xmlns:krb="http://karabo.eu/scene" xmlns:svg="http://www.w3.org/2000/svg" krb:version="2" krb:uuid="arrow-with-defs" height="666" width="859">
        <svg:defs>
          <svg:marker id="marker288071" markerHeight="10.0" markerUnits="strokeWidth" markerWidth="10.0" orient="auto" refX="0.0" refY="3.0">
            <svg:path stroke="none" fill="#000000" fill-opacity="1.0" d="M0,0 L0,6 L9,3 z" />
          </svg:marker>
        </svg:defs>
        <svg:g krb:class="ArrowPolygonModel">
          <svg:line
            stroke="#000000"
            stroke-opacity="1.0"
            stroke-linecap="butt"
            stroke-dashoffset="0.0"
            stroke-width="1.0"
            stroke-dasharray=""
            stroke-style="1"
            stroke-linejoin="miter"
            stroke-miterlimit="4.0"
            fill="none"
            x1="374"
            y1="130"
            x2="428"
            y2="130"
          />
          <svg:polygon
            points="428,130 418,133 418,127 "
            stroke="#000000"
            stroke-opacity="1.0"
            stroke-linecap="butt"
            stroke-dashoffset="0.0"
            stroke-width="1.0"
            stroke-dasharray=""
            stroke-style="1"
            stroke-linejoin="miter"
            stroke-miterlimit="4.0"
            fill="#000000"
            fill-opacity="1.0"
          />
        </svg:g>
      </svg:svg>
    `;

    const scene = readScene(xml);
    const arrows = scene.children.filter(
      (child) => child instanceof ArrowPolygonModel
    ) as ArrowPolygonModel[];

    expect(arrows).toHaveLength(1);
    expect(arrows[0].x1).toBe(374);
    expect(arrows[0].y1).toBe(130);
    expect(arrows[0].x2).toBe(428);
    expect(arrows[0].y2).toBe(130);
    expect(arrows[0].hx1).toBe(418);
    expect(arrows[0].hy1).toBe(133);
    expect(arrows[0].hx2).toBe(418);
    expect(arrows[0].hy2).toBe(127);
  });

  // Shapes that used to be dropped on the floor: svg:path had no reader at all,
  // and svg:defs fell through to the wildcard reader, taking the marker
  // definitions that Karabo draws arrowheads with along with it.
  describe('shape readers', () => {
    const wrap = (body: string) =>
      `<svg:svg xmlns:krb="http://karabo.eu/scene" xmlns:svg="http://www.w3.org/2000/svg" krb:version="2" krb:uuid="shapes" height="100" width="100">${body}</svg:svg>`;

    it('reads svg:path into a PathModel', () => {
      const scene = readScene(
        wrap('<svg:path d="M0,0 L9,3 z" stroke="#000000" fill="none" />')
      );
      const paths = scene.children.filter(
        (child) => child instanceof PathModel
      ) as PathModel[];

      expect(paths).toHaveLength(1);
      expect(paths[0].svg_data).toBe('M0,0 L9,3 z');
      expect(paths[0].stroke).toBe('#000000');
    });

    it('reads svg:defs into a DefsModel, keeping the definition subtree', () => {
      const scene = readScene(
        wrap(
          `<svg:defs>
             <svg:marker id="marker288071" orient="auto" refX="0.0" refY="3.0">
               <svg:path fill="#000000" d="M0,0 L0,6 L9,3 z" />
             </svg:marker>
           </svg:defs>`
        )
      );
      const defs = scene.children.filter(
        (child) => child instanceof DefsModel
      ) as DefsModel[];

      expect(defs).toHaveLength(1);
      expect(defs[0].nodes).toHaveLength(1);
      expect(defs[0].nodes[0].tag).toBe('marker');
      expect(defs[0].nodes[0].attributes.id).toBe('marker288071');
      expect(defs[0].nodes[0].children[0].tag).toBe('path');
      expect(defs[0].nodes[0].children[0].attributes.d).toBe(
        'M0,0 L0,6 L9,3 z'
      );
    });

    it('captures marker references on shapes', () => {
      const scene = readScene(
        wrap(
          '<svg:line x1="0" y1="0" x2="10" y2="0" marker-end="url(#marker288071)" />'
        )
      );
      const lines = scene.children.filter(
        (child) => child instanceof LineModel
      ) as LineModel[];

      expect(lines).toHaveLength(1);
      expect(lines[0].marker_end).toBe('url(#marker288071)');
      expect(lines[0].marker_start).toBe('');
    });
  });

  it('returns an empty SceneModel for invalid XML', () => {
    // Temporarily mock console.warn to avoid warnings in the test output -
    // readScene outputs a console warning before returning
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const scene = readScene('<not-svg>invalid</not-svg>');
    expect(scene).toBeInstanceOf(SceneModel);
    expect(scene.children).toHaveLength(0);
    consoleSpy.mockRestore();
  });

  it('reads the vacumm scene without throwing', () => {
    const vacummXml = fs.readFileSync(
      path.join(SAMPLE_DIR, 'vacumm.xml'),
      'utf-8'
    );
    expect(() => readScene(vacummXml)).not.toThrow();

    const scene = readScene(vacummXml);
    expect(scene).toBeInstanceOf(SceneModel);
    expect(scene.uuid).toBe('d993672c-35b8-4e28-8d21-ac2a3a34ba24');
    expect(scene.children.length).toBeGreaterThan(0);
  });
});
