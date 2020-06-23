import * as crypto from "crypto";
import { Signer } from "./types/utils";

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

  public queryArg(name: string, code: string, value?: string): string {
    name = name.replace(" ", "_");
    const signature = this.signProduct(code, name, value);
    const encodedName = encodeURIComponent(name).replace(/%20/g, "+");
    const encodedValue = encodeURIComponent(this.valueOrOpen(value)).replace(/%20/g, "+");
    const nameAttr = this.buildSignedQueryArg(encodedName, signature, encodedValue);
    return nameAttr;
  }

  public url(href: URL) {
    const old = [];
    for (const p of href.searchParams) {
      old.push(p[0]);
    }
    href.searchParams.getAll;
  }

  public inputName(name: string, code: string, value?: string): string {
    name = name.replace(" ", "_");
    const signature = this.signProduct(code, name, value);
    const encodedName = encodeURIComponent(name);
    const nameAttr = this.buildSignedName(encodedName, signature, value);
    return nameAttr;
  }

  public product(message: string): string {
    return message;
  }

  public page(message: string): string {
    return message;
  }

  private buildSignedName(name: string, signature: string, value?: string | number) {
    const open = value ? "" : "||open";
    return `${name}||${signature}${open}`;
  }

  private buildSignedQueryArg(name: string, signature: string, value?: string | number) {
    const open = value ? "" : "||open";
    return `${name}||${signature}${open}=${value}`;
  }

  private valueOrOpen(value: string | number | undefined): string | number {
    if (value === undefined) {
      return "--OPEN--";
    }
    return value;
  }
}
