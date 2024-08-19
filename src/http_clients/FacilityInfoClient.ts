import APIInfo from "../http_data/APIInfo";
import BaseHttpClient from "./BaseHttpClient";
import GUIServerHostInfo from "../http_data/GUIServerHostInfo";

class FacilityInfoClient extends BaseHttpClient {
  constructor() {
    super(import.meta.env.VITE_REACT_APP_FACILITY_INFO_BASE_URL as string);
  }

  getAPIInfo = () => this.inst.get<APIInfo>("/");

  getProductionTopics = () => this.inst.get<string[]>("/production_topics");

  getTopicGUIServerMap = () =>
    this.inst.get<Map<string, GUIServerHostInfo>>("/topic_gui_server_map");

  getWsProxyURL = () => this.inst.get<string>("/ws_proxy_url");

  getAuthServerURL = () => this.inst.get<string>("/auth_server_url");
}

export default FacilityInfoClient;
