import { FoxyApi } from "../../src";
import mock from "mock-fs";

describe("FoxyApi.cache", () => {
  it("exports MemoryCache", () => {
    expect(FoxyApi.cache).toHaveProperty("MemoryCache");
  });

  it("exports DiskCache", () => {
    expect(FoxyApi.cache).toHaveProperty("DiskCache");
  });

  it("exports MixedCache", () => {
    expect(FoxyApi.cache).toHaveProperty("MixedCache");
  });

  describe("FoxyApi.cache.MemoryCache", () => {
    it("is constructable", () => {
      expect(() => new FoxyApi.cache.MemoryCache()).not.toThrow();
    });

    it("returns undefined if key wasn't previously registered", async () => {
      const cache = new FoxyApi.cache.MemoryCache();
      expect(await cache.get("foo")).toBeUndefined();
    });

    it("can set and retrieve items", async () => {
      const cache = new FoxyApi.cache.MemoryCache();
      await cache.set("foo", "bar");
      expect(await cache.get("foo")).toBe("bar");
    });
  });

  describe("FoxyApi.cache.DiskCache", () => {
    const dir = ".tmp";

    beforeEach(() => mock({ [dir]: {} }));
    afterEach(() => mock.restore());

    it("is constructable", () => {
      expect(() => new FoxyApi.cache.DiskCache(dir)).not.toThrow();
    });

    it("returns undefined if key wasn't previously registered", async () => {
      const cache = new FoxyApi.cache.DiskCache(dir);
      expect(await cache.get("foo")).toBeUndefined();
    });

    it("can set and retrieve items", async () => {
      const cache = new FoxyApi.cache.DiskCache(dir);
      await cache.set("foo", "bar");
      expect(await cache.get("foo")).toBe("bar");
    });
  });

  describe("FoxyApi.cache.MixedCache", () => {
    it("is constructable", () => {
      expect(() => new FoxyApi.cache.MixedCache()).not.toThrow();
    });

    it("returns undefined if key wasn't previously registered", async () => {
      const cache = new FoxyApi.cache.MixedCache();
      expect(await cache.get("foo")).toBeUndefined();
    });

    it("can set and retrieve items", async () => {
      const lev01 = new FoxyApi.cache.MemoryCache();
      const lev02 = new FoxyApi.cache.MemoryCache();
      const cache = new FoxyApi.cache.MixedCache([lev01, lev02]);

      await cache.set("foo", "bar");

      expect(await cache.get("foo")).toBe("bar");
      expect(await lev01.get("foo")).toBe("bar");
      expect(await lev02.get("foo")).toBe("bar");
    });
  });
});
