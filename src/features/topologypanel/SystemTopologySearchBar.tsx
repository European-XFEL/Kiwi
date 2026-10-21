import { useState } from 'react';
import { Button, Input } from '@/components/api';
import { getStateColor } from '@/lib/Indicators';

const CHANGING_BACKGROUND = getStateColor('CHANGING').replace(',1)', ',0.5)');

export default function SystemTopologySearchBar({
  applied,
  onFilterChange,
  onClear,
}: {
  applied: string;
  onFilterChange: (filter: string) => void;
  onClear: () => void;
}) {
  const [text, setText] = useState('');
  return (
    <form
      className="flex w-full shrink-0 flex-col gap-1 p-1"
      onSubmit={(event) => {
        event.preventDefault();
        onFilterChange(text);
      }}
    >
      <div className="flex min-w-0 items-center gap-1">
        <label className="flex min-w-0 flex-1 items-center gap-1 text-sm">
          Find
          <Input
            className="h-8 min-w-0 px-1"
            style={{
              backgroundColor:
                text !== applied ? CHANGING_BACKGROUND : undefined,
            }}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <Button type="submit" size="sm" variant="outline">
          Filter
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setText('');
            onClear();
          }}
        >
          Clear Filter
        </Button>
      </div>
    </form>
  );
}
