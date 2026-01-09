import DeepVault from 'deepvault';
import { AccessLevel } from '@/karabo_data/SchemaEnums';

/**  Subset of data needed to resume a GUI Session when the app starts. */
export interface SessionData {
  host: string;
  port: number;
  userId: string;
  refreshToken?: string; // Only for auth sessions.
  accessLevel?: AccessLevel; // Only for non-auth sessions.
}

export class ConfigurationStore {
  readonly _vault?: DeepVault;

  public constructor() {
    this._vault = new DeepVault('gui_session_data');
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
    let currentData = undefined;
    try {
      currentData = await this._vault?.getEncryptedData();
    } catch (err) {
      console.debug(err);
    }
    if (currentData) {
      await this._vault?.updateData(data);
    } else {
      await this._vault?.encryptAndSaveData(data);
    }
  }

  async loadSession(): Promise<SessionData | undefined> {
    try {
      const data = await this._vault?.getDecryptedData();
      if (data) {
        return data;
      }
    } catch (err) {
      console.debug(`No session data to load: ${err}`);
    }
    return undefined;
  }

  deleteSession(): void {
    this._vault?.deleteData();
  }
}
