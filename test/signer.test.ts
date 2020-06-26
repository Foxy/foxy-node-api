import * as crypto from "crypto";
import * as fs from "fs";
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
  const outputPath = "/tmp/foxyTestOutput.html";

  it("Signs a message", () => {
    expect(foxy.hmacSign.message("My secret message")).toBe(
      "070273763c37748d6da8ef8dde7ef847857c4d61a7016244df0b2843dbf417aa"
    );
  });

  it("Signs an input name", () => {
    const code = "ABC123";
    const name = "name";
    const value = "My Example Product";
    expect(foxy.hmacSign.name(name, code, "", value)).toBe(
      "name||dbaa042ec8018e342058417e058d7a479226976c7cb287664197fd67970c4715"
    );
  });

  it("Signs an input name with user edited values", () => {
    const code = "ABC123";
    const name = "name";
    expect(foxy.hmacSign.name(name, code, "")).toBe(
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
    expect(foxy.hmacSign.url(fullURL)).toBe(signedURL);
  });

  it("Signs a whole HTML string", () => {
    const htmlString = fs.readFileSync("./test/mocks/html/onepage.html").toString();
    const signedHTML = foxy.hmacSign.htmlString(htmlString);
    // e.g: ||aed2692b1b278b04b974c3c9822e597dc5da880561cf256ab20b2873a5346b66=
    const signatureRegex = /\|\|[0-9a-fA-F]{64}=/;
    const expectedAttributeMatches = [/name/, /price/, /quantity/];
    for (const p of expectedAttributeMatches) {
      const toMatch = new RegExp(p.source + signatureRegex.source, "g");
      const signedItems = signedHTML.match(toMatch);
      expect(signedItems.length).toBe(31);
    }
  });

  it("Signs an HTML string", () => {
    const htmlString = fs.readFileSync("./test/mocks/html/onepagewithforms.html").toString();
    const signedHTML = foxy.hmacSign.htmlString(htmlString);
    // e.g: ||aed2692b1b278b04b974c3c9822e597dc5da880561cf256ab20b2873a5346b66=
    const namePrefixRegex = /name="\d{1,3}:/;
    const valuePrefixRegex = /value="\d{1,3}:/;
    const signatureRegex = /\|\|[0-9a-fA-F]{64}\W/;
    const expectedAttributeMatches: [RegExp, RegExp, number][] = [
      [namePrefixRegex, /name/, 3],
      [namePrefixRegex, /price/, 3],
      [namePrefixRegex, /code/, 3],
      [valuePrefixRegex, /small\{p-2\}/, 3],
      [valuePrefixRegex, /medium/, 3],
      [valuePrefixRegex, /large\{p\+3\}/, 3],
      [namePrefixRegex, /quantity/, 3],
    ];
    for (const p of expectedAttributeMatches) {
      const toMatch = new RegExp(p[0].source + p[1].source + signatureRegex.source, "g");
      const signedItems = signedHTML.match(toMatch);
      expect(signedItems.length).toBe(p[2]);
    }
  });

  it("Signs an HTML file", async () => {
    const inputPath = "./test/mocks/html/onepagewithforms.html";
    await foxy.hmacSign.htmlFile(inputPath, outputPath);
    const result = fs.readFileSync(outputPath).toString();
    const namePrefixRegex = /name="\d{1,3}:/;
    const valuePrefixRegex = /value="\d{1,3}:/;
    const signatureRegex = /\|\|[0-9a-fA-F]{64}\W/;
    const expectedAttributeMatches: [RegExp, RegExp, number][] = [
      [namePrefixRegex, /name/, 3],
      [namePrefixRegex, /price/, 3],
      [namePrefixRegex, /code/, 3],
      [valuePrefixRegex, /small\{p-2\}/, 3],
      [valuePrefixRegex, /medium/, 3],
      [valuePrefixRegex, /large\{p\+3\}/, 3],
      [namePrefixRegex, /quantity/, 3],
    ];
    for (const p of expectedAttributeMatches) {
      const toMatch = new RegExp(p[0].source + p[1].source + signatureRegex.source, "g");
      const signedItems = result.match(toMatch);
      expect(signedItems.length).toBe(p[2]);
    }
  });

  it("Signs fields with editable values", async () => {
    // Reuse previously generated signed html
    const result = fs.readFileSync(outputPath).toString();
    const colorEditable = /name="\d{1,3}:color\|\|[0-9a-fA-F]{64}||open\W/;
    const additionalDetails = /name="\d{1,3}:additional-details\|\|[0-9a-fA-F]{64}||open\W/;
    let signedItems = result.match(colorEditable);
    expect(signedItems.length).toBe(1);
    signedItems = result.match(additionalDetails);
    expect(signedItems.length).toBe(1);
  });
});
