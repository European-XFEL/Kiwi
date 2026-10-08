import { FilterTableElementModel, TableElementModel, readScene } from '../api';

function readTable(widget: string, attributes = '') {
  return readScene(`<svg:svg xmlns:svg="http://www.w3.org/2000/svg" xmlns:krb="http://karabo.eu/scene" krb:version="2">
    <svg:rect krb:class="DisplayComponent" krb:widget="${widget}" krb:keys="DEV.table" ${attributes} />
  </svg:svg>`).children[0];
}

test('filter table model and scene defaults match Python', () => {
  for (const model of [
    new FilterTableElementModel(),
    readTable('DisplayFilterTableElement') as FilterTableElementModel,
  ]) {
    expect(model).toBeInstanceOf(FilterTableElementModel);
    expect(model.klass).toBe('DisplayFilterTableElement');
    expect(model.resizeToContents).toBe(false);
    expect(model.sortingEnabled).toBe(false);
    expect(model.filterKeyColumn).toBe(0);
    expect(model.showFilterKeyColumn).toBe(false);
  }
});

test('filter scene settings are read and legacy editable scenes remain readable', () => {
  const model = readTable(
    'DisplayFilterTableElement',
    'krb:resizeToContents="true" krb:sortingEnabled="true" krb:filterKeyColumn="2" krb:showFilterKeyColumn="true"'
  ) as FilterTableElementModel;
  expect(model.resizeToContents).toBe(true);
  expect(model.sortingEnabled).toBe(true);
  expect(model.filterKeyColumn).toBe(2);
  expect(model.showFilterKeyColumn).toBe(true);
  const legacy = readTable('EditableTableElement') as TableElementModel;
  expect(legacy).toBeInstanceOf(TableElementModel);
  expect(legacy.klass).toBe('EditableTableElement');
});

test('editable filter scenes use the filter model and preserve settings', () => {
  const model = readTable(
    'EditableFilterTableElement',
    'krb:resizeToContents="true" krb:sortingEnabled="true" krb:filterKeyColumn="2" krb:showFilterKeyColumn="true"'
  ) as FilterTableElementModel;
  expect(model).toBeInstanceOf(FilterTableElementModel);
  expect(model.klass).toBe('EditableFilterTableElement');
  expect(model.resizeToContents).toBe(true);
  expect(model.sortingEnabled).toBe(true);
  expect(model.filterKeyColumn).toBe(2);
  expect(model.showFilterKeyColumn).toBe(true);
});
