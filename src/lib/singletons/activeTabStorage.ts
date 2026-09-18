/** The project scene that was active in this browser tab, and its server. */
export interface SavedActiveTab {
  host: string;
  port: number;
  domain: string;
  projectUuid: string;
  sceneUuid: string;
}

// sessionStorage survives a reload but belongs to one browser tab, so each tab
// restores its own scene and the saved tab ends with the browser tab.
const STORAGE_KEY = 'kiwi/workspace:activeTab';

export function writeActiveTab(tab: SavedActiveTab | undefined): void {
  try {
    if (tab) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tab));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Could not save the active tab.', error);
  }
}

export function readActiveTab(): SavedActiveTab | undefined {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? toSavedActiveTab(JSON.parse(stored)) : undefined;
  } catch (error) {
    console.warn('Could not read the saved active tab.', error);
    return undefined;
  }
}

function toSavedActiveTab(value: unknown): SavedActiveTab | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { host, port, domain, projectUuid, sceneUuid } = value as Record<
    string,
    unknown
  >;
  if (
    isText(host) &&
    typeof port === 'number' &&
    isText(domain) &&
    isText(projectUuid) &&
    isText(sceneUuid)
  ) {
    return { host, port, domain, projectUuid, sceneUuid };
  }
  return undefined;
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
