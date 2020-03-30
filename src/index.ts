import { Auth } from "./auth";
import { FOXY_API_URL } from "./env";
import { Follower } from "./follower";
import { Sender, SendRawInit } from "./sender";
import { Graph } from "./types/graph";
import { Props } from "./types/props";
import * as cache from "./utils/cache";
import * as sanitize from "./utils/sanitize";
import * as sso from "./utils/sso";
import * as webhook from "./utils/webhook";

export class FoxyApi extends Auth {
  static readonly endpoint = FOXY_API_URL;
  static readonly sanitize = sanitize;
  static readonly webhook = webhook;
  static readonly cache = cache;
  static readonly sso = sso;

  /**
   * Makes JSON object received with `.fetch()` followable.
   * @example
   * const store = await foxy.follow("fx:store").fetch();
   * const attributes = await foxy.from(store).follow("fx:attributes");
   */
  from(snapshot: any) {
    return new Follower(this, [], snapshot._links.self.href);
  }

  follow<K extends keyof Graph>(key: K) {
    return new Follower<Graph[K], K>(this, [key]);
  }

  fetchRaw<Host extends keyof Props = any>(init: SendRawInit<Host>) {
    return new Sender<Host>(this).fetchRaw(init);
  }
}
