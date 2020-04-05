import { Auth } from "../src/auth";
import { Resolver } from "../src/resolver";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import fetch, { RequestInit } from "node-fetch";
import { FOXY_API_URL } from "../src/env";
const { Response } = jest.requireActual("node-fetch") as typeof import("node-fetch");

jest.mock("node-fetch");

describe("Resolver", () => {
  const fetchAlias = (fetch as unknown) as jest.MockInstance<any, any>;

  fetchAlias.mockImplementation(async (url: string, options: RequestInit | undefined) => {
    const body = {} as any;

    if (url === "https://api.foxycart.dev/token" && options?.method === "POST") {
      body.access_token = "token_mock";
      body.expires_in = 360;
    }

    if (url === "https://api.foxycart.dev") {
      body._links = {
        "fx:store": { href: "https://api.foxycart.dev/stores/123" },
        "fx:user": { href: "https://api.foxycart.dev/users/456" },
      };
    }

    return new Response(JSON.stringify(body), { status: 200 });
  });

  const auth = new Auth({
    clientId: "0",
    clientSecret: "1",
    refreshToken: "42",
  });

  it("resolves with the base url when given an empty path", async () => {
    const url = "https://api.foxycart.dev";
    expect(await new Resolver(auth, [], url).resolve()).toBe(url);
    expect(await new Resolver(auth).resolve()).toBe(FOXY_API_URL);
  });

  it("appends numeric id to the url when provided with path", async () => {
    const resolver = new Resolver(auth, [123], "https://api.foxycart.dev");
    expect(await resolver.resolve()).toBe("https://api.foxycart.dev/123");
  });

  it("skips self rels when provided with path", async () => {
    const url = "https://api.foxycart.dev";
    expect(await new Resolver(auth, ["self"], url).resolve()).toBe(url);
  });

  it("adds offset=0 param to url when resolving first rels", async () => {
    const resolver = new Resolver(auth, [123, "first"], "https://api.foxycart.dev");
    expect(await resolver.resolve()).toBe("https://api.foxycart.dev/123?offset=0");
  });

  it("throws an error containing the response text on if fetch fails", async () => {
    fetchAlias.mockImplementationOnce(async () => new Response("error", { status: 500 }));
    const resolver = new Resolver(auth, ["fx:fakerel"]);
    await expect(resolver.resolve()).rejects.toThrow("error");
  });

  it("skips cache if called with skipCache === true", async () => {
    const resolver = new Resolver(auth, ["fx:user"], "https://api.foxycart.dev");
    await resolver.resolve();
    fetchAlias.mockClear();

    await resolver.resolve(true);
    expect(fetchAlias).toHaveBeenCalled();
  });

  {
    const rels = ["fx:store", "fx:user"];

    for (const rel of rels) {
      it(`caches ${rel} once fetched`, async () => {
        const resolver = new Resolver(auth, [rel], "https://api.foxycart.dev");
        await resolver.resolve();
        fetchAlias.mockClear();

        await resolver.resolve();
        expect(fetchAlias).not.toHaveBeenCalled();
      });
    }
  }

  {
    const map = {
      "https://api.foxycart.com/rels": "https://api.foxycart.dev/rels",
      "fx:property_helpers": "https://api.foxycart.dev/property_helpers",
      "fx:reporting": "https://api.foxycart.dev/reporting",
      "fx:encode": "https://api.foxycart.dev/encode",
      "fx:token": "https://api.foxycart.dev/token",
      "fx:store": "https://api.foxycart.dev/stores/123",
      "fx:user": "https://api.foxycart.dev/users/456",
      "fx:stores": "https://api.foxycart.dev/users/456/stores",
      "fx:subscription_settings": "https://api.foxycart.dev/store_subscription_settings/123",
      "fx:users": "https://api.foxycart.dev/stores/123/users",
      "fx:attributes": "https://api.foxycart.dev/stores/123/attributes",
      "fx:user_accesses": "https://api.foxycart.dev/stores/123/user_accesses",
      "fx:customers": "https://api.foxycart.dev/stores/123/customers",
      "fx:carts": "https://api.foxycart.dev/stores/123/carts",
      "fx:transactions": "https://api.foxycart.dev/stores/123/transactions",
      "fx:subscriptions": "https://api.foxycart.dev/stores/123/subscriptions",
      "fx:item_categories": "https://api.foxycart.dev/stores/123/item_categories",
      "fx:taxes": "https://api.foxycart.dev/stores/123/taxes",
      "fx:payment_method_sets": "https://api.foxycart.dev/stores/123/payment_method_sets",
      "fx:coupons": "https://api.foxycart.dev/stores/123/coupons",
      "fx:template_sets": "https://api.foxycart.dev/stores/123/template_sets",
      "fx:template_configs": "https://api.foxycart.dev/stores/123/template_configs",
      "fx:cart_templates": "https://api.foxycart.dev/stores/123/cart_templates",
      "fx:cart_include_templates": "https://api.foxycart.dev/stores/123/cart_include_templates",
      "fx:checkout_templates": "https://api.foxycart.dev/stores/123/checkout_templates",
      "fx:receipt_templates": "https://api.foxycart.dev/stores/123/receipt_templates",
      "fx:email_templates": "https://api.foxycart.dev/stores/123/email_templates",
      "fx:error_entries": "https://api.foxycart.dev/stores/123/error_entries",
      "fx:downloadables": "https://api.foxycart.dev/stores/123/downloadables",
      "fx:payment_gateways": "https://api.foxycart.dev/stores/123/payment_gateways",
      "fx:hosted_payment_gateways": "https://api.foxycart.dev/stores/123/hosted_payment_gateways",
      "fx:fraud_protections": "https://api.foxycart.dev/stores/123/fraud_protections",
      "fx:payment_methods_expiring": "https://api.foxycart.dev/stores/123/payment_methods_expiring",
      "fx:store_shipping_methods": "https://api.foxycart.dev/stores/123/store_shipping_methods",
      "fx:integrations": "https://api.foxycart.dev/stores/123/integrations",
      "fx:native_integrations": "https://api.foxycart.dev/stores/123/native_integrations",
      "fx:process_subscription_webhook":
        "https://api.foxycart.dev/stores/123/process_subscription_webhook",
    } as const;

    for (const rel in map) {
      it(`resolves ${rel}`, async () => {
        const resolver = new Resolver(auth, [rel], "https://api.foxycart.dev");
        expect(await resolver.resolve()).toBe(map[rel]);
      });
    }
  }
});
