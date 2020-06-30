import { Auth } from "./auth";
import { FOXY_API_URL } from "./env";
import { Follower } from "./follower";
import { Sender, SendRawInit } from "./sender";
import { ApiGraph, Followable } from "./types/utils";
import { Graph } from "./types/api/graph";
import { Props } from "./types/api/props";
import { FoxySigner } from "./utils/signer";
import * as cache from "./utils/cache";
import * as sanitize from "./utils/sanitize";
import * as sso from "./utils/sso";
import * as webhook from "./utils/webhook";

/**
 * Foxy Hypermedia API client for Node.
 * To start working with our API, create an instance of this class.
 *
 * @example
 *
 * const foxy = new FoxyApi({
 *   clientId: "...",     // or set process.env.FOXY_API_CLIENT_ID
 *   clientSecret: "...", // or set process.env.FOXY_API_CLIENT_SECRET
 *   refreshToken: "..."  // or set process.env.FOXY_API_REFRESH_TOKEN
 * });
 *
 * @see https://api.foxycart.com/docs
 * @tutorial https://github.com/foxy/foxy-node-api
 */
class Api extends Auth {
  /** The default API endpoint, also a value of `process.env.FOXY_API_URL` if it's set. */
  static readonly endpoint = FOXY_API_URL;

  /** A set of useful {@link https://npmjs.com/package/traverse traverse} utils for removing private data from response objects. */
  static readonly sanitize = sanitize;

  /** A set of utilities for working with our {@link https://docs.foxycart.com/v/2.0/webhooks webhooks}. */
  static readonly webhook = webhook;

  /** A set of basic cache providers to choose from when creating an instance of this class. */
  static readonly cache = cache;

  /** A set of utilities for using our {@link https://docs.foxycart.com/v/2.0/sso sso} functionality with your website. */
  static readonly sso = sso;

  /** A set of utilities for signing, i.e. creating HMAC verification codes*/
  hmacSign = new FoxySigner(this.clientSecret);

  /**
   * Makes JSON response object followable.
   *
   * @example
   *
   * const store = { _links: { "fx:attributes": { href: "https://api.foxy..." } } };
   * const link = foxy.from(store).follow("fx:attributes");
   *
   * // typescript users: specify resource location in the graph for better autocompletion
   * const link = foxy.from<FoxyApiGraph["fx:store"]>(...);
   *
   * @param resource partial response object with the `_links` property containing relations you'd like to follow
   */
  from<G extends ApiGraph, R extends Followable>(resource: R) {
    return new Follower<G, any>(this, [], resource._links.self.href);
  }

  /**
   * Starts building a resource URL from the root level. For the list of relations please refer to the
   * {@link https://api.foxycart.com/hal-browser/index.html link relationships} page.
   *
   * @example
   *
   * const link = foxy.follow("fx:store").follow("fx:attributes");
   *
   * @param key any root relation
   */
  follow<K extends keyof Graph>(key: K) {
    return new Follower<Graph[K], K>(this, [key], this.endpoint);
  }

  /**
   * Makes an API request to the specified URL, skipping the path construction
   * and resolution. This is what `.fetch()` uses under the hood. Before calling
   * this method, consider using a combination of `foxy.from(resource).fetch()`
   * or `foxy.follow(...).fetch()` instead.
   *
   * @example
   *
   * const response = await foxy.fetchRaw({
   *   url: "https://api.foxycart.com/stores",
   *   method: "POST",
   *   body: { ... }
   * });
   *
   * // typescript users: provide relation name to get a better response type
   * const response = await foxy.fetchRaw<"fx:stores">(...)
   *
   * @param init fetch-like request initializer supporting url, method and body params
   */
  fetchRaw<Host extends keyof Props = any, Graph extends ApiGraph = any>(init: SendRawInit<Host>) {
    return new Sender<Graph, Host>(this, [], this.endpoint).fetchRaw(init);
  }
}

export { Api as FoxyApi };
export { Graph as FoxyApiGraph } from "./types/api/graph";
