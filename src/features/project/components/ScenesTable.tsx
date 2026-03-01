import { Input } from '@/components/input';
import { ScrollArea } from '@/components/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/table';
import { asLocalDateTimeString } from '@/lib/ProjectDbInfo';
import { Search } from 'lucide-react';
import { useState } from 'react';
import type { ScenesTableProps } from '../types/project.types';

export default function ScenesTable({
  scenes,
  selectedScene,
  onSceneClick,
  onSceneDoubleClick,
}: ScenesTableProps) {
  const [query, setQuery] = useState('');

  const filtered = query
    ? scenes.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
    : scenes;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Filter scenes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>
      <ScrollArea className="h-48 rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>Scene Name</TableHead>
              <TableHead>Last Modified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-muted-foreground"
                >
                  {query ? 'No matching scenes' : 'No scenes available'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((scene, index) => (
                <TableRow
                  key={`${index}::${scene.uuid}`}
                  onClick={() => onSceneClick(scene)}
                  onDoubleClick={() => onSceneDoubleClick(scene)}
                  className={`cursor-pointer ${
                    selectedScene?.uuid === scene.uuid
                      ? 'bg-accent'
                      : 'hover:bg-accent/50'
                  }`}
                >
                  <TableCell className="font-medium truncate max-w-xs">
                    {scene.name}
                  </TableCell>
                  <TableCell className="truncate">
                    {asLocalDateTimeString(scene.dateModified)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
