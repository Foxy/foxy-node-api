## Node.js FoxyCart hAPI client

> Warning: this is a pre-release software. We're still working on the feature set, documentation and test coverage. Using this package in production is not advised.

## Setup

### Step 1: Install

```bash
npm i @foxy.io/node-api
```

### Step 2: Import

```ts
import { FoxyApi } from "@foxy.io/node-api";
```

### Step 3: Initialize

```ts
const foxy = new FoxyApi({
  clientId: "client_MY-CLIENT-ID",
  clientSecret: "long-alphanumeric-client-secret",
  refreshToken: "long-alphanumeric-refresh-token",
});
```

#### Env vars

If you don't provide the full configuration, our hAPI client will look for the missing values in the env vars. At the moment, the following variables are available:

```bash
FOXY_API_CLIENT_ID     # config.clientId
FOXY_API_CLIENT_SECRET # config.clientSecret
FOXY_API_REFRESH_TOKEN # config.refreshToken
```

#### API version

You can also specify the API version you'd like to work with. At the moment only version 1 is supported and used by default. It's recommended to explicitly set the version because the default value may change in the future:

```ts
const foxy = new FoxyApi({
  // ...
  version: "1",
});
```

#### Cache

By default, `FoxyApi` will cache access tokens in memory. You can change that by providing an alternative caching mechanism, such as `DiskCache` that comes with this package:

```ts
const { DiskCache } = FoxyApi.cache;

const foxy = new FoxyApi({
  // ...
  cache: new DiskCache("./path/to/cache"),
});
```

You can also combine various cache providers together. It can be useful in serverless environments where your cloud function may benefit from using in-memory cache while running and save a request on cold start by reading the most recent data from disk cache:

```ts
const { MemoryCache, MixedCache, DiskCache } = FoxyApi.cache;

const foxy = new FoxyApi({
  // ...
  cache: new MixedCache(new MemoryCache(), new DiskCache("./path/to/cache")),
});
```

#### Logging

If you'd like to see debug messages or silence the logger completely, change the logger on initialization:

```ts
const foxy = new FoxyApi({
  // ...
  logLevel: "silly", // log everything
});
```

```ts
const foxy = new FoxyApi({
  // ...
  silence: true, // don't log errors and such to console at all
});
```

## Usage

### Obtain a reference

```ts
const store = foxy.follow("fx:stores").follow(8);

// for store there's also a root rel:
const store = foxy.follow("fx:store");
```

### Make a raw request (no url builder/resolver)

```ts
const store = await foxy.fetchRaw({
  url: new URL("/stores/8", FoxyApi.endpoint),
});
```

### GET, where available

```ts
await store.fetch({ method: "GET" });
// or simply:
await store.fetch();
```

#### Hint: opt out of smart path resolution

By default our client will try to leverage the built-in resolvers to make as few network calls as possible when following relations. These resolvers aren't perfect yet and even though we have a failsafe mechanism that runs a full tree traversal on failure, silent errors are still a possibility (e.g. when the resolved path is valid, but points to a wrong resource). In that case you can set `FetchInit.skipCache` option to `true` to disable smart path resolution:

```ts
await store.fetch({
  // ...
  skipCache: true,
});
```

### PUT / POST / PATCH, where available

```ts
await store.fetch({
  method: "PATCH",
  body: { store_name: "New Store Name" },
});

// or using a serialized payload:

await store.fetch({
  method: "PATCH",
  body: '{ "store_name": "New Store Name" }',
});
```

### DELETE, where available

```ts
await store.fetch({ method: "DELETE" });
```
