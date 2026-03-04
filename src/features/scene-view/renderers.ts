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
import './components/static/Label';
import './components/static/Sticker';

// Links
import '../controllers/components/links/Links';

// Display controllers
import '../controllers/components/display/DisplayLabel';
import '../controllers/components/display/DisplayCommand';
import '../controllers/components/display/DisplayFloat';
import '../controllers/components/display/DisplayList';
import '../controllers/components/display/DisplayAlarmFloat';
import '../controllers/components/display/DisplayStateColor';
import '../controllers/components/display/Evaluator';
import '../controllers/components/display/CheckBox';
import '../controllers/components/display/LineEdit';
import '../controllers/components/display/TableElement';
import '../controllers/components/display/StatefulIconWidget';
import '../controllers/components/display/DisplayTrendGraph';
import '../controllers/components/display/DisplayVectorGraph';

// Editable controllers
import '../controllers/components/editable/IntLineEdit';
import '../controllers/components/editable/DoubleLineEdit';
import '../controllers/components/editable/EditableSpinBox';
import '../controllers/components/editable/FloatSpinBox';
import '../controllers/components/editable/TickSlider';
import '../controllers/components/editable/EditableComboBox';
import '../controllers/components/editable/EditableRegex';
import '../controllers/components/editable/Hexadecimal';
import '../controllers/components/editable/EditableLists';
