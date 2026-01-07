export type APIInfo = {
  name: string;
  version: string;
  doc_url: string;
};

export type AuthenticationAccessCodeResult = {
  success: boolean;
  access_code?: number;
  error_msg?: string;
};

export type AuthenticationCredentials = {
  username: string;
  password: string;
};

export type AuthenticationResult = {
  success: boolean;
  once_token?: string;
  refresh_token?: string;
  error_msg?: string;
};

export type GUIServerHostInfo = {
  hostname: string;
  port: number;
};

export type RefreshTokensParams = {
  refresh_token: string;
  username: string;
  client_hostname: string;
};

export type UserTokensParams = {
  access_code: number;
  client_hostname: string;
  remember_login: boolean;
};

export type UserTokensResult = {
  success: boolean;
  once_token?: string;
  refresh_token?: string;
  username?: string;
  error_msg?: string;
};
