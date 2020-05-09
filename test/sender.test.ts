import { createNotFoundError, createForbiddenError } from "./mocks/errors";
import { Resolver } from "../src/resolver";
import { Sender } from "../src/sender";
import { Auth } from "../src/auth";
import { Graph } from "../src/types/api/graph";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import fetch from "node-fetch";
const { Response } = jest.requireActual("node-fetch") as typeof import("node-fetch");

jest.mock("node-fetch");

describe("Sender", () => {
  const auth = new Auth({
    clientId: "0",
    clientSecret: "1",
    refreshToken: "42",
    endpoint: "https://api.foxy.local",
    silent: true,
  });

  const fetchAlias = (fetch as unknown) as jest.MockInstance<any, any>;

  fetchAlias.mockImplementation(async (url: URL | string, options: RequestInit | undefined) => {
    const body = {} as any;

    if (url.toString() === "https://api.foxy.local/token" && options?.method === "POST") {
      body.access_token = "token_mock";
      body.expires_in = 360;
    } else {
      if ((options?.headers as any).Authorization !== "Bearer token_mock") {
        return new Response("Unauthorized", { status: 403 });
      }

      if (url.toString() === "https://api.foxy.local/foo/123") {
        return new Response(createNotFoundError("GET", url), { status: 404 });
      }

      if (url.toString() === "https://api.foxy.local/bar") {
        return new Response(createForbiddenError("GET", url), { status: 403 });
      }

      if (url.toString() === "https://api.foxy.local/foo") {
        body._links = body._links ?? {};
        body._links[123] = {};
        body._links[123].href = "https://api.foxy.local/foo/456";
        body.locale_code = "en_US";
        body.date_created = "2016-02-05T10:25:26-0800";
      }

      if (url.toString() === "https://api.foxy.local") {
        body._links = body._links ?? {};

        body._links["fx:foo"] = {};
        body._links["fx:foo"].href = "https://api.foxy.local/foo";

        body._links["fx:bar"] = {};
        body._links["fx:bar"].href = "https://api.foxy.local/bar";
      }
    }

    return new Response(JSON.stringify(body), { status: 200 });
  });

  it("extends Resolver", () => {
    const sender = new Sender(auth);
    expect(sender).toBeInstanceOf(Resolver);
  });

  describe(".fetchRaw()", () => {
    it("sends a request to the specified url", async () => {
      const url = "https://api.foxy.local";
      await new Sender(auth, [], "https://api.foxy.local").fetchRaw({ url });
      expect(fetchAlias).toHaveBeenLastCalledWith(url, expect.any(Object));
    });

    it("sends a GET request by default", async () => {
      await new Sender(auth, [], "https://api.foxy.local").fetchRaw({
        url: "https://api.foxy.local",
      });

      expect(fetchAlias).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "GET" })
      );
    });

    it("sends a request with a specific HTTP method if provided", async () => {
      await new Sender(auth, [], "https://api.foxy.local").fetchRaw({
        url: "https://api.foxy.local",
        method: "OPTIONS",
      });

      expect(fetchAlias).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "OPTIONS" })
      );
    });

    it("appends string body to the request as passed", async () => {
      const body = "foo";

      await new Sender(auth, [], "https://api.foxy.local").fetchRaw({
        url: "https://api.foxy.local",
        body,
      });

      expect(fetchAlias).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ body })
      );
    });

    it("appends a serialized body to the request if provided as object", async () => {
      const body = { foo: "bar" };

      await new Sender(auth, [], "https://api.foxy.local").fetchRaw({
        url: "https://api.foxy.local",
        body,
      });

      expect(fetchAlias).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ body: JSON.stringify(body) })
      );
    });

    it("normalizes locale codes in response", async () => {
      const response = await new Sender(auth).fetchRaw({ url: "https://api.foxy.local/foo" });
      expect(response).toHaveProperty("locale_code", "en-US");
    });

    it("normalizes timezone offsets in response", async () => {
      const response = await new Sender(auth).fetchRaw({ url: "https://api.foxy.local/foo" });
      expect(response).toHaveProperty("date_created", "2016-02-05T10:25:26-08:00");
    });
  });

  describe(".fetch()", () => {
    it("calls Resolver.resolve() internally to get the target url", async () => {
      const sender = new Sender(auth, ["fx:reporting"], "https://api.foxy.local");
      const spy = jest.spyOn(sender, "resolve");
      await sender.fetch().catch(() => void 0);

      expect(spy).toHaveBeenCalled();
    });

    it("calls .fetchRaw() internally with the resolved url", async () => {
      const sender = new Sender(auth, ["fx:reporting"], "https://api.foxy.local");
      const spy = jest.spyOn(sender, "fetchRaw");
      const url = new URL(await sender.resolve());
      await sender.fetch().catch(() => void 0);

      expect(spy).toHaveBeenLastCalledWith({ url });
    });

    it("adds query params to the url when provided in args as Object", async () => {
      const sender = new Sender(auth, ["fx:reporting"], "https://api.foxy.local");
      const spy = jest.spyOn(sender, "fetchRaw");
      const url = new URL(await sender.resolve());

      url.searchParams.set("foo", "bar");
      await sender.fetch({ query: { foo: "bar" } }).catch(() => void 0);

      expect(spy).toHaveBeenLastCalledWith({ url });
    });

    it("adds query params to the url when provided in args as URLSearchParams", async () => {
      const sender = new Sender(auth, ["fx:reporting"], "https://api.foxy.local");
      const spy = jest.spyOn(sender, "fetchRaw");
      const url = new URL(await sender.resolve());

      url.searchParams.set("foo", "bar");
      await sender.fetch({ query: url.searchParams }).catch(() => void 0);

      expect(spy).toHaveBeenLastCalledWith({ url });
    });

    it("adds fields param to the request query params if provided", async () => {
      const sender = new Sender<Graph, "fx:token">(auth, ["fx:token"], "https://api.foxy.local");
      const spy = jest.spyOn(sender, "fetchRaw");
      const url = new URL(await sender.resolve());

      url.searchParams.set("fields", "scope,expires_in");
      await sender.fetch({ fields: ["scope", "expires_in"] }).catch(() => void 0);

      expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ url }));
    });

    it("serializes the zoom param if provided and adds it to the query params", async () => {
      const sender = new Sender<any, any>(auth, [], "https://api.foxy.local");
      const tests = ["foo", ["foo", "bar"], { foo: "bar" }, ["foo", { bar: "baz" }]];
      const zooms = ["foo", "foo,bar", "foo:bar", "foo,bar:baz"].map(encodeURIComponent);

      for (const test of tests) {
        const spy = jest.spyOn(sender, "fetchRaw");
        const url = new URL(`https://api.foxy.local/?zoom=${zooms[tests.indexOf(test)]}`);

        await sender.fetch({ zoom: test as any }).catch(() => void 0);
        expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ url }));
      }
    });

    it("merges and dedupes fields param with the fields in query", async () => {
      const sender = new Sender<Graph, "fx:token">(auth, ["fx:token"], "https://api.foxy.local");
      const spy = jest.spyOn(sender, "fetchRaw");
      const url = new URL(await sender.resolve());

      url.searchParams.set("fields", "expires_in,access_token,scope");

      try {
        await sender.fetch({
          fields: ["scope", "expires_in", "access_token"],
          query: { fields: "expires_in,access_token" },
        });
      } catch {}

      expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ url }));
    });

    it("passes params.method to .fetchRaw() when provided in args", async () => {
      const sender = new Sender(auth, ["fx:reporting"], "https://api.foxy.local");
      const spy = jest.spyOn(sender, "fetchRaw");
      const method = "OPTIONS";
      await sender.fetch({ method }).catch(() => void 0);

      expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ method }));
    });

    it("passes params.body to .fetchRaw() when provided in args", async () => {
      const sender = new Sender(auth, ["fx:reporting"], "https://api.foxy.local");
      const spy = jest.spyOn(sender, "fetchRaw");
      const body = { foo: "bar" };
      await sender.fetch({ body }).catch(() => void 0);

      expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ body }));
    });

    it("passes params.skipCache to Resolver.resolve() when provided in args", async () => {
      const sender = new Sender(auth, ["fx:reporting"], "https://api.foxy.local");
      const spy = jest.spyOn(sender, "resolve");
      const skipCache = true;
      await sender.fetch({ skipCache }).catch(() => void 0);

      expect(spy).toHaveBeenCalledWith(skipCache);
    });

    it("disables smart resolution for request when it fails and tries again", async () => {
      const sender = new Sender(auth, ["fx:foo", 123], "https://api.foxy.local");
      const spy = jest.spyOn(sender, "resolve");
      await sender.fetch().catch(() => void 0);

      expect(spy).toHaveBeenNthCalledWith(1, undefined);
      expect(spy).toHaveBeenNthCalledWith(2, true);
    });

    it("doesn't attempt 2nd traversal on any other server error except 404", async () => {
      const sender = new Sender(auth, ["fx:bar"], "https://api.foxy.local");
      const spy = jest.spyOn(sender, "resolve");

      await expect(sender.fetch()).rejects.toThrowError();
      expect(spy).toHaveBeenNthCalledWith(1, undefined);
      expect(spy).not.toHaveBeenNthCalledWith(2, true);
    });
  });
});
