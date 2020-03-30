import fetch from "node-fetch";
import * as traverse from "traverse";
import { Methods } from "./types/methods";
import { HTTPMethod, HTTPMethodWithBody } from "./types/utils";
import { Resolver } from "./resolver";
import { Props } from "./types/props";

type SendBody<Host, Method> = Method extends HTTPMethodWithBody
  ? Host extends keyof Props
    ? Partial<Props[Host]>
    : any
  : never;

type SendMethod<Host> = Host extends keyof Methods ? Methods[Host] : HTTPMethod;

type SendResponse<Host> = (Host extends keyof Props ? Props[Host] : any) & {
  _embedded: any;
  _links: any;
};

export interface SendInit<Host, Method = SendMethod<Host>> {
  skipCache?: boolean;
  method?: Method;
  query?: URLSearchParams | Record<string, string>;
  body?: SendBody<Host, Method> | string;
}

export interface SendRawInit<Host, Method = SendMethod<Host>> {
  url: URL | string;
  body?: SendBody<Host, Method> | string;
  method?: Method;
}

export class Sender<Host extends string | number | symbol> extends Resolver {
  async fetchRaw(params: SendRawInit<Host>): Promise<SendResponse<Host>> {
    const method = params.method ?? "GET";

    const response = await fetch(params.url, {
      body: typeof params.body === "string" ? params.body : JSON.stringify(params.body),
      method,
      headers: {
        "FOXY-API-VERSION": this._auth.version,
        "Content-Type": "application/json",
        "Authorization": `Bearer ${await this._auth.getAccessToken()}`,
      },
    });

    this._auth.log({
      level: "http",
      message: `${method} ${params.url} [${response.status} ${response.statusText}]`,
    });

    if (!response.ok) throw new Error(await response.text());

    return traverse(await response.json()).map(function (value: any) {
      if (!value) return;

      // formats locales as "en-US" as opposed to "en_US"
      if (this.key === "locale_code") {
        return this.update(value.replace("_", "-"));
      }

      // formats timezone offset as "+03:00" as opposed to "+0300"
      if (this.key && this.key.split("_").includes("date")) {
        return this.update(value.replace(/([+-])(\d{2})(\d{2})$/gi, "$1$2:$3"));
      }
    });
  }

  async fetch(params?: SendInit<Host>): Promise<SendResponse<Host>> {
    let url = new URL(await this.resolve(params?.skipCache));

    if (params?.query) {
      const entries = [...new URLSearchParams(params.query).entries()];
      entries.forEach((v) => url.searchParams.append(...v));
    }

    try {
      return await this.fetchRaw({ url, ...params });
    } catch (e) {
      if (!params?.skipCache && e.message.includes("No route found")) {
        this._auth.log({
          level: "error",
          message: "smart resolution failed, attempting tree traversal",
        });

        url = new URL(await this.resolve(true));
        return await this.fetchRaw({ url, ...params });
      } else {
        this._auth.log({ level: "error", message: e.message });
        throw e;
      }
    }
  }
}
