import { FoxyApi } from "../src/index";

describe("Entry", () => {
  it("exports FoxyApi", () => {
    expect(FoxyApi).not.toBeUndefined();
  });

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
