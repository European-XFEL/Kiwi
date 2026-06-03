import {
  BaseSceneObjectData,
  BoxLayoutModel,
  Direction,
  DisplayLabelModel,
  FixedLayoutModel,
  GridLayoutModel,
  RectangleModel,
} from '@/karabo/common/api';
import {
  collectSceneLayers,
  createRootVisitContext,
  visitSceneLayers,
  visitSceneTree,
} from '../visitor';

const makeDisplayLabel = () => {
  const label = new DisplayLabelModel();
  label.width = 50;
  label.height = 20;
  return label;
};

const makeRectangle = () => {
  const rectangle = new RectangleModel();
  rectangle.width = 30;
  rectangle.height = 10;
  return rectangle;
};

const visitLayoutChildren = (
  model: BoxLayoutModel | FixedLayoutModel | GridLayoutModel,
  visitChild: (child: BaseSceneObjectData, index: number) => unknown
) => {
  model.children.forEach((child, index) => {
    visitChild(child, index);
  });
};

describe('sceneTraversal', () => {
  it('visits root scene layers model-first while keeping per-layer indices', () => {
    const layout = new BoxLayoutModel();
    layout.direction = Direction.LeftToRight;
    layout.children = [makeRectangle(), makeDisplayLabel()];

    const visited: string[] = [];

    visitSceneLayers(
      [layout, makeRectangle(), makeDisplayLabel()],
      (model, ctx) => {
        visited.push(
          `${ctx.layer}:${ctx.rootIndex}:${ctx.layerIndex}:${model.constructor.name}`
        );
      }
    );

    expect(visited).toEqual([
      'shape:0:0:BoxLayoutModel',
      'widget:0:0:BoxLayoutModel',
      'shape:1:1:RectangleModel',
      'widget:2:1:DisplayLabelModel',
    ]);
  });

  it('collects root scene entries grouped by stage layer order', () => {
    const layout = new BoxLayoutModel();
    layout.direction = Direction.LeftToRight;
    layout.children = [makeRectangle()];

    const layers = collectSceneLayers([
      makeDisplayLabel(),
      layout,
      makeRectangle(),
    ]);

    expect(layers.shape.map(({ model }) => model.constructor.name)).toEqual([
      'BoxLayoutModel',
      'RectangleModel',
    ]);
    expect(layers.widget.map(({ model }) => model.constructor.name)).toEqual([
      'DisplayLabelModel',
    ]);
  });

  it('threads depth, child index, and path through recursive layout visits', () => {
    const nestedLayout = new FixedLayoutModel();
    nestedLayout.children = [makeDisplayLabel()];

    const rootLayout = new BoxLayoutModel();
    rootLayout.direction = Direction.LeftToRight;
    rootLayout.children = [makeDisplayLabel(), nestedLayout];

    const visited: Array<{
      name: string;
      depth: number;
      index: number;
      path: number[];
    }> = [];

    visitSceneTree(
      rootLayout,
      createRootVisitContext('widget', 3),
      (model, ctx, visitChild) => {
        visited.push({
          name: model.constructor.name,
          depth: ctx.depth,
          index: ctx.index,
          path: [...ctx.path],
        });

        if (
          model instanceof BoxLayoutModel ||
          model instanceof FixedLayoutModel
        ) {
          visitLayoutChildren(model, visitChild);
        }

        return null;
      }
    );

    expect(visited).toEqual([
      { name: 'BoxLayoutModel', depth: 0, index: 3, path: [3] },
      { name: 'DisplayLabelModel', depth: 1, index: 0, path: [3, 0] },
      { name: 'FixedLayoutModel', depth: 1, index: 1, path: [3, 1] },
      { name: 'DisplayLabelModel', depth: 2, index: 0, path: [3, 1, 0] },
    ]);
  });

  it('filters out child nodes that are not visible in the active layer', () => {
    const layout = new BoxLayoutModel();
    layout.direction = Direction.LeftToRight;
    layout.children = [makeRectangle(), makeDisplayLabel()];

    const visited: string[] = [];

    visitSceneTree(
      layout,
      createRootVisitContext('widget', 0),
      (model, _ctx, visitChild) => {
        visited.push(model.constructor.name);

        if (model instanceof BoxLayoutModel) {
          visitLayoutChildren(model, visitChild);
        }

        return null;
      }
    );

    expect(visited).toEqual(['BoxLayoutModel', 'DisplayLabelModel']);
  });

  it('does not include empty layouts in either layer', () => {
    const emptyLayout = new BoxLayoutModel();
    emptyLayout.direction = Direction.LeftToRight;

    const layers = collectSceneLayers([emptyLayout]);

    expect(layers.shape).toEqual([]);
    expect(layers.widget).toEqual([]);
  });
});
