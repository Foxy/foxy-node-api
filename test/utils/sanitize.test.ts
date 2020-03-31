import { FoxyApi } from "../../src/index";
import traverse from "traverse";

describe("FoxyApi.sanitize", () => {
  it("returns a functional property remover from .removeProperties()", () => {
    const mapper = FoxyApi.sanitize.removeProperties("foo");
    const result = traverse({ foo: 0, bar: 1 }).map(mapper);

    expect(result).not.toHaveProperty("foo");
    expect(result).toHaveProperty("bar");
  });

  it("returns a functional HAL link remover from .removeAllLinksExcept()", () => {
    const mapper = FoxyApi.sanitize.removeAllLinksExcept("foo");
    const result = traverse({ _links: { foo: 0, bar: 1 } }).map(mapper);

    expect(result._links).not.toHaveProperty("bar");
    expect(result._links).toHaveProperty("foo");
  });

  it("exposes a functional sensitive data remover as .removeSensitiveData", () => {
    const result = traverse({
      password: 1,
      password_hash: 1,
      third_party_id: 1,
      foo: 1,
    }).map(FoxyApi.sanitize.removeSensitiveData);

    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("password_hash");
    expect(result).not.toHaveProperty("third_party_id");
    expect(result).toHaveProperty("foo");
  });

  it("exposes a functional private attribute remover as .removePrivateAttributes", () => {
    const result = traverse({
      "fx:attributes": [
        {
          name: "foo",
          visibility: "private",
        },
        {
          name: "bar",
          visibility: "public",
        },
      ],
    }).map(FoxyApi.sanitize.removePrivateAttributes);

    expect(result["fx:attributes"]).toHaveLength(1);
    expect(result["fx:attributes"][0]).toHaveProperty("name", "bar");
  });

  it("exposes a traversal utility to run multiple mappers at once as FoxyApi.sanitize.all", () => {
    const target = { foo: "bar" };
    const mock1 = jest.fn();
    const mock2 = jest.fn();

    traverse(target).map(FoxyApi.sanitize.all(mock1, mock2));

    expect(mock1).toHaveBeenCalled();
    expect(mock2).toHaveBeenCalled();
  });
});
