import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";

/**
 * A key-value cache accessor interface that every caching
 * plugin must implement.
 */
export interface Cache {
  /** Fetches a cached entry by key */
  get: <T = string>(key: string) => Promise<T | undefined>;

  /** Stores the specified value under the provided key */
  set: <T = string>(key: string, value: T) => Promise<void>;
}

/**
 * A basic memory cache that works in all environments.
 * You can use it as a starting point when building your own
 * caching plugins.
 */
export class MemoryCache implements Cache {
  private _store = new Map<string, any>();

  async get<T = string>(key: string): Promise<T | undefined> {
    return this._store.get(key);
  }

  async set<T = string>(key: string, value: T): Promise<void> {
    this._store.set(key, value);
  }
}

/**
 * A basic disk cache that creates a file for each entry.
 * Please keep in mind that some serverless environments may
 * restrict write access in specific directories.
 */
export class DiskCache implements Cache {
  private _dir: string;

  /**
   * Creates an instance of `DiskCache`.
   *
   * @param dir path to where the cache files will be stored (must exist)
   */
  constructor(dir: string) {
    this._dir = dir;
  }

  async get<T = string>(key: string): Promise<T | undefined> {
    try {
      const file = path.join(this._dir, key);
      return JSON.parse(await promisify(fs.readFile)(file, "UTF-8"));
    } catch (e) {}
  }

  async set<T = string>(key: string, value: T): Promise<void> {
    try {
      const file = path.join(this._dir, key);
      await promisify(fs.writeFile)(file, JSON.stringify(value));
    } catch (e) {}
  }
}

/**
 * A combined cache that doesn't include it's own method of storing
 * data, but instead aggregates and distributes data from and to the
 * provided sources.
 *
 * @example new MixedCache(new MemoryCache(), new DiskCache("/tmp"))
 */
export class MixedCache implements Cache {
  private _caches: Cache[];

  /**
   * Creates an instance of `MixedCache`.
   *
   * @param caches list of cache providers to combine
   */
  constructor(caches: Cache[] = []) {
    this._caches = caches;
  }

  async get<T = string>(key: string): Promise<T | undefined> {
    for (const cache of this._caches) {
      const data = await cache.get<T>(key);
      if (typeof data !== "undefined") return data;
    }
  }

  async set<T = string>(key: string, value: T): Promise<void> {
    await Promise.all(this._caches.map((cache) => cache.set<T>(key, value)));
  }
}
