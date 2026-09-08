export const OWNER = 'fabianxvogt';
export type Project = {
  id: string;
  title: string;
  topic: string;
  type: 'product' | 'research';
  description: string;
  repo: string;
  demo?: string;
  docs?: string;
  featured?: boolean;
  primary?: boolean;
  sourceAvailability?: 'public' | 'private';
  stars: number;
  forks: number;
  language: string | null;
  updatedAt: string;
  commits?: number;
};
export type Snapshot = {
  updatedAt: string;
  projects: Project[];
  commitsUpdatedAt?: string;
};
export function safeURL(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  try {
    const u = new URL(value);
    if (u.protocol === 'https:' && !u.username && !u.password) return u.href;
  } catch {}
}
export function parseMetadata(readme: string) {
  const match = readme
    .slice(0, 16384)
    .match(/^\s*<!--\s*portfolio\s*\n([\s\S]*?)-->/);
  if (!match) return null;
  try {
    const m = JSON.parse(match[1]);
    if (!m || typeof m !== 'object') return null;
    for (const [key, max] of [
      ['title', 90],
      ['description', 600],
      ['topic', 150],
    ] as const) {
      if (typeof m[key] !== 'string' || !m[key].trim() || m[key].length > max)
        return null;
    }
    const path = m.topic.split('/').map((x: string) => x.trim());
    if (
      path.length < 2 ||
      path.length > 4 ||
      path.some((x: string) => !x || x.length > 60)
    )
      return null;
    if (!['product', 'research'].includes(m.type)) return null;
    if (m.demo !== undefined && !safeURL(m.demo)) return null;
    if (m.docs !== undefined && !safeURL(m.docs)) return null;
    return {
      title: m.title.trim(),
      description: m.description.trim(),
      topic: path.join('/'),
      type: m.type as Project['type'],
      ...(m.demo ? { demo: safeURL(m.demo) } : {}),
      ...(m.docs ? { docs: safeURL(m.docs) } : {}),
      ...(m.primary === true ? { primary: true } : {}),
      ...(m.sourceAvailability === 'private'
        ? { sourceAvailability: 'private' as const }
        : {}),
      ...(m.featured === true ? { featured: true } : {}),
    };
  } catch {
    return null;
  }
}
type Repo = {
  name: string;
  full_name: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  default_branch: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  pushed_at: string;
};
export async function discoverProjects(
  fetcher: typeof fetch = fetch,
): Promise<Snapshot> {
  const repos: Repo[] = [];
  for (let page = 1; page <= 20; page++) {
    const r = await fetcher(
      `https://api.github.com/users/${OWNER}/repos?per_page=100&page=${page}`,
      {
        headers: { Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!r.ok) throw new Error('GitHub is temporarily unavailable.');
    const batch = (await r.json()) as Repo[];
    if (!Array.isArray(batch)) throw new Error('Invalid GitHub response');
    repos.push(
      ...batch.filter(
        (x) =>
          !x.private &&
          !x.fork &&
          !x.archived &&
          !/sokra|kotcumber/i.test(x.name),
      ),
    );
    if (batch.length < 100) break;
    if (page === 20) throw new Error('Repository pagination limit reached');
  }
  const projects: Project[] = [];
  let index = 0;
  let failures = 0;
  async function worker() {
    while (index < repos.length) {
      const r = repos[index++];
      // Raw public content avoids consuming one API quota request per README.
      try {
        let response = await fetcher(
          `https://raw.githubusercontent.com/${OWNER}/${encodeURIComponent(r.name)}/${encodeURIComponent(r.default_branch)}/README.md`,
          { signal: AbortSignal.timeout(12000) },
        );
        if (response.status === 404)
          response = await fetcher(
            `https://raw.githubusercontent.com/${OWNER}/${encodeURIComponent(r.name)}/${encodeURIComponent(r.default_branch)}/readme.md`,
            { signal: AbortSignal.timeout(12000) },
          );
        if (response.status === 404) continue;
        if (!response.ok) {
          failures++;
          continue;
        }
        const m = parseMetadata(await response.text());
        if (!m) continue;
        projects.push({
          id: r.name,
          ...m,
          repo: `https://github.com/${OWNER}/${encodeURIComponent(r.name)}`,
          stars: r.stargazers_count,
          forks: r.forks_count,
          language: r.language,
          updatedAt: r.pushed_at,
        });
      } catch {
        failures++;
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  // Never replace a complete catalogue with a partially fetched one.
  if (failures)
    throw new Error('Some repository metadata could not be refreshed.');
  return {
    updatedAt: new Date().toISOString(),
    projects: projects.sort((a, b) => a.title.localeCompare(b.title)),
  };
}
