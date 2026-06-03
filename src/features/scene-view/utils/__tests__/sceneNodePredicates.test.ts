import {
  BoxLayoutModel,
  DisplayLabelModel,
  LabelModel,
  RectangleModel,
  SceneLinkModel,
  StickerModel,
  UnknownWidgetDataModel,
  UnknownXMLDataModel,
  WebLinkModel,
} from '@/karabo/common/api';
import { isControllerWidget, isLayout, isShape } from '../sceneNodePredicates';

describe('sceneNodePredicates', () => {
  it('identifies layout models', () => {
    expect(isLayout(new BoxLayoutModel())).toBe(true);
    expect(isLayout(new RectangleModel())).toBe(false);
  });

  it('identifies shape models', () => {
    expect(isShape(new RectangleModel())).toBe(true);
    expect(isShape(new DisplayLabelModel())).toBe(false);
  });

  it.each([
    ['LabelModel', new LabelModel()],
    ['StickerModel', new StickerModel()],
    ['SceneLinkModel', new SceneLinkModel()],
    ['WebLinkModel', new WebLinkModel()],
    ['UnknownWidgetDataModel', new UnknownWidgetDataModel()],
    ['UnknownXMLDataModel', new UnknownXMLDataModel()],
  ])('does not classify %s as a controller widget', (_name, model) => {
    expect(isControllerWidget(model as any)).toBe(false);
  });

  it('identifies controller widgets', () => {
    expect(isControllerWidget(new DisplayLabelModel())).toBe(true);
  });
});
