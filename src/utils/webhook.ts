import * as crypto from "crypto";

export interface VerificationParams {
  signature: string;
  payload: string;
  key: string;
}

export function verify(params: VerificationParams): boolean {
  const computedSignature = crypto
    .createHmac("sha256", params.key)
    .update(params.payload)
    .digest("hex");

  return params.signature === computedSignature;
}
