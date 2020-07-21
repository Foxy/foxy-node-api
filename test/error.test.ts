import { ApiError } from "../src/error";
import { createNotFoundError } from "./mocks/errors";

describe("ApiError", () => {
  const cases = ["", "oh no!", '{"_embedded": {}}', '{"_embedded": {"fx:errors": null}}'];

  cases.forEach((rawText) => {
    it(`handles unexpected exceptions (case: ${rawText})`, () => {
      const status = 500;
      const error = new ApiError(rawText, status);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(Error);

      expect(error).toHaveProperty("rawText", rawText);
      expect(error).toHaveProperty("status", status);

      expect(error.message).toEqual(`Request failed with status ${status}`);
    });
  });

  it("handles hAPI exceptions", () => {
    const status = 400;
    const rawText = createNotFoundError("POST", "https://foxy.test/fake/path");
    const error = new ApiError(rawText, status);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);

    expect(error).toHaveProperty("rawText", rawText);
    expect(error).toHaveProperty("status", status);

    expect(error.message).toEqual(
      `Request failed with status ${status} and the following errors:\n- No route found for "POST /fake/path"`
    );
  });
});
