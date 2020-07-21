import { FoxyApi } from "../../src";

describe("FoxyApi.sso", () => {
  beforeAll(() => jest.spyOn(Date, "now").mockImplementation(() => 1585402055672));

  it("exports createUrl function", () => {
    expect(FoxyApi.sso).toHaveProperty("createUrl");
    expect(typeof FoxyApi.sso.createUrl).toBe("function");
  });

  it("works with required params", () => {
    const url = FoxyApi.sso.createUrl({
      customer: 12345,
      secret: "yes, very",
      domain: "https://foxy-demo.foxycart.com",
    });

    expect(url).toBe(
      "https://foxy-demo.foxycart.com/checkout?fc_customer_id=12345&fc_auth_token=097e56e8db16788ec90b4857439098adc3fa8cb2&timestamp=1585402055672"
    );
  });

  it("explicitly sets the timestamp if provided", () => {
    const url = FoxyApi.sso.createUrl({
      customer: 12345,
      secret: "yes, very",
      domain: "https://foxy-demo.foxycart.com",
      timestamp: 1595406051672,
    });

    expect(url).toBe(
      "https://foxy-demo.foxycart.com/checkout?fc_customer_id=12345&fc_auth_token=2682b3c43e97c98efbe7102e5f46aea5ee81834c&timestamp=1595406051672"
    );
  });

  it("sets fcsid query param if session value is passed in", () => {
    const url = FoxyApi.sso.createUrl({
      customer: 12345,
      secret: "yes, very",
      domain: "https://foxy-demo.foxycart.com",
      session: "so_awesomely_unique",
    });

    expect(url).toBe(
      "https://foxy-demo.foxycart.com/checkout?fc_customer_id=12345&fc_auth_token=097e56e8db16788ec90b4857439098adc3fa8cb2&timestamp=1585402055672&fcsid=so_awesomely_unique"
    );
  });
});
