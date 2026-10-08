import type { ControllerContainerContext } from '@/features/scene-view/api';
import {
  FilterTableElementModel,
  TableElementModel,
} from '@/karabo/common/api';
import { FilterTableView, TableView } from '../table/TableView';
import type { TableDelegate } from '../table/getDisplayDelegate';

export default function TableElement(props: {
  model: TableElementModel;
  ctx?: ControllerContainerContext;
  delegatesByColumn?: Readonly<Record<number, TableDelegate | undefined>>;
}) {
  return <TableView {...props} />;
}

export function FilterTableElement(props: {
  model: FilterTableElementModel;
  ctx?: ControllerContainerContext;
  delegatesByColumn?: Readonly<Record<number, TableDelegate | undefined>>;
}) {
  return <FilterTableView {...props} />;
}
