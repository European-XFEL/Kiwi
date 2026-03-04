import { encryptData, decryptData } from '@/lib/crypto';
import { AccessLevel } from '@/karabo/data/enums';

/**  Subset of data needed to resume a GUI Session when the app starts. */
export interface SessionData {
  host: string;
  port: number;
  userId: string;
  refreshToken?: string; // Only for auth sessions.
  accessLevel?: AccessLevel; // Only for non-auth sessions.
}

export class ConfigurationStore {
  private readonly STORAGE_KEY = 'gui_session_data';

  public constructor() {
    // No initialization needed for localStorage
  }

  async saveAuthSession(
    host: string,
    port: number,
    userId: string,
    refreshToken: string
  ): Promise<void> {
    await this.saveSession({
      host: host,
      port: port,
      userId: userId,
      refreshToken: refreshToken,
    });
  }

  async saveNonAuthSession(
    host: string,
    port: number,
    userId: string,
    accessLevel: AccessLevel
  ): Promise<void> {
    await this.saveSession({
      host: host,
      port: port,
      userId: userId,
      accessLevel: accessLevel,
    });
  }

  private async saveSession(data: SessionData): Promise<void> {
    const jsonData = JSON.stringify(data);
    const encryptedData = encryptData(jsonData);
    localStorage.setItem(this.STORAGE_KEY, encryptedData);
  }

  async loadSession(): Promise<SessionData | undefined> {
    try {
      const encryptedData = localStorage.getItem(this.STORAGE_KEY);
      if (encryptedData) {
        const jsonData = decryptData(encryptedData);
        return JSON.parse(jsonData);
      }
    } catch (err) {
      console.debug(`No session data to load: ${err}`);
    }
    return undefined;
  }

  async deleteSession(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
