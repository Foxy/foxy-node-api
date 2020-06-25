import * as crypto from "crypto";
import { Signer, CodesDict } from "./types/utils";
import { JSDOM } from "jsdom";

type codeObject = {
  name: string;
  prefix: string;
  codeString: string;
  value: string | number | null;
};

export class FoxySigner implements Signer {
  private secret?: string;

  constructor(secret: string | null = null) {
    if (secret) {
      this.setSecret(secret);
    }
  }

  public setSecret(secret: string): Signer {
    this.secret = secret;
    return this;
  }

  public message(message: string): string {
    if (this.secret === undefined) {
      throw new Error("No secret was provided to build the hmac");
    }
    const hmac = crypto.createHmac("sha256", this.secret);
    hmac.update(message);
    return hmac.digest("hex");
  }

  public signProduct(code: string, name: string, value?: string | number): string {
    return this.message(code + name + this.valueOrOpen(value));
  }

  public inputName(name: string, code: string, parentCode = "", value?: string | number): string {
    name = name.replace(" ", "_");
    const signature = this.signProduct(code + parentCode, name, value);
    const encodedName = encodeURIComponent(name);
    const nameAttr = this.buildSignedName(encodedName, signature, value);
    return nameAttr;
  }

  public queryArg(name: string, code: string, value?: string): string {
    name = name.replace(" ", "_");
    const signature = this.signProduct(code, name, value);
    const encodedName = encodeURIComponent(name).replace(/%20/g, "+");
    const encodedValue = encodeURIComponent(this.valueOrOpen(value)).replace(/%20/g, "+");
    const nameAttr = this.buildSignedQueryArg(encodedName, signature, encodedValue);
    return nameAttr;
  }

  public queryString(query: string): string {
    return "result";
    //// If it's already signed, skip it.
    //if (strpos($querystring, '||')) {
    //    continue;
    //}
    //$pattern = '%(href=([\'"]))'.preg_quote(self::$cart_url, '%').'(?:\.php)?\?'.preg_quote($querystring, '%').'\2%i';
    //$signed = self::fc_hash_querystring($querystring, FALSE);
    //$html = preg_replace($pattern, '$1'.$signed.'$2', $html, -1, $count['temp']);
    //$count['links'] += $count['temp'];
  }

  public link(link: HTMLAnchorElement): HTMLAnchorElement {
    link.href = this.queryString(link.href);
    return link;
  }

  public input(el: HTMLInputElement, codes: CodesDict): HTMLInputElement {
    // TODO: Review the consequences for Inputs of types
    // radio and checkbox
    const splitted = this.splitNamePrefix(el.name);
    const nameString = splitted[1];
    const prefix = splitted[0];
    const code = codes[prefix].code;
    const parentCode = codes[prefix].parent;
    const value = el.value;
    const signedName = this.inputName(nameString, code, parentCode, value);
    el.setAttribute("name", prefix + ":" + signedName);
    return el;
  }

  public textArea(el: HTMLTextAreaElement, codes: CodesDict): HTMLTextAreaElement {
    // TODO: Review the consequences for Inputs of types
    // radio and checkbox
    const splitted = this.splitNamePrefix(el.name);
    const nameString = splitted[1];
    const prefix = splitted[0];
    const code = codes[prefix].code;
    const parentCode = codes[prefix].parent;
    const value = "";
    const signedName = this.inputName(nameString, code, parentCode, value);
    el.setAttribute("name", prefix + ":" + signedName);
    return el;
  }

  public select(el: HTMLSelectElement, codes: CodesDict): HTMLSelectElement {
    el.querySelectorAll("option").forEach((opt) => {
      const splitted = this.splitNamePrefix(el.name);
      const nameString = splitted[1];
      const prefix = splitted[0];
      const code = codes[prefix].code;
      const parentCode = codes[prefix].parent;
      const value = opt.value;
      const signedName = this.inputName(nameString, code, parentCode, value);
      opt.setAttribute("value", prefix + ":" + signedName);
    });
    return el;
  }

  private splitNamePrefix(name: string): [number, string] {
    const splitted = name.split(":");
    if (splitted.length == 2) {
      return [parseInt(splitted[0], 10), splitted[1]];
    }
    return [0, name];
  }

  /** Retrieve a parent code value from a form, given a
   * prefix */
  private retriveParentCode(formElement: Element, prefix: string | number = ""): string {
    // A blank string indicates no parent
    let result = "";
    let separator = "";
    if (prefix) {
      separator = ":";
    }
    const parentCodeEl = formElement.querySelector(`[name=${prefix}${separator}parent_code]`);
    if (parentCodeEl) {
      const parentCode = parentCodeEl.getAttribute("value");
      if (parentCode !== null) {
        result = parentCode;
      }
    }
    return result;
  }

  public form(formElement: Element) {
    const products = {};
    //  // Check for the "code" input, set the matches in $codes
    //  if (!preg_match_all('%<[^>]*?name=([\'"])([0-9]{1,3}:)?code\1[^>]*?>%i', $form, $codes, PREG_SET_ORDER)) {
    //      self::$log[] = '<strong style="color:#600;">No code found</strong> for the above form.';
    //      continue;
    //  }
    const codeList: NodeList = formElement.querySelectorAll("[name$=code]");
    if (codeList.length == 0) {
      // If there is no code field, it shouldn't be signed
      return;
    }

    // Simple list of integer codes
    const codes: any = {};

    for (const node of codeList) {
      const nameAttr = (node as Element).getAttribute("name");
      if (nameAttr && nameAttr.match(/^([0-9]{1,3}:)?code/)) {
        const splitted = nameAttr.split(":");
        const prefix = splitted[0];
        if (splitted.length == 2) {
          // Store prefix in codes list
          codes[prefix] = {
            code: splitted[1],
            parent: this.retriveParentCode(formElement, prefix),
          };
        } else if (codes.length == 0) {
          // Allow to push a single code without prefix
          codes[0] = {
            code: nameAttr,
            parent: this.retriveParentCode(formElement),
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
    const inputs = formElement
      .querySelectorAll("input[name]")
      .forEach((i) => this.input(i as HTMLInputElement, codes));

    const selects = formElement
      .querySelectorAll("select[name]")
      .forEach((s) => this.select(s as HTMLSelectElement, codes));
    const textAreas = formElement
      .querySelectorAll("textarea[name]")
      .forEach((s) => this.textArea(s as HTMLTextAreaElement, codes));
  }

  public product(message: string): string {
    return message;
  }

  public url(href: URL) {
    // Check if it is already signed
    // Check if there is a code field
    const old = [];
    const codes = [];
    const products = [];
    for (const p of href.searchParams) {
      old.push(p[0]);
      if (p[0] == "code") {
        codes.push(this.codeObject(p[0], p[1]));
      }
    }
    href.searchParams.getAll;
  }

  // TODO: find a propper name to this function
  // It is actually converting a pair of parameters into a
  // product field
  private codeObject(codeString: string, value: string | null): codeObject | null {
    const parts = codeString.split(":");
    if (parts.length != 2) {
      const parts = [0, codeString];
    }
    return {
      name: parts[1],
      prefix: parts[0],
      value,
      codeString,
    };
  }

  /**
   * Raw HTML Signing: Sign all links and form elements in a block of HTML
   *
   * Accepts a string of HTML and signs all links and forms.
   * Requires link 'href' and form 'action' attributes to use 'https' and not 'http'.
   * Requires a 'code' to be set in every form.
   *
   * @return string
   **/
  public page(document: Document): string {
    //// Find and sign all the links
    //preg_match_all('%<a .*?href=([\'"])'.preg_quote(self::$cart_url).'(?:\.php)?\?(.+?)\1.*?>%i', $html, $querystrings);
    const links = document.querySelectorAll("a");
    for (const l of links) {
      l.href = this.queryString(l.href);
    }
    const forms = document.querySelectorAll("forms");
    return "";
  }

  private buildSignedName(name: string, signature: string, value?: string | number) {
    let open = this.valueOrOpen(value);
    open = this.valueOrOpen(value) == "--OPEN--" ? open : "";
    return `${name}||${signature}${open}`;
  }

  private buildSignedQueryArg(name: string, signature: string, value?: string | number) {
    const open = value ? "" : "||open";
    return `${name}||${signature}${open}=${value}`;
  }

  private valueOrOpen(value: string | number | undefined): string | number {
    if (value === undefined || value === null || value === "") {
      return "--OPEN--";
    }
    return value;
  }
}
