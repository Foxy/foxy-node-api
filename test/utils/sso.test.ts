import { FoxyApi } from "../../src";

describe("FoxyApi.sso", () => {
  beforeAll(() => jest.spyOn(Date, "now").mockImplementation(() => 1585402055672));

  it("exports createUrl function", () => {
    expect(FoxyApi.sso).toHaveProperty("createUrl");
    expect(typeof FoxyApi.sso.createUrl).toBe("function");
  });

  it("works with required params", () => {
    const url = FoxyApi.sso.createUrl({
      customer: "customer_01",
      secret: "yes, very",
      domain: "https://foxy-demo.foxycart.com",
    });

    expect(url).toBe(
      "https://foxy-demo.foxycart.com/checkout?fc_customer_id=customer_01&fc_auth_token=fd4cc69122044310b2b2f2d6a52cd87ed127c649&timestamp=1585402055672"
    );
  });

  it("explicitly sets the timestamp if provided", () => {
    const url = FoxyApi.sso.createUrl({
      customer: "customer_01",
      secret: "yes, very",
      domain: "https://foxy-demo.foxycart.com",
      timestamp: 1595406051672,
    });

    expect(url).toBe(
      "https://foxy-demo.foxycart.com/checkout?fc_customer_id=customer_01&fc_auth_token=1e8c54e3c73059092aeee83dc083bf07309f9799&timestamp=1595406051672"
    );
  });

  it("sets fcsid query param if session value is passed in", () => {
    const url = FoxyApi.sso.createUrl({
      customer: "customer_01",
      secret: "yes, very",
      domain: "https://foxy-demo.foxycart.com",
      session: "so_awesomely_unique",
    });

    expect(url).toBe(
      "https://foxy-demo.foxycart.com/checkout?fc_customer_id=customer_01&fc_auth_token=fd4cc69122044310b2b2f2d6a52cd87ed127c649&timestamp=1585402055672&fcsid=so_awesomely_unique"
    );
  });
});
