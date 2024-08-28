import DeepVault from "deepvault";
import { AccessLevel } from "../karabo_data/AccessLevel";

/**  Subset of GuiSessionInfo needed to resume a GUI Session when the app starts. */
export interface GuiSessionData {
  host: string;
  port: number;
  userId: string;
  refreshToken?: string; // Only for auth sessions.
  accessLevel?: AccessLevel; // Only for non-auth sessions.
}

export class GuiSessionStore {
  #_vault?: DeepVault;

  private constructor() {}

  static #_inst?: GuiSessionStore;
  static get inst(): GuiSessionStore {
    if (GuiSessionStore.#_inst == undefined) {
      GuiSessionStore.#_inst = new GuiSessionStore();
      GuiSessionStore.#_inst.#_vault = new DeepVault("gui_session_data");
    }
    return GuiSessionStore.#_inst;
  }

  async saveAuthGuiSession(
    host: string,
    port: number,
    userId: string,
    refreshToken: string
  ): Promise<void> {
    await this.saveGuiSessionData({
      host: host,
      port: port,
      userId: userId,
      refreshToken: refreshToken,
    });
  }

  async saveNonAuthGuiSession(
    host: string,
    port: number,
    userId: string,
    accessLevel: AccessLevel
  ): Promise<void> {
    await this.saveGuiSessionData({
      host: host,
      port: port,
      userId: userId,
      accessLevel: accessLevel,
    });
  }

  private async saveGuiSessionData(data: GuiSessionData): Promise<void> {
    let currentData = undefined;
    try {
      currentData = await GuiSessionStore.#_inst!.#_vault?.getEncryptedData();
    } catch (err) {
      console.debug(err);
    }
    if (currentData) {
      await GuiSessionStore.#_inst!.#_vault?.updateData(data);
    } else {
      await GuiSessionStore.#_inst!.#_vault?.encryptAndSaveData(data);
    }
  }

  async loadGuiSessionData(): Promise<GuiSessionData | undefined> {
    try {
      const data = await GuiSessionStore.#_inst!.#_vault?.getDecryptedData();
      if (data) {
        return data;
      }
    } catch (err) {
      console.debug(`No session data to load: ${err}`);
    }
    return undefined;
  }

  deleteGuiSession(): void {
    GuiSessionStore.#_inst!.#_vault?.deleteData();
  }
}
