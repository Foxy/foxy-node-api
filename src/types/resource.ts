import { ApiGraph, PathMember } from "./utils";
import { Props } from "./props";
import { Embeds } from "./embeds";

type ResourceProps<Host extends PathMember> = Host extends keyof Props
  ? Props[Host]
  : Record<string, any>;

type ResourceEmbeds<Graph extends ApiGraph, Host extends PathMember> = {
  _embedded: Host extends keyof Embeds
    ? (Props[Embeds[Host]] & ResourceLinks<Graph[number]>)[]
    : any;
};

type ResourceLinks<Graph extends ApiGraph> = {
  _links: {
    [Relation in keyof Graph]: {
      href: string;
      templated?: boolean;
      title?: string;
      name?: string;
    };
  };
};

export type Resource<Graph extends ApiGraph, Host extends PathMember> = ResourceProps<Host> &
  ResourceEmbeds<Graph, Host> &
  ResourceLinks<Graph>;
