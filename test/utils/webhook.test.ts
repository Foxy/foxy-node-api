import { FoxyApi } from "../../src";

describe("FoxyApi.webhook", () => {
  it("exports verify function", () => {
    expect(FoxyApi.webhook).toHaveProperty("verify");
    expect(typeof FoxyApi.webhook.verify).toBe("function");
  });

  it("returns false from verify() when webhook signature is invalid", () => {
    const result = FoxyApi.webhook.verify({
      signature: "i'm",
      payload: "very",
      key: "wrong",
    });

    expect(result).toBe(false);
  });

  it("returns true from verify() when webhook signature is valid", () => {
    const result = FoxyApi.webhook.verify({
      signature: "055c620a2d1e459b9c4ed676146a6cce9d2ec2e7caf3dba64608c30c4477f532",
      payload: "this, on the other hand",
      key: "is definitely right",
    });

    expect(result).toBe(true);
  });
});
