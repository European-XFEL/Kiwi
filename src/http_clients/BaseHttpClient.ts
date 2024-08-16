import axios, { AxiosInstance, AxiosResponse } from "axios";

declare module "axios" {
  interface AxiosResponse<T = any> extends Promise<T> {}
}

const headers: Readonly<Record<string, string | boolean>> = {
  Accept: "application/json",
  "Content-Type": "application/json; charset=utf-8",
};

abstract class BaseHttpClient {
  protected readonly inst: AxiosInstance;

  constructor(baseURL: string) {
    this.inst = axios.create({
      baseURL: baseURL,
      headers,
    });
    this._initializeResponseInterceptor();
  }

  private _initializeResponseInterceptor = () => {
    this.inst.interceptors.response.use(
      this._handleResponse,
      this._handleError
    );
  };

  private _handleResponse = ({ data }: AxiosResponse) => data;

  protected _handleError = (error: any) => Promise.reject(error);
}

export default BaseHttpClient;
