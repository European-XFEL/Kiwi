import APIInfo from "../http_data/APIInfo";
import AuthenticationCredentials from "../http_data/AuthenticationCredentials";
import AuthenticationResult from "../http_data/AuthenticationResult";
import AuthenticationAccessCodeResult from "../http_data/AuthenticationAccessCodeResult";
import UserTokensResult from "../http_data/UserTokensResult";
import UserTokensParams from "../http_data/UserTokensParams";
import RefreshTokensParams from "../http_data/RefreshTokensParams";
import BaseHttpClient from "./BaseHttpClient";

/**
 * Provides an HTTP client for interacting with an instance of the  Karabo Authentication Server.
 *
 * Provides methods for authenticating users, refreshing user tokens, and retrieving
 * server's API information.
 *
 */
class AuthServerClient extends BaseHttpClient {
  static CLIENT_HOSTNAME = "localhost";

  public constructor(baseURL: string) {
    super(baseURL);
  }

  getAPIInfo = () => this.inst.get<APIInfo>("/");

  async authenticateUser(
    cred: AuthenticationCredentials
  ): Promise<AuthenticationResult> {
    try {
      const res = await this.inst.post<AuthenticationAccessCodeResult>(
        "/auth_access_code",
        cred
      );
      if (!res.success) {
        return {
          success: false,
          error_msg: res.error_msg,
          once_token: undefined,
          refresh_token: undefined,
        };
      }
      const userTokensParams: UserTokensParams = {
        access_code: res.access_code!,
        // For security reasons, a web app running on a browser doesn't have
        // access to the browser's host system name - we always use the same value
        client_hostname: AuthServerClient.CLIENT_HOSTNAME,
        // the remember_login will always be set to restore the GUI session
        // upon page refresh.
        remember_login: true,
      };
      const tokens = await this.inst.post<UserTokensResult>(
        "/user_tokens",
        userTokensParams
      );
      return {
        success: true,
        error_msg: undefined,
        once_token: tokens.once_token,
        refresh_token: tokens.refresh_token,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return {
        success: false,
        error_msg: error.message,
        once_token: undefined,
        refresh_token: undefined,
      };
    }
  }

  async refreshTokens(
    refreshToken: string,
    userId: string
  ): Promise<AuthenticationResult> {
    try {
      const refreshTokenParams: RefreshTokensParams = {
        refresh_token: refreshToken,
        username: userId,
        // For security reasons, a web app running on a browser doesn't have
        // access to the browser's host system name - we always use the same value
        client_hostname: AuthServerClient.CLIENT_HOSTNAME,
      };
      const res = await this.inst.post<UserTokensResult>(
        "/refresh_tokens",
        refreshTokenParams
      );
      if (!res.success) {
        return {
          success: false,
          error_msg: res.error_msg,
          once_token: undefined,
          refresh_token: undefined,
        };
      }
      return {
        success: true,
        error_msg: undefined,
        once_token: res.once_token,
        refresh_token: res.refresh_token,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return {
        success: false,
        error_msg: error.message,
        once_token: undefined,
        refresh_token: undefined,
      };
    }
  }
}

export default AuthServerClient;
