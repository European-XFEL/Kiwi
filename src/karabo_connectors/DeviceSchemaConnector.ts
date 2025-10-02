import { Hash } from "karabo-ts";
import { GuiServerConnector } from "./GuiServerConnector";

export class DeviceSchemaConnector {
  // #region Singleton
  private constructor() {
    GuiServerConnector.inst.registerHashHandler(
      "deviceSchema",
      this.#_onDeviceSchema
    );
  }

  static #_inst?: DeviceSchemaConnector;
  static get inst(): DeviceSchemaConnector {
    if (!DeviceSchemaConnector.#_inst) {
      DeviceSchemaConnector.#_inst = new DeviceSchemaConnector();
    }
    return DeviceSchemaConnector.#_inst;
  }
  // #endregion

  #_onDeviceSchema = (hash: Hash): void => {};
}
