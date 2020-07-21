import fetch from "node-fetch";
import { URL } from "url";
import { FOXY_API_URL } from "./env";
import { PathMember } from "./types/utils";
import { Auth } from "./auth";

const throwIfVoid = async (promise: Promise<string | undefined>) => {
  const result = await promise;
  if (typeof result === "undefined") throw void 0;
  return result;
};

/**
 * Part of the API functionality that restores full URLs from
 * the ordered relations lists trying to make as few requests as possible.
 *
 * **IMPORTANT:** this class is internal; using it in consumers code is not recommended.
 */
export class Resolver {
  constructor(
    protected _auth: Auth,
    protected _path: PathMember[] = [],
    protected _base = FOXY_API_URL
  ) {}

  private get _apiUrl() {
    return new URL(this._base).origin;
  }

  private async _cacheIdentifiers(url: string) {
    const queue: Promise<any>[] = [];

    const user = url.match(/\.\w+\/users\/(\d+)/i)?.[1];
    const store = url.match(/\.\w+\/stores\/(\d+)/i)?.[1];

    if (user) {
      queue.push(this._auth.cache.set("fx_resolver_user", user));
      this._auth.log({ level: "debug", message: `user ${user} has been set as default` });
    }

    if (store) {
      queue.push(this._auth.cache.set("fx_resolver_store", store));
      this._auth.log({ level: "debug", message: `store ${store} has been set as default` });
    }

    await Promise.all(queue);
  }

  private async _traverse(baseUrl: string, rel: PathMember) {
    const response = await fetch(baseUrl, {
      headers: {
        "FOXY-API-VERSION": this._auth.version,
        "Authorization": `Bearer ${await this._auth.getAccessToken()}`,
      },
    });

    this._auth.log({
      level: "http",
      message: `GET ${baseUrl} [${response.status} ${response.statusText}]`,
    });

    if (!response.ok) throw new Error(await response.text());

    const resource = await response.json();
    const result = resource._links[rel].href as string;

    this._auth.log({ level: "debug", message: `resolved online: ${result}` });
    await this._cacheIdentifiers(result);

    return result;
  }

  private async _tryIdResolver(baseUrl: string, rel: PathMember) {
    if (typeof rel !== "number") throw void 0;

    const result = `${baseUrl}/${rel.toString()}`;
    this._auth.log({ level: "debug", message: `resolved offline: ${result}` });

    return result;
  }

  private async _tryStaticResolver(baseUrl: string, rel: PathMember) {
    let result: string;

    switch (rel) {
      case "self":
        result = baseUrl;
        break;

      case "first":
        const parsedUrl = new URL(baseUrl);
        parsedUrl.searchParams.set("offset", "0");
        result = parsedUrl.toString();
        break;

      case "https://api.foxycart.com/rels":
        result = `${this._apiUrl}/rels`;
        break;

      case "fx:property_helpers":
      case "fx:reporting":
      case "fx:encode":
      case "fx:token":
        result = `${this._apiUrl}/${rel.substring(3)}`;
        break;

      default:
        throw void 0;
    }

    this._auth.log({ level: "debug", message: `resolved offline: ${result}` });
    return result;
  }

  private async _tryCacheResolver(baseUrl: string, rel: PathMember) {
    const whenGotStore = this._auth.cache.get("fx_resolver_store");
    const whenGotUser = this._auth.cache.get("fx_resolver_user");

    let result: string;

    switch (rel) {
      case "fx:user":
        result = `${this._apiUrl}/users/${await throwIfVoid(whenGotUser)}`;
        break;

      case "fx:stores":
        result = `${this._apiUrl}/users/${await throwIfVoid(whenGotUser)}/stores`;
        break;

      case "fx:store":
        result = `${this._apiUrl}/stores/${await throwIfVoid(whenGotStore)}`;
        break;

      case "fx:subscription_settings":
        result = `${this._apiUrl}/store_subscription_settings/${await throwIfVoid(whenGotStore)}`;
        break;

      case "fx:users":
      case "fx:attributes":
      case "fx:user_accesses":
      case "fx:customers":
      case "fx:carts":
      case "fx:transactions":
      case "fx:subscriptions":
      case "fx:process_subscription_webhook":
      case "fx:item_categories":
      case "fx:taxes":
      case "fx:payment_method_sets":
      case "fx:coupons":
      case "fx:template_sets":
      case "fx:template_configs":
      case "fx:cart_templates":
      case "fx:cart_include_templates":
      case "fx:checkout_templates":
      case "fx:receipt_templates":
      case "fx:email_templates":
      case "fx:error_entries":
      case "fx:downloadables":
      case "fx:payment_gateways":
      case "fx:hosted_payment_gateways":
      case "fx:fraud_protections":
      case "fx:payment_methods_expiring":
      case "fx:store_shipping_methods":
      case "fx:integrations":
      case "fx:native_integrations":
        result = `${this._apiUrl}/stores/${await throwIfVoid(whenGotStore)}/${rel.substring(3)}`;
        break;

      default:
        throw void 0;
    }

    this._auth.log({ level: "debug", message: `resolved offline: ${result}` });
    return result;
  }

  /**
   * Restores a full url from the path this resolver has
   * been instantiated with making as few requests as possible.
   *
   * @example
   *
   * const url = await foxy.follow("fx:store").resolve();
   *
   * @param skipCache if true, all optimizations will be disabled and the resolver will perform a full tree traversal
   */
  async resolve(skipCache = false): Promise<string> {
    let url = this._base;

    this._auth.log({
      level: "debug",
      message: `looking up ${this._path.join(" => ")}`,
    });

    for (let i = 0; i < this._path.length; ++i) {
      const args = [url, this._path[i]] as const;

      this._auth.log({
        level: "debug",
        message: `[${i + 1}/${this._path.length}] ${url} => [${this._path[i].toString()}]`,
      });

      if (skipCache) {
        url = await this._traverse(...args);
      } else {
        url = await this._tryStaticResolver(...args)
          .catch(() => this._tryCacheResolver(...args))
          .catch(() => this._tryIdResolver(...args))
          .catch(() => this._traverse(...args));
      }
    }

    this._auth.log({ level: "debug", message: `found ${url}` });
    return url;
  }
}
