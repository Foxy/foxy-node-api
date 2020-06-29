import * as crypto from "crypto";
import { Signer, CodesDict } from "../types/utils";
import { JSDOM } from "jsdom";
import * as fs from "fs";

type codeObject = {
  name: string;
  prefix: string;
  codeString: string;
  value: string | number | null;
};

export class FoxySigner implements Signer {
  /** Methods are named after what it is to be signed, to
   * allow for an easy to read code in the user application.
   * i.e.: the method url, should be called as * foxy.hmacSign.url('http://...')
   */
  private secret?: string;

  constructor(secret: string | null = null) {
    if (secret) {
      this.setSecret(secret);
    }
  }

  public setSecret(secret: string): Signer {
    /** Sets the HMAC secret
     * It won't be possible to sign anythin without this secret */
    this.secret = secret;
    return this as Signer;
  }

  public htmlString(htmlStr: string) {
    /** Signs a whole HTML snippet */
    const dom = new JSDOM(htmlStr);
    const signed = this.fragment(dom.window.document);
    return dom.serialize();
  }

  public htmlFile(inputPath: string, outputPath: string) {
    /** Signs a file asynchronously */
    return new Promise((resolve, reject) => {
      JSDOM.fromFile(inputPath).then((dom) => {
        const signed = this.fragment(dom.window.document);
        fs.writeFile(outputPath, dom.serialize(), (err) => {
          if (err) reject(err);
          else resolve(signed);
        });
      });
    });
  }

  public url(urlStr: string): string {
    /** Signs a query string
     * All query fields withing the query string will be signed. */
    // Build a URL object
    if (this.isSigned(urlStr)) {
      console.error("Attempt to sign a signed URL", urlStr);
      return urlStr;
    }
    const url = new URL(urlStr);
    const stripped = new URL(url.origin);
    const original_params = url.searchParams;
    const new_params = stripped.searchParams;
    const code = this.getCodeFromURL(urlStr);
    // If there is no code, return the same URL
    if (!code) {
      return urlStr;
    }
    // sign the url object
    for (const p of original_params.entries()) {
      const signed = this.queryArg(
        decodeURIComponent(p[0]),
        decodeURIComponent(code),
        decodeURIComponent(p[1])
      ).split("=");
      new_params.set(signed[0], signed[1]);
    }
    url.search = new_params.toString();
    return this.replaceURLchars(url.toString());
  }

  public name(name: string, code: string, parentCode = "", value?: string | number): string {
    /** Signs an input name to be used in an input form field */
    name = name.replace(/ /g, "_");
    const signature = this.product(code + parentCode, name, value);
    const encodedName = encodeURIComponent(name);
    const nameAttr = this.buildSignedName(encodedName, signature, value);
    return nameAttr;
  }

  public value(name: string, code: string, parentCode = "", value?: string | number): string {
    /** Signs an input name to be used in an input form field */
    name = name.replace(/ /g, "_");
    const signature = this.product(code + parentCode, name, value);
    const valueAttr = this.buildSignedValue(signature, value);
    return valueAttr;
  }

  private product(code: string, name: string, value?: string | number): string {
    /** Signs a product composed of code, name and value */
    return this.message(code + name + this.valueOrOpen(value));
  }

  private queryArg(name: string, code: string, value?: string): string {
    /** Signs a sigle query argument to be used in qet * requests */
    name = name.replace(/ /g, "_");
    code = code.replace(/ /g, "_");
    const signature = this.product(code, name, value);
    const encodedName = encodeURIComponent(name).replace(/%20/g, "+");
    const encodedValue = encodeURIComponent(this.valueOrOpen(value)).replace(/%20/g, "+");
    const nameAttr = this.buildSignedQueryArg(encodedName, signature, encodedValue);
    return nameAttr;
  }

  private input(el: HTMLInputElement, codes: CodesDict): HTMLInputElement {
    /** Signs an input element */
    const splitted = this.splitNamePrefix(el.name);
    const nameString = splitted[1];
    const prefix = splitted[0];
    const code = codes[prefix].code;
    const parentCode = codes[prefix].parent;
    const value = el.value;
    const signedName = this.name(nameString, code, parentCode, value);
    el.setAttribute("name", prefix + ":" + signedName);
    return el;
  }

  private textArea(el: HTMLTextAreaElement, codes: CodesDict): HTMLTextAreaElement {
    /** Signs a texArea element */
    const splitted = this.splitNamePrefix(el.name);
    const nameString = splitted[1];
    const prefix = splitted[0];
    const code = codes[prefix].code;
    const parentCode = codes[prefix].parent;
    const value = "";
    const signedName = this.name(nameString, code, parentCode, value);
    el.setAttribute("name", prefix + ":" + signedName);
    return el;
  }

  private select(el: HTMLSelectElement, codes: CodesDict): HTMLSelectElement {
    /** Signs all option elements within a Select element */
    el.querySelectorAll("option").forEach((opt) => {
      this.option(opt, codes);
    });
    return el;
  }

  private option(
    /** Sign an option element
     * Signatures are added to the value attribute on options
     * This function may also be used to sign radio buttons
     */
    el: HTMLOptionElement | HTMLInputElement,
    codes: CodesDict
  ): HTMLOptionElement | HTMLInputElement {
    // Get the name parameter, either from the "select"
    // parent element of an option tag or from the name
    // attribute of the input element itself
    let n = (el as any).name;
    if (n === undefined) {
      const p = el.parentElement as HTMLSelectElement;
      n = p.name;
    }
    const splitted = this.splitNamePrefix(n);
    const nameString = splitted[1];
    const prefix = splitted[0];
    const code = codes[prefix].code;
    const parentCode = codes[prefix].parent;
    const value = el.value;
    const signedValue = this.value(nameString, code, parentCode, value);
    el.setAttribute("value", prefix + ":" + signedValue);
    return el;
  }

  private radio(el: HTMLInputElement, codes: CodesDict): HTMLInputElement {
    /** Signs a radio button. Radio buttons use the value attribute to hold their signatures. */
    return this.option(el, codes) as HTMLInputElement;
  }

  private splitNamePrefix(name: string): [number, string] {
    /** Splits a string using the prefix pattern for foxy store
     * The prefix pattern allows for including more than a single product in a given GET or POST request
     */
    const splitted = name.split(":");
    if (splitted.length == 2) {
      return [parseInt(splitted[0], 10), splitted[1]];
    }
    return [0, name];
  }

  private retrieveParentCode(formElement: Element, prefix: string | number = ""): string {
    /** Retrieve a parent code value from a form, given a prefix */
    let result = ""; // A blank string indicates no parent
    let separator = "";
    if (prefix) {
      separator = ":";
    }
    const parentCodeEl = formElement.querySelector(`[name='${prefix}${separator}parent_code']`);
    if (parentCodeEl) {
      const parentCode = parentCodeEl.getAttribute("value");
      if (parentCode !== null) {
        result = parentCode;
      }
    }
    return result;
  }

  private form(formElement: Element) {
    /** Signs a whole form element */
    const products = {};
    // Grab all codes within the form element
    const codeList: NodeList = formElement.querySelectorAll("[name$=code]");
    // If there is no code field, it shouldn't be signed
    if (codeList.length == 0) return;
    // Store all codes in a object
    const codes: any = {};
    for (const node of codeList) {
      const nameAttr = (node as Element).getAttribute("name");
      const codeValue = (node as Element).getAttribute("value");
      if (nameAttr && nameAttr.match(/^([0-9]{1,3}:)?code/)) {
        const splitted = nameAttr.split(":");
        const prefix = splitted[0];
        if (splitted.length == 2) {
          // Store prefix in codes list
          codes[prefix] = {
            code: codeValue,
            parent: this.retrieveParentCode(formElement, prefix),
          };
        } else if (codes[0] === undefined) {
          // Allow to push a single code without prefix
          codes[0] = {
            code: codeValue,
            parent: this.retrieveParentCode(formElement),
          };
        } else {
          const documentationURL =
            "https://wiki.foxycart.com/v/2.0/hmac_validation#multiple_products_in_one_form";
          const errorMsg = `There are multiple codes in the form element. Please, check ${documentationURL}`;
          throw new Error(errorMsg);
        }
      }
    }
    // Sign inputs
    formElement.querySelectorAll("input[name]").forEach((i) => {
      if (i.getAttribute("type") === "radio") {
        this.radio(i as HTMLInputElement, codes);
      } else {
        this.input(i as HTMLInputElement, codes);
      }
    });
    // Sign selects
    formElement
      .querySelectorAll("select[name]")
      .forEach((s) => this.select(s as HTMLSelectElement, codes));
    // Sign textAreas
    formElement
      .querySelectorAll("textarea[name]")
      .forEach((s) => this.textArea(s as HTMLTextAreaElement, codes));
  }

  private buildSignedName(name: string, signature: string, value?: string | number) {
    /** Builds a signed name given it components.
     * This method does not sign. */
    let open = this.valueOrOpen(value);
    open = this.valueOrOpen(value) == "--OPEN--" ? "||open" : "";
    return `${name}||${signature}${open}`;
  }

  private buildSignedValue(signature: string, value?: string | number) {
    /** Builds a signed name given it components.
     * This method does not sign. */
    let open = this.valueOrOpen(value);
    open = this.valueOrOpen(value) == "--OPEN--" ? "||open" : (value as string);
    return `${open}||${signature}`;
  }

  private buildSignedQueryArg(
    name: string,
    signature: string,
    value: string | number,
    open?: boolean
  ) {
    /** Builds a signed query argument given its components.
     * This method does not sign. */
    const openKey = open ? "||open" : "";
    return `${name}||${signature}${openKey}=${value}`;
  }

  private valueOrOpen(value: string | number | undefined): string | number {
    /** Retuns the value of a field on the --OPEN-- string if
     * the value is not defined. Please, notice that 0 is
     * treated as a acceptable value. */
    if (value === undefined || value === null || value === "") {
      return "--OPEN--";
    }
    return value;
  }

  /** Check if a href string is already signed signed
   * strings contains two consecutive pipes followed by 64
   * hexadecimal characters */
  private isSigned(url: string): boolean {
    return url.match(/^.*\|\|[0-9a-fA-F]{64}/) != null;
  }

  /** Returns the code from a HTMLAnchorElement or null if
   * it does not contain a code */
  private getCodeFromURL(url: string): string | undefined {
    for (const p of new URL(url).searchParams) {
      if (p[0] == "code") {
        return p[1];
      }
    }
  }

  /** Find all cart links in a document fragment that
   * contain a query parameter 'code' */
  private findCartLinks(doc: DocumentFragment) {
    return Array.from(doc.querySelectorAll("a")).filter((e) => this.getCodeFromURL(e.href));
  }

  /** Find all cart forms in a document fragment that
   * contain an input named code */
  private findCartForms(doc: DocumentFragment) {
    return Array.from(doc.querySelectorAll("form")).filter((e) => e.querySelector("[name=code]"));
  }

  /** Replace some of the characters encoded by * encodeURIComponent */
  private replaceURLchars(urlStr: string): string {
    return urlStr.replace(/%7C/g, "|").replace(/%3D/g, "=").replace(/%2B/g, "+");
  }

  public fragment(doc: DocumentFragment): DocumentFragment {
    /** Signs a document fragment.
     * This method is used to sign HTML snippets.
     */
    const links = doc.querySelectorAll("a");
    for (const l of links) {
      try {
        l.href = this.url(l.href);
      } catch (e) {
        console.assert(e.code === "ERR_INVALID_URL");
      }
    }
    const forms = this.findCartForms(doc);
    forms.forEach(this.form.bind(this));
    return doc;
  }

  private message(message: string): string {
    /** Signs a simple message
     * This function can only be invoked after the secret has
     * been defined.
     * The secret can be defined either in the construction
     * method as in `new FoxySigner(mySecret)` or by invoking
     * the setSecret method, as in signer.setSecret(mySecret);
     */
    if (this.secret === undefined) {
      throw new Error("No secret was provided to build the hmac");
    }
    const hmac = crypto.createHmac("sha256", this.secret);
    hmac.update(message);
    return hmac.digest("hex");
  }
}
