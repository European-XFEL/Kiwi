/**
 * renderers — bootstrap file.
 *
 * Importing this file triggers all registerRenderer() side-effects.
 * Must be imported once before any scene rendering happens.
 */

// Layouts
import './components/layouts/BoxLayout';
import './components/layouts/FixedLayout';
import './components/layouts/GridLayout';

// Shapes
import './components/shapes/Rectangle';
import './components/shapes/Line';
import './components/shapes/Polygon';
import './components/shapes/ArrowPolygon';
import './components/shapes/Path';

// Static widgets
import './components/widgets/static/Label';
import './components/widgets/static/Sticker';

// Links
import './components/widgets/links/Links';

// Display controllers
import './components/widgets/controllers/display/DisplayLabel';
import './components/widgets/controllers/display/DisplayCommand';
import './components/widgets/controllers/display/DisplayFloat';
import './components/widgets/controllers/display/DisplayList';
import './components/widgets/controllers/display/DisplayAlarmFloat';
import './components/widgets/controllers/display/DisplayStateColor';
import './components/widgets/controllers/display/Evaluator';
import './components/widgets/controllers/display/CheckBox';
import './components/widgets/controllers/display/LineEdit';
import './components/widgets/controllers/display/TableElement';
import './components/widgets/controllers/display/StatefulIconWidget';
import './components/widgets/controllers/display/DisplayTrendGraph';
import './components/widgets/controllers/display/DisplayVectorGraph';

// Editable controllers
import './components/widgets/controllers/editable/IntLineEdit';
import './components/widgets/controllers/editable/DoubleLineEdit';
import './components/widgets/controllers/editable/EditableSpinBox';
import './components/widgets/controllers/editable/FloatSpinBox';
import './components/widgets/controllers/editable/TickSlider';
import './components/widgets/controllers/editable/EditableComboBox';
import './components/widgets/controllers/editable/EditableRegex';
import './components/widgets/controllers/editable/Hexadecimal';
import './components/widgets/controllers/editable/EditableLists';
