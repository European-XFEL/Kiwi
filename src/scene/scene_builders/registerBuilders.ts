/**
 * Registers all builder functions into the central Scene registry.
 */

import { defaultRegistry } from "./Registry";
import {
  buildDisplayLabel,
  buildDisplayList,
  buildDisplayCommand,
  buildDisplayStateColor,
  buildDisplayCheckBox,
  buildDisplayStatefulIcon,
  buildDisplayTrendGraph,
  buildEditableComboBox,
  buildDoubleLineEdit,
  buildBoxLayout,
  buildFixedLayout,
  buildGridLayout,
  buildLine,
  buildRectangle,
  buildPolygon,
  buildArrowPolygon,
  buildLabel,
  buildPlaceholder,
} from "./BuilderFns";

export function registerAllBuilders() {
  // Widgets
  defaultRegistry.register("widget:label", buildLabel);

  // Display controllers
  defaultRegistry
    .register("controller:display:displaylabel", buildDisplayLabel)
    .register("controller:display:displaylist", buildDisplayList)
    .register("controller:display:displaycommand", buildDisplayCommand)
    .register("controller:display:displaystatecolor", buildDisplayStateColor)
    .register("controller:display:displaycheckbox", buildDisplayCheckBox)
    .register("controller:display:statefuliconwidget", buildDisplayStatefulIcon)
    .register("controller:display:displaytrendgraph", buildDisplayTrendGraph);

  // Known but not yet implemented
  [
    "controller:display:evaluator",
    "controller:display:displayfloat",
    "controller:display:imagegraph",
    "controller:display:displaylineedit",
    "controller:display:globalalarm",
    "controller:display:displaytableelement",
    "controller:display:displayalarmfloat",
  ].forEach((k) => defaultRegistry.register(k, buildPlaceholder));

  // Editable controllers
  defaultRegistry
    .register("controller:editable:editablecombobox", buildEditableComboBox)
    .register("controller:editable:doublelineedit", buildDoubleLineEdit);

  // Layouts
  defaultRegistry
    .register("layout:boxlayout", buildBoxLayout)
    .register("layout:fixedlayout", buildFixedLayout)
    .register("layout:gridlayout", buildGridLayout);

  // Shapes
  defaultRegistry
    .register("shape:line", buildLine)
    .register("shape:rectangle", buildRectangle)
    .register("shape:polygon", buildPolygon)
    .register("shape:arrowpolygon", buildArrowPolygon);

  console.log(
    `Scene registry initialized with ${defaultRegistry.size} builders`
  );
}
