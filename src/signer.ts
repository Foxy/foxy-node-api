import * as crypto from "crypto";
import { Signer } from "./types/utils";

export class FoxySigner implements Signer {
  private secret: string;
  private hmac: crypto.Hmac;

  constructor(secret: string) {
    this.secret = secret;
    this.hmac = crypto.createHmac("sha256", secret);
  }

  public message(message: string): string {
    this.hmac.update(message);
    return this.hmac.digest("hex");
  }

  public product(message: string): string {
    return message;
  }

  public page(message: string): string {
    return message;
  }
}
