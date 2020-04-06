export type HTTPMethod = "GET" | "PUT" | "HEAD" | "POST" | "PATCH" | "DELETE" | "OPTIONS";
export type HTTPMethodWithBody = "PUT" | "POST" | "PATCH";

export type PathMember = string | number | symbol;

/**
 * Foxy hAPI graph where each key is either a
 * relation name or a resource id and each value is either a nested
 * graph of linked resources or a never type marking the end of the branch.
 */
export interface ApiGraph<T extends ApiGraph = any> {
  [key: string]: never | T;
  [key: number]: T;
}

/**
 * Any resource received from the API that includes
 * a set of links to other resources (relations).
 */
export interface Followable {
  _links: {
    [key: string]: { href: string };
  };
}
