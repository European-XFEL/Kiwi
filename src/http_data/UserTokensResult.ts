type UserTokensResult = {
  success: boolean;
  once_token?: string;
  refresh_token?: string;
  username?: string;
  error_msg?: string;
};

export default UserTokensResult;
