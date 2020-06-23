import * as crypto from "crypto";
import { FoxyApi } from "../src";
import { auth as MockAuth } from "./mocks/settings";

const secret = "Your store's secret key.";

describe("Signer", () => {
  const foxy = new FoxyApi(MockAuth.simple);

  it("Signs a message", () => {
    expect(foxy.hmacSign.message("My secret message")).toBe(
      "070273763c37748d6da8ef8dde7ef847857c4d61a7016244df0b2843dbf417aa"
    );
  });

  it("Signs an input name", () => {
    const code = "ABC123";
    const name = "name";
    const value = "My Example Product";
    expect(foxy.hmacSign.inputName(name, code, value)).toBe(
      "name||dbaa042ec8018e342058417e058d7a479226976c7cb287664197fd67970c4715"
    );
  });

  it("Signs an input name with user edited values", () => {
    const code = "ABC123";
    const name = "name";
    expect(foxy.hmacSign.inputName(name, code)).toBe(
      "name||3f2075135e3455131bd0d6ce8643551e9e2e43bc09dd0474fa3effbe4e588c9e||open"
    );
  });

  it("Signs a query string", () => {
    const code = "ABC123";
    const name = "name";
    const value = "My Example Product";
    expect(foxy.hmacSign.queryArg(name, code, value)).toBe(
      "name||dbaa042ec8018e342058417e058d7a479226976c7cb287664197fd67970c4715=My+Example+Product"
    );
  });
});
