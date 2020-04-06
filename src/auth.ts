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
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  version?: Version;
  cache?: Cache;
  logLevel?: "error" | "warn" | "info" | "http" | "verbose" | "debug" | "silly";
  silent?: boolean;
  endpoint?: string;
};

type PostInit = {
  refreshToken?: string;
  clientSecret?: string;
  clientId?: string;
};

type PostResponse = {
  access_token: string;
  expires_in: number;
};

type StoredToken = {
  value: string;
  expiresAt: number;
};

export class Auth {
  private _logger: winston.Logger;

  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
  readonly endpoint: string;
  readonly version: Version;
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

  log(entry: winston.LogEntry) {
    this._logger.log(entry);
  }

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
