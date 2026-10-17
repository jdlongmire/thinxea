export interface Artifact {
  id: string;
  type: string;
  name: string;
  level: string;
  owner: string;
  status: string;
  path: string;
  body: string;
  [key: string]: unknown;
}

export interface CatalogElement {
  id: string;
  type: string;
  name: string;
  level: string;
}

export interface Relation {
  source: string;
  relation: string;
  target: string;
}

export interface ViewReg {
  id: string;
  title: string;
  viewpoint: string;
  concern: string;
  level: string;
  focus: string;
  elements: string[];
  membership_complete: boolean;
  relation_complete: boolean;
  svg: string;
  mmd: string;
}

export interface StandardInfo {
  id: string;
  name: string;
  enforcement?: string;
  policyFile?: string | null;
  boundElements: string[];
}

export interface Model {
  product: string;
  provenance: { repository: string; example: string; generatedAt: string };
  counts: { artifacts: number; elements: number; relations: number; views: number };
  artifacts: Artifact[];
  catalog: { element: CatalogElement[]; relation: Relation[] };
  views: ViewReg[];
  standards: StandardInfo[];
  sarsGrid: Record<string, Record<string, string[]>>;
  evidence: { driftRegister: string; snapshots: string[] };
  searchIndex: { id: string; title: string; type: string; path: string; text: string }[];
}

let cache: Promise<Model> | null = null;

export function loadModel(): Promise<Model> {
  if (!cache) {
    cache = fetch("/data/model.json").then((r) => {
      if (!r.ok) throw new Error(`model load failed: ${r.status}`);
      return r.json() as Promise<Model>;
    });
  }
  return cache;
}

export function artifactById(m: Model, id: string): Artifact | undefined {
  return m.artifacts.find((a) => a.id === id);
}

export function relationsFor(m: Model, id: string): { out: Relation[]; into: Relation[] } {
  return {
    out: m.catalog.relation.filter((r) => r.source === id),
    into: m.catalog.relation.filter((r) => r.target === id),
  };
}

export function impactSet(m: Model, id: string): string[] {
  const seen = new Set<string>();
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const r of m.catalog.relation) {
      if (r.source === cur && !seen.has(r.target)) {
        seen.add(r.target);
        queue.push(r.target);
      }
      if (r.target === cur && !seen.has(r.source)) {
        seen.add(r.source);
        queue.push(r.source);
      }
    }
  }
  seen.delete(id);
  return [...seen].sort();
}
