import * as crypto from "crypto";
import { FoxyApi } from "../src";
import { auth as MockAuth } from "./mocks/settings";

const secret = "Your store's secret key.";

describe("Signer", () => {
  it("Signs a message", () => {
    const foxy = new FoxyApi(MockAuth.simple);
    foxy.hmacSign.message("My secret message") ==
      "070273763c37748d6da8ef8dde7ef847857c4d61a7016244df0b2843dbf417aa";
  });
});
