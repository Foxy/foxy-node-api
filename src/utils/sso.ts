import * as crypto from "crypto";

interface Options {
  timestamp?: number;
  session?: string;
  customer: string;
  secret: string;
  domain: string;
}

export function createUrl(options: Options) {
  const timestamp = options.timestamp ?? Date.now();
  const decodedToken = `${options.customer}|${timestamp}|${options.secret}`;
  const encodedToken = crypto.createHash("sha1").update(decodedToken);
  const url = new URL("/checkout", options.domain);

  url.searchParams.append("fc_customer_id", options.customer);
  url.searchParams.append("fc_auth_token", encodedToken.digest("hex"));
  url.searchParams.append("timestamp", String(timestamp));

  if (typeof options.session === "string") {
    url.searchParams.append("fcsid", options.session);
  }

  return url.toString();
}
