import { encryptData, decryptData } from '@/lib/crypto';
import { AccessLevel } from '@/karabo/data/api';

/**  Subset of data needed to resume a GUI Session when the app starts. */
export interface SessionData {
  userId: string;
  refreshToken?: string; // Only for auth sessions.
  accessLevel?: AccessLevel; // Only for non-auth sessions.
}

export class ConfigurationStore {
  // #region SessionData

  private readonly SESSION_DATA_KEY = 'gui_session_data';

  async saveAuthSession(userId: string, refreshToken: string): Promise<void> {
    await this.saveSession({
      userId: userId,
      refreshToken: refreshToken,
    });
  }

  async saveNonAuthSession(
    userId: string,
    accessLevel: AccessLevel
  ): Promise<void> {
    await this.saveSession({
      userId: userId,
      accessLevel: accessLevel,
    });
  }

  private async saveSession(data: SessionData): Promise<void> {
    const jsonData = JSON.stringify(data);
    const encryptedData = encryptData(jsonData);
    localStorage.setItem(this.SESSION_DATA_KEY, encryptedData);
  }

  async loadSession(): Promise<SessionData | undefined> {
    try {
      const encryptedData = localStorage.getItem(this.SESSION_DATA_KEY);
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
    localStorage.removeItem(this.SESSION_DATA_KEY);
  }

  // #endregion

  // #region LastHost and LastPort

  private readonly LAST_HOST_KEY = 'lastHost';

  public get lastHost() {
    return localStorage.getItem(this.LAST_HOST_KEY) || '';
  }

  public set lastHost(host: string) {
    localStorage.setItem(this.LAST_HOST_KEY, host);
  }

  private readonly LAST_PORT_KEY = 'lastPort';

  public get lastPort() {
    return Number.parseInt(localStorage.getItem(this.LAST_PORT_KEY) || '0');
  }

  public set lastPort(port: number) {
    localStorage.setItem(this.LAST_PORT_KEY, `${port}`);
  }

  // #endregion
}
