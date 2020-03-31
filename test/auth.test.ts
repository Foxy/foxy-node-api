import { FoxyApi } from "../src";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import fetch from "node-fetch";

async function createFoxy(...args: ConstructorParameters<typeof FoxyApi>) {
  return new FoxyApi({
    clientId: "0",
    clientSecret: "1",
    refreshToken: "42",
    ...args[0],
  });
}

jest.mock("node-fetch");

describe("Entry: Auth", () => {
  it("throws when initialized without required args and env vars", async () => {
    const { FoxyApi } = await import("../src");

    expect(() => new FoxyApi()).toThrow();
    expect(() => new FoxyApi({ clientId: "0" })).toThrow();
    expect(() => new FoxyApi({ clientId: "0", clientSecret: "1" })).toThrow();
  });

  it("inherits values from env vars when initialized without args", async () => {
    const { FOXY_API_CLIENT_ID, FOXY_API_CLIENT_SECRET, FOXY_API_REFRESH_TOKEN } = process.env;

    jest.resetModules();

    process.env.FOXY_API_CLIENT_ID = "it's me!";
    process.env.FOXY_API_CLIENT_SECRET = "mario!";
    process.env.FOXY_API_REFRESH_TOKEN = "cosa esta...?";

    const { FoxyApi } = await import("../src");
    const foxy = new FoxyApi();

    expect(foxy).toHaveProperty("clientId", process.env.FOXY_API_CLIENT_ID);
    expect(foxy).toHaveProperty("clientSecret", process.env.FOXY_API_CLIENT_SECRET);
    expect(foxy).toHaveProperty("refreshToken", process.env.FOXY_API_REFRESH_TOKEN);

    process.env.FOXY_CLIENT_ID = FOXY_API_CLIENT_ID;
    process.env.FOXY_CLIENT_SECRET = FOXY_API_CLIENT_SECRET;
    process.env.FOXY_REFRESH_TOKEN = FOXY_API_REFRESH_TOKEN;
  });

  it("uses config values provided explicitly via args", async () => {
    const foxy = await createFoxy();

    expect(foxy).toHaveProperty("clientId", "0");
    expect(foxy).toHaveProperty("clientSecret", "1");
    expect(foxy).toHaveProperty("refreshToken", "42");
  });

  it("uses version 1 of the api by default", async () => {
    const foxy = await createFoxy();
    expect(foxy).toHaveProperty("version", "1");
  });

  it("uses MemoryCache by default", async () => {
    const foxy = await createFoxy();
    expect(foxy.cache).toBeInstanceOf(FoxyApi.cache.MemoryCache);
  });

  it("sets cache on instance if specified in constructor args", async () => {
    const cache = new FoxyApi.cache.DiskCache("tmp");
    const foxy = await createFoxy({ cache });

    expect(foxy.cache).toBe(cache);
  });

  it("fetches access token on getAccessToken() call", async () => {
    (fetch as any).mockReturnValue(
      Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              access_token: "token_mock",
              expires_in: 360,
            })
          ),
      })
    );
    const foxy = await createFoxy();
    const token = await foxy.getAccessToken();

    expect(token).toBe("token_mock");
  });

  it("throws on non-2xx response in getAccessToken() call", async () => {
    (fetch as any).mockReturnValue(
      Promise.resolve({ ok: false, text: () => Promise.resolve("whoops!") })
    );

    const foxy = await createFoxy();
    expect(foxy.getAccessToken()).rejects.toBeInstanceOf(Error);
  });

  it("fetches access token from cache if possible on getAccessToken() call", async () => {
    const foxy = await createFoxy();

    await foxy.cache.set(
      "fx_auth_access_token",
      JSON.stringify({
        value: "cached_token_mock",
        expiresAt: Date.now() + 3600000,
      })
    );

    expect(await foxy.getAccessToken()).toBe("cached_token_mock");
  });
});
