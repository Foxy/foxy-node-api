import * as crypto from "crypto";
import { JSDOM } from "jsdom";
import { FoxyApi } from "../src";
import { auth as MockAuth } from "./mocks/settings";

const secret = "Your store's secret key.";

describe("Signer", () => {
  const foxy = new FoxyApi(MockAuth.simple);
  const mockHTML = `
  <p>Here is a fragment of HTML</p>
  <section id="itsComplex">
  <div class="test">
  <a id="linktobesigned" href="http://storename?code=ABC123&name=name&value=My Example Product">Here is the link</a>
    </div>
  <a href="http://example.com">This is a common example</a>
    </section>
  `;
  const signedMockHTML = `
  <p>Here is a fragment of HTML</p>
  <section id="itsComplex">
  <div class="test">
  <a id="linktobesigned" href="http://storename?code=ABC123&name||dbaa042ec8018e342058417e058d7a479226976c7cb287664197fd67970c4715=name&value=My+Example+Product">Here is the link</a>
    </div>
  <a href="http://example.com">This is a common example</a>
    </section>
  `;

  it("Signs a message", () => {
    expect(foxy.hmacSign.message("My secret message")).toBe(
      "070273763c37748d6da8ef8dde7ef847857c4d61a7016244df0b2843dbf417aa"
    );
  });

  it("Signs an input name", () => {
    const code = "ABC123";
    const name = "name";
    const value = "My Example Product";
    expect(foxy.hmacSign.inputName(name, code, "", value)).toBe(
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

  it("Finds all links in HTML text", () => {
    expect(foxy.hmacSign.findLinks(JSDOM.fragment(mockHTML)).length).toBe(2);
  });

  it("Finds all the cart Links within a piece of document", () => {
    expect(foxy.hmacSign.findCartLinks(JSDOM.fragment(mockHTML)).length).toBe(1);
  });

  it("Signs all links in a code fragment", () => {
    expect(
      foxy.hmacSign.fragment(JSDOM.fragment(mockHTML)).querySelector("#linktobesigned").href
    ).toBe(
      "http://storename/?code||376d15f565ec374d45571878a14d3f5a705c7ea6b9aea42c1e1b3a39ac1ba7f8=ABC123&name||a0db12544b12078e411f2bb388c470bf099a14b21035d782ecb1bd5bef89a0e0=name&value||dd47bac2aeb87bd6c118d3f89797ab6eddb058ce17a1e302233ba7a00e7b4db4=My+Example+Product"
    );
  });

  it("Signs a whole URL", () => {
    const fullURL =
      "http://mockdomain.mock/?code=mycode&name=testname&price=123.00&other atribute=Some Other Thing";
    const signedURL =
      "http://mockdomain.mock/?" +
      "code||43f429e41303929871266b879a880efce32b35bda757e70f527bc5c8e1353c0a=mycode&" +
      "name||07f23df6159ba32f01de36db07bf998d7661bda812a7c0d597cfacdefe0f0064=testname&" +
      "price||aed2692b1b278b04b974c3c9822e597dc5da880561cf256ab20b2873a5346b66=123.00&" +
      "other_atribute||98700cf679c5d7394e3e33b883f18683664b4843707f916a0739ba1c9adeabab=Some+Other+Thing";
    expect(foxy.hmacSign.queryString(fullURL)).toBe(signedURL);
  });

  //it("Signs a whole Form", () => {
  //  const formHTML = `
  //  <form action="https://your-actual-store-domain.foxycart.com/cart" method="post" accept-charset="utf-8" class="foxycart">
  //    <input type="hidden" name="name" value="Example T-Shirt" />
  //  <input type="hidden" name="code" value="abc123" />
  //  <input type="hidden" name="price" value="25" />
  //  <select name="size">
  //  <option value="small{p-2}">Small</option>
  //  <option value="medium">Medium</option>
  //  <option value="large{p+3}">Large</option>
  //  </select>
  //  <label>Qty: <input type="text" name="quantity" value="" /></label>
  //  <p><input type="submit" value="Buy It!"></p>
  //  </form>
  //  `;
  //  const signedFormHTML = `
  //  <form action="https://your-actual-store-domain.foxycart.com/cart" method="post" accept-charset="utf-8" class="foxycart">
  //    <input type="hidden" name="name||f8d3b7b993380dee31ee467984397ed8dc5feec3eb464bc55264cbe33fd691ac" value="Example T-Shirt" />
  //  <input type="hidden" name="code||8211b9acfbe1ae395dc32bf5ccfa20ab50382d48a65fa3586803288aacbe9ca4" value="abc123" />
  //  <input type="hidden" name="price||f842ce83aff26e640c1958c3f6f9cba033fbe2a9e53c91b92004d32ee185457c" value="25" />
  //  <select name="size">
  //  <option value="small{p-2}||14696b9ff099727a798a5b59d71bc1540a5481adfd957ed2252acf8aec83914a">Small</option>
  //  <option value="medium||713800d729f987d4609a8b83b60932e64f64690b4c2842b7d6522a62fe514af4">Medium</option>
  //  <option value="large{p+3}||c8d37d7c32c3c4fc9fe9703e8cc3456020aa9319dd18816d7f887c6f9c616708">Large</option>
  //  </select>
  //  <label>Qty: <input type="text" name="quantity||753d51d4675bfb6f0aec5e6fbfd8a2e32cbea620c15a181567b052d350469c50||open" value="" /></label>
  //  <p><input type="submit" value="Buy It!"></p>
  //  `;
  //  expect(foxy.hmacSign.htmlString(formHTML)).toBe("falso");

  //});
});
