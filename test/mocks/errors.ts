import { URL } from "url";

const createError = (message: any) => {
  return JSON.stringify({
    total: 1,
    _links: {
      curies: [
        {
          name: "fx",
          href: "https://api.foxycart.com/rels/{rel}",
          templated: true,
        },
      ],
    },
    _embedded: {
      "fx:errors": [
        {
          logref: `id-${Date.now()}`,
          message,
        },
      ],
    },
  });
};

export const createNotFoundError = (method: string, url: URL | string) => {
  return createError(`No route found for "${method} ${new URL(url.toString()).pathname}"`);
};

export const createForbiddenError = (method: string, url: URL | string) => {
  return createError(`You can't perform "${method} ${new URL(url.toString()).pathname}"`);
};
