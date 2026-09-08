import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMetadata, safeURL, discoverProjects } from './portfolio.ts';
const metadata = {
  title: 'Example',
  topic: 'Music/Synthesis',
  type: 'product',
  description: 'A synthesizer.',
};
const wrap = (m: unknown) =>
  `<!-- portfolio\n${JSON.stringify(m)}\n-->\n# Hello`;
test('marker is opt-in, top-of-readme and validated', () => {
  assert.equal(parseMetadata('# No marker'), null);
  assert.equal(parseMetadata('Text\n' + wrap(metadata)), null);
  assert.deepEqual(parseMetadata(wrap(metadata)), metadata);
  for (const change of [
    { topic: 'Single' },
    { topic: 'A//B' },
    { type: 'fake' },
    { demo: 'javascript:alert(1)' },
    { title: '' },
  ])
    assert.equal(parseMetadata(wrap({ ...metadata, ...change })), null);
  assert.equal(safeURL('https://user:secret@example.com'), undefined);
});
test('discovery paginates, ignores private/fork/unmarked and discovers arbitrary new topics', async () => {
  const repo = (name: string) => ({
    name,
    default_branch: 'main',
    private: false,
    fork: false,
    archived: false,
    stargazers_count: 2,
    forks_count: 1,
    language: 'TypeScript',
    pushed_at: '2026-09-08',
  });
  const calls: string[] = [];
  const fetcher = async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.includes('api.github'))
      return new Response(
        JSON.stringify(
          url.endsWith('page=1')
            ? [
                ...Array.from({ length: 98 }, (_, i) => ({
                  ...repo('private' + i),
                  private: true,
                })),
                repo('marked'),
                { ...repo('fork'), fork: true },
              ]
            : [repo('new'), repo('unmarked')],
        ),
      );
    return new Response(
      url.includes('/unmarked/')
        ? '# Nothing'
        : wrap({ ...metadata, topic: 'New topic/New subtopic' }),
    );
  };
  const result = await discoverProjects(fetcher as typeof fetch);
  assert.deepEqual(result.projects.map((p) => p.id).sort(), ['marked', 'new']);
  assert.ok(calls.some((x) => x.endsWith('page=2')));
  assert.ok(
    !calls.some(
      (x) => x.includes('raw.githubusercontent.com') && /private|fork/.test(x),
    ),
  );
});
test('network failure cannot silently erase catalogue', async () => {
  await assert.rejects(
    discoverProjects(
      (async () => new Response('', { status: 403 })) as typeof fetch,
    ),
  );
});
test('a partial README failure rejects the whole refresh', async () => {
  const fetcher = async (input: RequestInfo | URL) =>
    String(input).includes('api.github')
      ? new Response(
          JSON.stringify([
            {
              name: 'sample',
              default_branch: 'main',
              private: false,
              fork: false,
              archived: false,
            },
          ]),
        )
      : new Response('unavailable', { status: 503 });
  await assert.rejects(
    discoverProjects(fetcher as typeof fetch),
    /could not be refreshed/,
  );
});
test('documentation is optional but must be an HTTPS link', () => {
  assert.equal(
    parseMetadata(wrap({ ...metadata, docs: 'javascript:alert(1)' })),
    null,
  );
  assert.equal(
    parseMetadata(wrap({ ...metadata, docs: 'https://example.com/docs' }))
      ?.docs,
    'https://example.com/docs',
  );
});
