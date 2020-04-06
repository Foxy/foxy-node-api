import { FoxyApi } from "../src/index";
import { Follower } from "../src/follower";
import fetch, { RequestInit } from "node-fetch";

const { Response } = jest.requireActual("node-fetch") as typeof import("node-fetch");
jest.mock("node-fetch");

describe("Entry", () => {
  it("exports FoxyApi", () => {
    expect(FoxyApi).not.toBeUndefined();
  });

  describe("static members", () => {
    it("exposes API endpoint as a static property on FoxyApi", () => {
      expect(FoxyApi).toHaveProperty("endpoint");
    });

    it("initializes FoxyApi.endpoint with either FOXY_API_URL or https://api.foxycart.com", () => {
      expect(FoxyApi.endpoint).toBe(process.env.FOXY_API_URL ?? "https://api.foxycart.com");
    });

    it("exposes sanitize utils as a static property on FoxyApi", () => {
      expect(FoxyApi).toHaveProperty("sanitize");
    });

    it("exposes webhook utils as a static property on FoxyApi", () => {
      expect(FoxyApi).toHaveProperty("webhook");
    });

    it("exposes built-in cache providers as a static property on FoxyApi", () => {
      expect(FoxyApi).toHaveProperty("cache");
    });

    it("exposes sso utils as a static property on FoxyApi", () => {
      expect(FoxyApi).toHaveProperty("sso");
    });
  });

  describe("instance members", () => {
    const foxy = new FoxyApi({
      clientId: "0",
      clientSecret: "1",
      refreshToken: "42",
      endpoint: "https://api.foxy.local",
    });

    const fetchAlias = (fetch as unknown) as jest.MockInstance<any, any>;

    fetchAlias.mockImplementation(async (url: string, options: RequestInit | undefined) => {
      const body = {} as any;

      if (url === "https://api.foxy.local/token" && options?.method === "POST") {
        body.access_token = "token_mock";
        body.expires_in = 360;
      }

      if (url === "https://api.foxy.local") {
        body._links = { self: { href: "https://api.foxy.local" } };
      }

      return new Response(JSON.stringify(body), { status: 200 });
    });

    it("makes response objects followable with .from()", async () => {
      const example = { _links: { self: { href: "https://api.foxy.local/reporting" } } };
      const follower = foxy.from(example);

      expect(follower).toBeInstanceOf(Follower);
      expect(await follower.resolve()).toBe("https://api.foxy.local/reporting");
    });

    it("follows root rels with .follow()", async () => {
      const follower = foxy.follow("fx:reporting");

      expect(follower).toBeInstanceOf(Follower);
      expect(await follower.resolve()).toBe("https://api.foxy.local/reporting");
    });

    it("allows to .fetchRaw() without having to .follow() first", async () => {
      const response = await foxy.fetchRaw({ url: "https://api.foxy.local" });
      expect(response).toHaveProperty(["_links", "self", "href"], "https://api.foxy.local");
    });
  });
});
