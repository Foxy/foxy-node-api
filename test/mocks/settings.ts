import { AuthInit } from "../../src/auth";

export const auth = {
  simple: {
    clientId: "0",
    clientSecret: "1",
    refreshToken: "42",
    endpoint: "https://api.foxy.local",
    silent: true,
  } as AuthInit,
  secretLess: {
    clientId: "0",
    clientSecret: "",
    refreshToken: "42",
    endpoint: "https://api.foxy.local",
    silent: true,
  } as AuthInit,
};
