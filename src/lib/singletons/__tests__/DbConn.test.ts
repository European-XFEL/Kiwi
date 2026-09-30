import { ProjectModel } from '@/karabo/common/project/api';
import { Hash } from '@/karabo/data/api';
import { KaraboEvent } from '@/lib/events';
import { getMediator, singletons } from '@/lib/singletons/api';
import { DbConnection } from '../DbConn';

const mockNetwork = {
  onProjectListItems: jest.fn(),
  onProjectLoadItems: jest.fn(),
};

describe('DbConnection', () => {
  let db: DbConnection;
  let busy: jest.Mock;
  let offBusy: () => void;

  beforeEach(() => {
    jest.clearAllMocks();
    singletons.set('network', mockNetwork);
    db = new DbConnection();
    busy = jest.fn();
    offBusy = getMediator().on(KaraboEvent.DatabaseBusy, busy);
  });

  afterEach(() => {
    offBusy();
    db.dispose();
    singletons.delete('network');
    singletons.delete('mediator');
  });

  function startRead(uuid = 'motors'): void {
    db.loadProject('CONTROLS', new ProjectModel({ uuid }));
  }

  const loadFailed = new Hash('is_processing', false, 'loading_failed', true);

  // Replies to the ended session's requests will never arrive.
  it('fails a read in progress when the session ends, and accepts the next load', () => {
    startRead();

    db.reset();

    expect(busy).toHaveBeenLastCalledWith(loadFailed);
    startRead('next');
    expect(mockNetwork.onProjectLoadItems).toHaveBeenCalledTimes(2);
  });

  it('accepts a load after the session ended during a project listing', () => {
    db.listProjects('CONTROLS');

    db.reset();

    expect(busy).not.toHaveBeenCalled();
    startRead();
    expect(mockNetwork.onProjectLoadItems).toHaveBeenCalledTimes(1);
  });
});
