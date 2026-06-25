import type { ReactNode } from 'react';
import type { TabId, TabItem } from '../types';

export interface RuntimeTabState {
  items: TabItem[];
  activeTabId?: TabId;
}

/**
 * Converts an app/domain model into the generic tab shape used by the tab UI.
 * The controller stays model-agnostic; callers decide how ids, labels, and
 * panel content are derived from their own data.
 */
export interface TabControllerAdapter<TModel> {
  getId: (model: TModel) => TabId;
  getTitle: (model: TModel) => string;
  renderContent: (model: TModel) => ReactNode;

  getVersion?: (model: TModel) => string | number;
  getDirty?: (model: TModel) => boolean;
  getDisabled?: (model: TModel) => boolean;
  getClosable?: (model: TModel) => boolean;
}

interface CachedTabItem {
  version: string | number;
  item: TabItem;
}

export type TabControllerOptions<TModel> = {
  createStartPage?: (controller: TabController<TModel>) => TabItem;
  startPage?: TabItem;
};

type AddTabOptions = {
  active?: boolean;
};

type CreateTabsOptions = {
  activeTabId?: TabId;
};

export class TabController<TModel> {
  private state: RuntimeTabState;

  private startPage?: TabItem;

  /**
   * Keeps rendered tab items stable while the source model version is unchanged.
   * Call invalidate/invalidateAll when external data changes outside getVersion.
   */
  private cache = new Map<TabId, CachedTabItem>();

  /**
   * External-store subscribers. React registers here through useSyncExternalStore.
   */
  private listeners = new Set<() => void>();

  constructor(
    private adapter: TabControllerAdapter<TModel>,
    options?: TabControllerOptions<TModel>
  ) {
    const startPage = options?.createStartPage?.(this) ?? options?.startPage;

    this.startPage = startPage ? this.normalizeStartPage(startPage) : undefined;
    this.state = this.createStartState();
  }

  /**
   * Returns the current store snapshot. React calls this after emit() tells it
   * that something changed.
   */
  getSnapshot = (): RuntimeTabState => {
    return this.state;
  };

  /**
   * Registers a change listener and returns the unsubscribe cleanup function.
   */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Replaces the current tab list from domain models. Empty lists fall back to
   * the feature start page when one exists.
   */
  createTabs = (models: TModel[], options?: CreateTabsOptions) => {
    const items = models.map((model) => this.createTabItemFromModel(model));

    if (items.length === 0) {
      this.state = this.createStartState();
      this.emit();
      return;
    }

    const preferredActiveTabId = options?.activeTabId ?? this.state.activeTabId;
    const nextActiveTabId = this.resolveActiveTabId(
      items,
      preferredActiveTabId
    );

    this.state = {
      items,
      activeTabId: nextActiveTabId,
    };

    this.emit();
  };

  /**
   * Adds or refreshes one model-backed tab. The first real tab replaces the
   * start page instead of being appended after it.
   */
  addTab = (model: TModel, options?: AddTabOptions) => {
    const item = this.createTabItemFromModel(model);

    this.upsertItem(item, options);
  };

  /**
   * Adds or refreshes one already-renderable tab item. The first real tab
   * replaces the start page instead of being appended after it.
   */
  addView = (item: TabItem, options?: AddTabOptions) => {
    this.cache.set(item.id, {
      version: 'manual',
      item,
    });

    this.upsertItem(item, options);
  };

  /**
   * Selects an existing enabled tab.
   */
  selectTab = (tabId: TabId) => {
    const selectedTab = this.state.items.find((item) => item.id === tabId);

    if (!selectedTab || selectedTab.disabled) {
      return;
    }

    this.state = {
      ...this.state,
      activeTabId: tabId,
    };

    this.emit();
  };

  /**
   * Removes a real tab and chooses a replacement active tab when needed. The
   * start page cannot be closed, and returns when the last real tab is closed.
   */
  closeTab = (tabId: TabId) => {
    if (this.isStartPageId(tabId)) {
      return;
    }

    const tabExists = this.state.items.some((item) => item.id === tabId);

    if (!tabExists) {
      return;
    }

    const nextItems = this.state.items.filter((item) => item.id !== tabId);

    if (nextItems.length === 0) {
      this.state = this.createStartState();
      this.emit();
      return;
    }

    const wasActiveTab = this.state.activeTabId === tabId;

    const nextActiveTabId = wasActiveTab
      ? this.resolveActiveTabId(nextItems, undefined)
      : this.state.activeTabId;

    this.state = {
      items: nextItems,
      activeTabId: nextActiveTabId,
    };

    this.emit();
  };

  /**
   * Clears all runtime tabs and restores the feature start page when one exists.
   */
  clear = () => {
    this.state = this.createStartState();

    this.emit();
  };

  /**
   * Explicitly returns the feature to its start page.
   */
  resetToStartPage = () => {
    this.state = this.createStartState();

    this.emit();
  };

  /**
   * Drops one cached tab item so the next model conversion rebuilds it.
   */
  invalidate = (tabId: TabId) => {
    this.cache.delete(tabId);
  };

  /**
   * Drops every cached tab item.
   */
  invalidateAll = () => {
    this.cache.clear();
  };

  /**
   * Converts a domain model into a TabItem, using the cache when its version
   * has not changed.
   */
  private createTabItemFromModel = (model: TModel): TabItem => {
    const id = this.adapter.getId(model);

    const version = this.adapter.getVersion?.(model) ?? 'static';

    const cachedItem = this.cache.get(id);

    if (cachedItem && cachedItem.version === version) {
      return cachedItem.item;
    }

    const item: TabItem = {
      id,
      title: this.adapter.getTitle(model),
      dirty: this.adapter.getDirty?.(model) ?? false,
      disabled: this.adapter.getDisabled?.(model) ?? false,
      closable: this.adapter.getClosable?.(model) ?? true,
      panel: this.adapter.renderContent(model),
    };

    this.cache.set(id, {
      version,
      item,
    });

    return item;
  };

  /**
   * Inserts a new tab or replaces an existing tab with the same id.
   */
  private upsertItem = (item: TabItem, options?: AddTabOptions) => {
    const itemAlreadyExists = this.state.items.some((currentItem) => {
      return currentItem.id === item.id;
    });
    let items: TabItem[];

    if (itemAlreadyExists) {
      items = this.state.items.map((currentItem) => {
        return currentItem.id === item.id ? item : currentItem;
      });
    } else if (this.isStartOnlyState()) {
      items = [item];
    } else {
      items = [...this.state.items, item];
    }

    const preferredActiveTabId =
      options?.active === false ? this.state.activeTabId : item.id;

    this.state = {
      items,
      activeTabId: this.resolveActiveTabId(items, preferredActiveTabId),
    };

    this.emit();
  };

  /**
   * Chooses a valid active tab, preferring the requested id when possible.
   */
  private resolveActiveTabId = (
    items: TabItem[],
    preferredActiveTabId: TabId | undefined
  ) => {
    const preferredTab = items.find(
      (item) => item.id === preferredActiveTabId && !item.disabled
    );
    const firstEnabledTab = items.find((item) => !item.disabled);

    return preferredTab?.id ?? firstEnabledTab?.id ?? items[0]?.id;
  };

  /**
   * The start page is a non-closable placeholder, not a normal runtime tab.
   */
  private normalizeStartPage = (startPage: TabItem): TabItem => {
    return {
      ...startPage,
      closable: false,
      dirty: false,
      disabled: false,
    };
  };

  private createStartState = (): RuntimeTabState => {
    if (!this.startPage) {
      return {
        items: [],
        activeTabId: undefined,
      };
    }

    return {
      items: [this.startPage],
      activeTabId: this.startPage.id,
    };
  };

  private isStartPageId = (tabId: TabId) => {
    return this.startPage?.id === tabId;
  };

  private isStartOnlyState = () => {
    return (
      this.startPage !== undefined &&
      this.state.items.length === 1 &&
      this.state.items[0]?.id === this.startPage.id
    );
  };

  /**
   * Notifies subscribers that the state object has changed.
   */
  private emit = () => {
    this.listeners.forEach((listener) => listener());
  };
}
