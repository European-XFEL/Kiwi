import { AccessLevel } from "@/karabo_data/SchemaEnums";

export interface LoginInformationInfo {
  accessLevel: AccessLevel;
}

export interface NotificationInfo {
  message: string;
}
