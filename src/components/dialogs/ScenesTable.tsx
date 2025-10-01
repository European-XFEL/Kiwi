import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ProjectSceneInfo,
  asLocalDateTimeString,
} from "@/karabo_data/ProjectDbInfo";

export type ScenesTableProps = {
  scenes: ProjectSceneInfo[];
  selectedScene?: ProjectSceneInfo;
  onSceneClick: (scene: ProjectSceneInfo) => void;
  onSceneDoubleClick: (scene: ProjectSceneInfo) => void;
};

export default function ScenesTable({
  scenes,
  selectedScene,
  onSceneClick,
  onSceneDoubleClick,
}: ScenesTableProps) {
  return (
    <ScrollArea className="h-48 rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-background">
          <TableRow>
            <TableHead>Scene Name</TableHead>
            <TableHead>Last Modified</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scenes.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={2}
                className="text-center text-muted-foreground"
              >
                No scenes available
              </TableCell>
            </TableRow>
          ) : (
            scenes.map((scene, index) => (
              <TableRow
                key={`${index}::${scene.uuid}`}
                onClick={() => onSceneClick(scene)}
                onDoubleClick={() => onSceneDoubleClick(scene)}
                className={`cursor-pointer ${
                  selectedScene?.uuid === scene.uuid
                    ? "bg-accent"
                    : "hover:bg-accent/50"
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
  );
}
