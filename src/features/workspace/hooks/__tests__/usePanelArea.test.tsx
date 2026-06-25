import { renderHook } from '@testing-library/react';
import type { PanelAreaState } from '../../types';
import usePanelArea from '../usePanelArea';

const mockSubscribe = jest.fn();
const mockGetSnapshot = jest.fn();
const mockSelectTab = jest.fn();
const mockCloseTab = jest.fn();

const mockPanelWrangler = {
  subscribe: mockSubscribe,
  getSnapshot: mockGetSnapshot,
  selectTab: mockSelectTab,
  closeTab: mockCloseTab,
};

jest.mock('@/lib/singletons/api', () => ({
  getPanelWrangler: () => mockPanelWrangler,
}));

function makePanelState(): PanelAreaState {
  return {
    left: { id: 'left', tabs: [], activeTabId: undefined },
    center: {
      id: 'center',
      tabs: [{ id: 'center-1', title: 'Scene', closable: true }],
      activeTabId: 'center-1',
    },
    right: { id: 'right', tabs: [], activeTabId: undefined },
  };
}

describe('usePanelArea', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribe.mockImplementation(() => jest.fn());
    mockGetSnapshot.mockReturnValue(makePanelState());
  });

  it('returns the state for the requested slot', () => {
    const { result } = renderHook(() => usePanelArea('center'));

    expect(result.current.area.id).toBe('center');
    expect(result.current.area.tabs.map((tab) => tab.id)).toEqual(['center-1']);
  });

  it('dispatches tab selection to the wrangler for its slot', () => {
    const { result } = renderHook(() => usePanelArea('center'));

    result.current.onTabSelect('group', 'center-1');

    expect(mockSelectTab).toHaveBeenCalledWith('center', 'center-1');
  });

  it('dispatches tab close to the wrangler for its slot', () => {
    const { result } = renderHook(() => usePanelArea('center'));

    result.current.onTabClose('group', 'center-1');

    expect(mockCloseTab).toHaveBeenCalledWith('center', 'center-1');
  });
});
