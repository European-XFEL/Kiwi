/** EditableLists — placeholders for EditableList, EditableRegexList, EditableListElement. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/ControllerContainer';
import {
  EditableListModel,
  EditableRegexListModel,
  EditableListElementModel,
} from '@/karabo/common/models/widgets/controllers/editable';
import { registerRenderer } from '@/features/scene-view/render/registry';

// EditableList
// ----------------------------------------------------------------------------

const EditableList: React.FC<{
  model: EditableListModel;
  ctx?: ControllerContainerContext;
}> = ({ model: _model, ctx: _ctx }) => (
  <div
    className="w-full h-full border border-dashed border-gray-400 flex items-center justify-center text-xs text-gray-400 bg-gray-50 select-none"
    title="EditableList — not yet implemented"
  >
    List
  </div>
);

// EditableRegexList
// ----------------------------------------------------------------------------

const EditableRegexList: React.FC<{
  model: EditableRegexListModel;
  ctx?: ControllerContainerContext;
}> = ({ model: _model, ctx: _ctx }) => (
  <div
    className="w-full h-full border border-dashed border-gray-400 flex items-center justify-center text-xs text-gray-400 bg-gray-50 select-none"
    title="EditableRegexList — not yet implemented"
  >
    Regex List
  </div>
);

// EditableListElement
// ----------------------------------------------------------------------------

const EditableListElement: React.FC<{
  model: EditableListElementModel;
  ctx?: ControllerContainerContext;
}> = ({ model: _model, ctx: _ctx }) => (
  <div
    className="w-full h-full border border-dashed border-gray-400 flex items-center justify-center text-xs text-gray-400 bg-gray-50 select-none"
    title="EditableListElement — not yet implemented"
  >
    List Element
  </div>
);

registerRenderer('EditableList', EditableList);
registerRenderer('EditableRegexList', EditableRegexList);
registerRenderer('EditableListElement', EditableListElement);
