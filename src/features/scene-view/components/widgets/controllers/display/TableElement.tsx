/** TableElement — placeholder for DisplayTableElement and EditableTableElement. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/ControllerContainer';
import { TableElementModel } from '@/karabo/common/models/widgets/controllers/display';
import { registerRenderer } from '@/features/scene-view/render/registry';

// TableElement
// ----------------------------------------------------------------------------

const TableElement: React.FC<{
  model: TableElementModel;
  ctx?: ControllerContainerContext;
}> = ({ model: _model, ctx: _ctx }) => (
  <div
    className="w-full h-full border border-dashed border-gray-400 flex items-center justify-center text-xs text-gray-400 bg-gray-50 select-none"
    title="TableElement — not yet implemented"
  >
    Table
  </div>
);

registerRenderer('DisplayTableElement', TableElement);
registerRenderer('EditableTableElement', TableElement);

export default TableElement;
