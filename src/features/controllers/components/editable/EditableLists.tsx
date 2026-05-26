/** EditableLists — EditableList, EditableRegexList, EditableListElement. */

import React from 'react';
import { SquarePen } from 'lucide-react';
import type { ControllerContainerContext } from '../ControllerContainer';
import {
  EditableListModel,
  EditableRegexListModel,
  EditableListElementModel,
  FONT_FAMILY_DEFAULT,
} from '@/karabo/common/api';
import { registerRenderer } from '@/features/scene-view/renderRegistry';
import { Button } from '@/components/button';
import { isControllerEditable } from '../../utils/controller_semantics';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/dialog';

// helpers
// ----------------------------------------------------------------------------

function formatListValue(v: unknown): string {
  if (Array.isArray(v)) return v.map(String).join(', ');
  if (v == null) return '';
  return String(v);
}

function parseListString(s: string): string[] {
  return s
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

// EditableList
// ----------------------------------------------------------------------------

const EditableList: React.FC<{
  model: EditableListModel;
  ctx?: ControllerContainerContext;
}> = ({ ctx }) => {
  const proxyValue = ctx?.proxy?.value;
  const enabled = ctx
    ? isControllerEditable(ctx.proxy, ctx.userAccessLevel)
    : false;

  const [localValue, setLocalValue] = React.useState(() =>
    formatListValue(proxyValue)
  );
  const [isEditing, setIsEditing] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  React.useEffect(() => {
    if (isEditing) return;
    const next = formatListValue(proxyValue);
    setLocalValue((prev) => (prev === next ? prev : next));
  }, [proxyValue, isEditing]);

  return (
    <div className="flex items-center gap-1 w-full h-full">
      <input
        type="text"
        value={localValue}
        onFocus={() => setIsEditing(true)}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={(e) => {
          setIsEditing(false);
          const items = parseListString(e.target.value);
          const normalized = items.join(', ');
          setLocalValue((prev) => (prev === normalized ? prev : normalized));
          // TODO: push value to backend
        }}
        disabled={!enabled}
        className={`flex-1 min-w-0 h-full border border-solid rounded px-1 text-xs ${
          enabled
            ? 'text-black bg-white cursor-text'
            : 'text-gray-500 bg-gray-100 cursor-not-allowed'
        }`}
        style={{ fontFamily: FONT_FAMILY_DEFAULT }}
        placeholder={enabled ? 'item1, item2, …' : 'Read-only'}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            disabled={!enabled}
            className="h-6 w-6 p-0 shrink-0"
          >
            <SquarePen className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <textarea
              className="w-full h-40 border rounded px-2 py-1 text-xs font-mono resize-y"
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              placeholder="One item per line or comma-separated"
            />
            <p className="mt-1 text-[10px] text-gray-400">
              Comma-separated values. Close dialog to apply.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// EditableRegexList
// ----------------------------------------------------------------------------

const EditableRegexList: React.FC<{
  model: EditableRegexListModel;
  ctx?: ControllerContainerContext;
}> = ({ ctx }) => {
  const proxyValue = ctx?.proxy?.value;
  const enabled = ctx
    ? isControllerEditable(ctx.proxy, ctx.userAccessLevel)
    : false;

  const [localValue, setLocalValue] = React.useState(() =>
    formatListValue(proxyValue)
  );
  const [isEditing, setIsEditing] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (isEditing) return;
    const next = formatListValue(proxyValue);
    setLocalValue((prev) => (prev === next ? prev : next));
  }, [proxyValue, isEditing]);

  const validate = (value: string) => {
    const patterns = parseListString(value);
    for (const p of patterns) {
      try {
        new RegExp(p);
      } catch {
        return `Invalid regex: ${p}`;
      }
    }
    return '';
  };

  return (
    <div className="flex flex-col w-full h-full">
      <input
        type="text"
        value={localValue}
        onFocus={() => setIsEditing(true)}
        onChange={(e) => {
          setLocalValue(e.target.value);
          setError('');
        }}
        onBlur={(e) => {
          setIsEditing(false);
          const err = validate(e.target.value);
          if (err) {
            setError(err);
            return;
          }
          const items = parseListString(e.target.value);
          const normalized = items.join(', ');
          setLocalValue((prev) => (prev === normalized ? prev : normalized));
          // TODO: push value to backend
        }}
        disabled={!enabled}
        className={`w-full flex-1 border border-solid rounded px-1 text-xs font-mono ${
          enabled
            ? 'text-black bg-white cursor-text'
            : 'text-gray-500 bg-gray-100 cursor-not-allowed'
        } ${error ? 'border-red-400' : ''}`}
        style={{ fontFamily: 'monospace' }}
        placeholder={enabled ? 'regex1, regex2, …' : 'Read-only'}
      />
      {error && <span className="text-[10px] text-red-500 px-1">{error}</span>}
    </div>
  );
};

// EditableListElement
// ----------------------------------------------------------------------------

const EditableListElement: React.FC<{
  model: EditableListElementModel;
  ctx?: ControllerContainerContext;
}> = ({ ctx }) => {
  const proxyValue = ctx?.proxy?.value;
  const enabled = ctx
    ? isControllerEditable(ctx.proxy, ctx.userAccessLevel)
    : false;

  const [localValue, setLocalValue] = React.useState(
    proxyValue != null ? String(proxyValue) : ''
  );
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    if (isEditing) return;
    const next = proxyValue != null ? String(proxyValue) : '';
    setLocalValue((prev) => (prev === next ? prev : next));
  }, [proxyValue, isEditing]);

  return (
    <input
      type="text"
      value={localValue}
      onFocus={() => setIsEditing(true)}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        setIsEditing(false);
        // TODO: push value to backend
      }}
      disabled={!enabled}
      className={`w-full h-full border border-solid rounded px-1 text-xs ${
        enabled
          ? 'text-black bg-white cursor-text'
          : 'text-gray-500 bg-gray-100 cursor-not-allowed'
      }`}
      style={{ fontFamily: FONT_FAMILY_DEFAULT }}
    />
  );
};

registerRenderer('EditableList', EditableList);
registerRenderer('EditableRegexList', EditableRegexList);
registerRenderer('EditableListElement', EditableListElement);
