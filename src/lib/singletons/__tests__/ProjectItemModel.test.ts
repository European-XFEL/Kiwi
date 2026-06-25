import { ProjectModel } from '@/karabo/common/project/api';
import { ProjectItemModel } from '../ProjectItemModel';

describe('ProjectItemModel', () => {
  it('initializes with a root model', () => {
    const model = new ProjectItemModel();
    const project_model = new ProjectModel({});
    model.root = project_model;
    expect(model.root).toBeDefined();
  });
});
