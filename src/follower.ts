import { PathMember, ApiGraph } from "./types/utils";
import { Sender } from "./sender";

/**
 * Part of the API functionality that provides a URL builder
 * with IDE autocompletion features powered by TS and JSDoc.
 *
 * **IMPORTANT:** this class is internal; using it in consumers code is not recommended.
 */
export class Follower<Graph extends ApiGraph, Host extends PathMember> extends Sender<Host> {
  /**
   * Navigates to the nested resource, building a request query.
   * Calling this method will not fetch your data immediately. For the list of relations please refer to the
   * {@link https://api.foxycart.com/hal-browser/index.html link relationships} page.
   *
   * @example
   *
   * const link = foxy.follow("fx:stores").follow(8);
   *
   * @param key Nested relation (link) or a numeric id.
   */
  follow<Key extends keyof Graph>(key: Graph extends never ? never : Key) {
    return new Follower<Graph[Key], Key>(this._auth, [...this._path, key]);
  }
}
