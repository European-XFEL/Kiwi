type AuthenticationResult = {
  success: boolean;
  once_token?: string;
  refresh_token?: string;
  error_msg?: string;
};

export default AuthenticationResult;
