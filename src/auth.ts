import * as winston from "winston";
import * as logform from "logform";
import fetch from "node-fetch";
import { Cache, MemoryCache } from "./utils/cache";
import { Props } from "./types/props";

import {
  FOXY_API_CLIENT_ID,
  FOXY_API_CLIENT_SECRET,
  FOXY_API_REFRESH_TOKEN,
  FOXY_API_URL,
} from "./env";

type Version = "1";

type AuthInit = {
  /**
   * OAuth2 client ID for your integration.
   * If omitted from the config, the value of the `FOXY_API_CLIENT_ID` env var will be used.
   *
   * @see https://api.foxycart.com/docs/authentication
   * @tutorial https://api.foxycart.com/docs/authentication/client_creation
   */
  clientId?: string;

  /**
   * OAuth2 client secret for your integration.
   * If omitted from the config, the value of the `FOXY_API_CLIENT_SECRET` env var will be used.
   *
   * @see https://api.foxycart.com/docs/authentication
   * @tutorial https://api.foxycart.com/docs/authentication/client_creation
   */
  clientSecret?: string;

  /**
   * OAuth2 long-term refresh token for your integration.
   * If omitted from the config, the value of the `FOXY_API_REFRESH_TOKEN` env var will be used.
   *
   * @see https://api.foxycart.com/docs/authentication
   * @tutorial https://api.foxycart.com/docs/authentication/client_creation
   */
  refreshToken?: string;

  /**
   * API version to use when making requests.
   * So far we have just one ("1") and it's used by default.
   */
  version?: Version;

  /**
   * Cache provider to store access token and other temporary values with.
   * See the available built-in options under `FoxyApi.cache` or supply your own.
   */
  cache?: Cache;

  /**
   * Determines how verbose our client will be when logging.
   * By default, only errors are logged. To log all messages, set this option to `silly`.
   */
  logLevel?: "error" | "warn" | "info" | "http" | "verbose" | "debug" | "silly";

  /** Pass `true` to completely disable logging (`false` by default). */
  silent?: boolean;

  /**
   * Allows changing the API endpoint. You'll most likely never need to use this option.
   * A value of the `FOXY_API_URL` env var will be used if found.
   * Default value is `https://api.foxycart.com`.
   */
  endpoint?: string;
};

type StoredToken = {
  value: string;
  expiresAt: number;
};

export class Auth {
  private _logger: winston.Logger;

  /** OAuth2 client ID for your integration (readonly).*/
  readonly clientId: string;

  /** OAuth2 client secret for your integration (readonly). */
  readonly clientSecret: string;

  /** OAuth2 refresh token for your integration (readonly). */
  readonly refreshToken: string;

  /** API endpoint that requests are made to (readonly). */
  readonly endpoint: string;

  /** API version used when making requests (readonly). */
  readonly version: Version;

  /** Cache implementation used with this instance (readonly). */
  readonly cache: Cache;

  constructor(config?: AuthInit) {
    const clientId = config?.clientId ?? FOXY_API_CLIENT_ID;
    if (!clientId) throw new Error("config.clientId or FOXY_API_CLIENT_ID is missing");

    const clientSecret = config?.clientSecret ?? FOXY_API_CLIENT_SECRET;
    if (!clientSecret) throw new Error("config.clientSecret or FOXY_API_CLIENT_SECRET is missing");

    const refreshToken = config?.refreshToken ?? FOXY_API_REFRESH_TOKEN;
    if (!refreshToken) throw new Error("config.refreshToken or FOXY_API_REFRESH_TOKEN is missing");

    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.refreshToken = refreshToken;
    this.version = config?.version ?? "1";
    this.cache = config?.cache ?? new MemoryCache();
    this.endpoint = config?.endpoint ?? FOXY_API_URL;

    this._logger = winston.createLogger({
      level: config?.logLevel,
      silent: config?.silent,
      transports: [new winston.transports.Console()],
      format: logform.format.combine(
        logform.format.colorize(),
        logform.format.timestamp(),
        logform.format.padLevels(),
        logform.format.printf((v) => `[${v.timestamp}] ${v.level}: ${v.message}`)
      ),
    });
  }

  /**
   * Formats and logs a message if `logLevel` param value allows it.
   *
   * @example
   *
   * foxy.log({
   *   level: "http",
   *   message: "Sending a GET request..."
   * });
   *
   * @param entry the {@link https://www.npmjs.com/package/winston winston} logger options
   */
  log(entry: winston.LogEntry) {
    this._logger.log(entry);
  }

  /**
   * Fetches and caches the access token for this integration.
   * Will return a cached value if there is one and it's still valid, otherwise
   * will make an API request and update cache before returning the fresh token.
   *
   * @example
   *
   * const token = await foxy.getAccessToken();
   *
   * @see https://api.foxycart.com/rels/token
   * @tutorial https://api.foxycart.com/docs/authentication
   */
  async getAccessToken(): Promise<string> {
    const token = await this.cache.get("fx_auth_access_token");
    if (this._validateToken(token)) return (JSON.parse(token) as StoredToken).value;

    const response = await fetch(`${this.endpoint}/token`, {
      method: "POST",
      headers: {
        "FOXY-API-VERSION": this.version,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
        client_secret: this.clientSecret,
        client_id: this.clientId,
      }),
    });

    const text = await response.text();

    if (response.ok) {
      const json = JSON.parse(text) as Props["fx:token"];
      const storedToken: StoredToken = {
        expiresAt: Date.now() + json.expires_in * 1000,
        value: json.access_token,
      };

      await this.cache.set("fx_auth_access_token", JSON.stringify(storedToken));
      return json.access_token;
    } else {
      throw new Error(text);
    }
  }

  private _validateToken(token: string | undefined): token is string {
    if (token) {
      try {
        const parsedToken = JSON.parse(token) as StoredToken;
        return parsedToken.expiresAt > Date.now() / 1000 + 300;
      } catch (e) {}
    }

    return false;
  }
}
