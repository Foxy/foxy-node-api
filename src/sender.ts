import fetch from "node-fetch";
import traverse from "traverse";
import { Methods } from "./types/methods";
import { HTTPMethod, HTTPMethodWithBody, ApiGraph, PathMember } from "./types/utils";
import { Resolver } from "./resolver";
import { Props } from "./types/props";
import { Resource } from "./types/resource";

type SendBody<Host, Method> = Method extends HTTPMethodWithBody
  ? Host extends keyof Props
    ? Partial<Props[Host]>
    : any
  : never;

type SendMethod<Host> = Host extends keyof Methods ? Methods[Host] : HTTPMethod;

export interface SendRawInit<Host, Method = SendMethod<Host>> {
  /**
   * The absolute URL (either a `URL` instance or a string)
   * to send the request to. Required.
   */
  url: URL | string;

  /**
   * Request payload, either already serialized or in form of a serializable object.
   * Not applicable to some request methods (e.g. `GET`). Empty by default.
   */
  body?: SendBody<Host, Method> | string;

  /**
   * {@link https://developer.mozilla.org/docs/Web/HTTP/Methods HTTP method} to use in this request.
   * Different relations support different sets of methods. If omitted, `GET` will be used by default.
   */
  method?: Method;
}

export type SendInit<Host, Method = SendMethod<Host>> = Omit<SendRawInit<Host, Method>, "url"> & {
  /**
   * If true, all URL resolution optimizations will be disabled for this requests.
   * This option is `false` by default.
   */
  skipCache?: boolean;

  /**
   * A key-value map containing the query parameters that you'd like to add to the URL when it's resolved.
   * You can also use `URLSearchParams` if convenient. Empty set by default.
   */
  query?: URLSearchParams | Record<string, string>;
};

/**
 * Part of the API functionality that sends the API requests and
 * normalizes the responses if necessary.
 *
 * **IMPORTANT:** this class is internal; using it in consumers code is not recommended.
 */
export class Sender<Graph extends ApiGraph, Host extends PathMember> extends Resolver {
  /**
   * Makes an API request to the specified URL, skipping the path construction
   * and resolution. This is what `.fetch()` uses under the hood. Before calling
   * this method, consider using a combination of `foxy.from(resource).fetch()`
   * or `foxy.follow(...).fetch()` instead.
   *
   * @example
   *
   * const response = await foxy.follow("fx:store").fetchRaw({
   *   url: "https://api.foxycart.com/stores/8",
   *   method: "POST",
   *   body: { ... }
   * });
   * @param init fetch-like request initializer supporting url, method and body params
   */
  async fetchRaw(params: SendRawInit<Host>): Promise<Resource<Graph, Host>> {
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
      // formats locales as "en-US" as opposed to "en_US"
      if (value && this.key === "locale_code") {
        return this.update(value.replace("_", "-"));
      }

      // formats timezone offset as "+03:00" as opposed to "+0300"
      if (value && this.key && this.key.split("_").includes("date")) {
        return this.update(value.replace(/([+-])(\d{2})(\d{2})$/gi, "$1$2:$3"));
      }
    });
  }

  /**
   * Resolves the resource URL and makes an API request
   * according to the given configuration. A GET request
   * without query parameters will be sent by default. Refer to our
   * {@link https://api.foxycart.com/docs/cheat-sheet cheatsheet}
   * for the list of available query parameters and HTTP methods.
   *
   * @example
   *
   * const { store_version } = await foxy.follow("fx:store").fetch({
   *   query: { fields: "store_version" }
   * });
   *
   * @param params API request options such as method, query or body
   */
  async fetch(params?: SendInit<Host>): Promise<Resource<Graph, Host>> {
    let url = new URL(await this.resolve(params?.skipCache));

    if (params?.query) {
      const entries = [...new URLSearchParams(params.query).entries()];
      entries.forEach((v) => url.searchParams.append(...v));
    }

    const rawParams: SendRawInit<Host> = traverse(params).map(function () {
      if (this.key && ["query", "skipCache"].includes(this.key)) this.remove();
    });

    try {
      return await this.fetchRaw({ url, ...rawParams });
    } catch (e) {
      if (!params?.skipCache && e.message.includes("No route found")) {
        this._auth.log({
          level: "error",
          message: "smart resolution failed, attempting tree traversal",
        });

        url = new URL(await this.resolve(true));
        return this.fetchRaw({ url, ...rawParams });
      } else {
        this._auth.log({ level: "error", message: e.message });
        throw e;
      }
    }
  }
}
