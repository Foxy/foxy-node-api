# Node.js FoxyCart hAPI client (deprecated)

**Hey there! This package is no longer maintained. We've learned a lot while beta testing this API client and built a brand new, better [`@foxy.io/sdk`](https://github.com/Foxy/foxy-sdk) package as a result. Check out our [upgrade guide](https://github.com/Foxy/foxy-node-api/blob/master/UPGRADE.md) for more details. Thank you to everyone who participated in our beta program and we hope that you will enjoy working with the new tools from Team Foxy :)**

## Setup

### Step 1: Install

```bash
npm i @foxy.io/node-api
```

### Step 2: Import

```js
const { FoxyApi } = require("@foxy.io/node-api");
```

With TypeScript or Node v13+ you can also use [ES Modules](http://nodejs.org/docs/latest-v13.x/api/esm.html…):

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
  silent: true, // don't log errors and such to console at all
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

`fetch` accepts a few parameters, including `query` and `zoom`, which can be used for searching, filtering, or otherwise modifying the request. For instance, here's an example showing how to retrieve a specific cart by ID:

```js
const getCart = async (id) => {
  const carts = await store.follow("fx:carts").fetch({
    query: { id },
    zoom: { items: ["item_options"] },
  });
  return carts._embedded["fx:carts"][0] || {};
};
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

## HMAC Validation

The HMAC validation is recommended to prevent a malicious user from tampering with your add-to-cart links and forms. Though you could also use the Foxy's webhooks (both the pre-payment and the post-payment webhooks) to validate orders, using our hmac link/form signing is recommend where possible. Refer to [HMAC Product Verification: Locking Down your Add-To-Cart Links and Forms](https://wiki.foxycart.com/v/2.0/hmac_validation) for technical details.

The HMAC signer utility is provided as part of the set of tools available in the `FoxyAPI`. It is available as the `hmacSign` property of `FoxyApi` instance.

### Signing

The FoxySigner utility provides the following basic methods:

- **hmacSign.htmlString(html: string)**: Signs an HTML snippet.
- **hmacSign.htmlFile(path: string, output: string)**: Signs an HTML file asynchronously.
- **hmacSign.url(url: string)**: Signs a URL.

There are also some more advanced methods that allow you to create signatures to be used in your fields and queries, thus integrating the signatures more directly in your application or templates.

Please, notice that **HMAC VALIDATION IS ALL OR NOTHING**. Signing individual name/value elements is only useful if you do sign all fields individually.

#### Obtaining a FoxySigner instance

When a new FoxyApi instance is created, it holds an `hmacSign` attribute, which is an instance of `FoxySigner`.

If you are not using `FoxyApi`, you can directly create an instance of `FoxySigner`, but you will be required to call the `setSecret` method in order to provide your key. Note that this is **HIGHLY RECOMMENDED** in situations where you don't actually need the full `FoxyApi`. [Principle of Least Privilege](https://en.wikipedia.org/wiki/Principle_of_least_privilege) stuff; don't include full API access in a system that only needs the `FoxySigner` secret.

##### Creating a signer without a FoxyApi instance

This is the recommended approach, unless you actually need the rest of `FoxyApi`.

```js
import { FoxySigner } from "@foxy.io/utils/signer";
const hmacSign = new FoxySigner();
hmacSign.setSecret("long-alphanumeric-client-secret");
```

##### Using your FoxyApi instance

Note, again, that unless you actually need `FoxyApi`, you should use the above method.

```ts
import { FoxyApi } from "@foxy.io/node-api";
const foxy = new FoxyApi({
  clientId: "client_MY-CLIENT-ID",
  clientSecret: "long-alphanumeric-client-secret",
  refreshToken: "long-alphanumeric-refresh-token",
});
const hmacSign = foxy.hmacSign;
```

#### Sign HTML

The simplest method is to sign a full HTML page.

Note that this option imposes a performance hit if you are building your pages in runtime. In real-world usage, you'd want to ensure this method is _not_ called on every pageload, for instance. You'd typically accomplish this by ensuring you have some degree of caching that prevents your pages from being dynamically built on every request.

```js
hmacSign.setSecret("MySuperSecretKey");
const signedHTML = hmacSign.htmlString(myHTMLcode);
```

You may also sign static HTML files.

This operation is asynchronous.

```js
hmacSign.setSecret("MySuperSecretKey");
const signedHTML = hmacSign.htmlFile(pathToInputFile, pathToOutputFile).then(callback);
```

#### Sign a URL

When simple links it is simpler and more efficient to sign the query string.

Please, notice that the URL query must contain the product
code.

Here is an example URL: `https://yourdomain.foxycart.com/cart?name=Flute%20Warm-Up%20Book&code=warmups&price=1.99`

Note that the **`code`** parameter is required. If `code` is not present, the URL will not be signed. (This goes for all links and forms.)

```js
hmacSign.setSecret("MySuperSecretKey");
const signedURL = hmacSign.url(unsigedURL);
```

The `signedURL` variable should be used as the link `href` attribute.

#### Sign individual name/value elements

Signing individual name/value elements is a more advanced topics. It will allow you to provide purchases of several products with a single click and to specify complex products.

You must, however, be sure to sign all the fields properly.

Please, **[refer to the documentation](https://wiki.foxycart.com/v/2.0/hmac_validation#the_howimplementation_details)** on how to use your signed values.

Here is how you obtain a signed name/value to use in your element.

```js
hmacSign.setSecret("MySuperSecretKey");
const signedName = hmacSign.name(unsignedName, code, parentCode, value);
```

```js
hmacSign.setSecret("MySuperSecretKey");
const signedValue = hmacSign.value(unsignedName, code, parentCode, value);
```

Please, be careful to use the signed value in the name or value attribute as described in the documentation.

Notably, the signed value is used for the `option` elements in a `select` element and also for radio buttons.

## Development

To get started, clone this repo locally and install the dependencies:

```bash
git clone https://github.com/foxy/foxy-node-api.git
npm install
```

Running tests:

```bash
npm run test       # runs all tests and exits
npm run test:watch # looks for changes and re-runs tests as you code
```

Committing changes with [commitizen](https://github.com/commitizen/cz-cli):

```bash
git commit # precommit hooks will lint the staged files and help you format your message correctly
```
