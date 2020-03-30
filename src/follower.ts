import { PathMember, ApiGraph } from "./types/utils";
import { Sender } from "./sender";

export class Follower<Graph extends ApiGraph, Host extends PathMember> extends Sender<Host> {
  /**
   * Navigate to a nested resource, building a request query.
   * Calling this method will not fetch your data immediately.
   *
   * @param key Nested relation (link) or a numeric id.
   */
  follow<Key extends keyof Graph>(key: Graph extends never ? never : Key) {
    return new Follower<Graph[Key], Key>(this._auth, [...this._path, key]);
  }
}
