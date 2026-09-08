import { discoverProjects, OWNER } from '../lib/portfolio.ts';
import { writeFile } from 'node:fs/promises';
const snapshot = await discoverProjects();
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (token) {
  const query = `query { ${snapshot.projects.map((p, i) => `r${i}:repository(owner:"${OWNER}",name:${JSON.stringify(p.id)}){defaultBranchRef{target{... on Commit{history{totalCount}}}}}`).join(' ')} }`;
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const result = (await r.json()) as {
    data?: Record<
      string,
      { defaultBranchRef?: { target?: { history?: { totalCount: number } } } }
    >;
  };
  if (!r.ok || !result.data)
    throw new Error('Commit statistics refresh failed');
  const data = result.data;
  snapshot.projects.forEach((p, i) => {
    const count = data[`r${i}`]?.defaultBranchRef?.target?.history?.totalCount;
    if (count !== undefined) p.commits = count;
  });
  snapshot.commitsUpdatedAt = new Date().toISOString();
}
await writeFile(
  new URL('../data/initial-projects.json', import.meta.url),
  JSON.stringify(snapshot, null, 2) + '\n',
);
console.log(
  `Indexed ${snapshot.projects.length} public projects and ${snapshot.projects.filter((p) => p.demo).length} demo links.`,
);
