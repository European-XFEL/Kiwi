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

// Display controllers
import './components/widgets/controllers/display/DisplayLabel';
import './components/widgets/controllers/display/DisplayCommand';

// Editable controllers
import './components/widgets/controllers/editable/IntLineEdit';
