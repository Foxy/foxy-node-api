import { ApiGraph, PathMember } from "./utils";
import { Props } from "./props";
import { Embeds } from "./embeds";

type ResourceProps<Host extends PathMember> = Host extends keyof Props
  ? Props[Host]
  : Record<PathMember, any>;

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

export type Resource<
  Graph extends ApiGraph,
  Host extends PathMember,
  Fields extends (keyof ResourceProps<Host>)[] | undefined = (keyof ResourceProps<Host>)[]
> = Pick<ResourceProps<Host>, Fields extends (infer U)[] ? U : keyof ResourceProps<Host>> &
  ResourceEmbeds<Graph, Host> &
  ResourceLinks<Graph>;
