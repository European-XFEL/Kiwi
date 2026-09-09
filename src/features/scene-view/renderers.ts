/**
 * renderers — bootstrap file.
 *
 * Importing this file triggers all registerRenderer() side-effects.
 * Must be imported once before any scene rendering happens.
 */

import { bootstrapControllerRenderers } from '@/features/controllers/api';
import { registerRenderer } from './renderRegistry';

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
import './components/shapes/Defs';

// Widgets
import './components/widgets/Label';
import './components/widgets/Sticker';
import './components/widgets/Links';

//controllers bootstraping
bootstrapControllerRenderers(registerRenderer);
