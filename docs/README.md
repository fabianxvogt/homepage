# Implementation and evidence

I use this page to record what my homepage does and what has actually been checked.

## Ownership and architecture

Each public project owns its portfolio metadata in a JSON comment at the start of its README. My homepage stores a generated fallback only. Public GitHub enumeration and raw README reads discover additions, removals and new topics. An hourly workflow independently refreshes the fallback and default-branch commit statistics. No GitHub secret is exposed to browsers; the site has no database, paid API, analytics tracker or write endpoint.

`app/page.tsx` renders an accessible button-based graph with SVG relationship controls and the installed Sheet dialog. `lib/portfolio.ts` validates opt-in metadata and HTTPS destinations. `scripts/sync-projects.ts` creates `data/initial-projects.json`. React renders metadata as plain text; README HTML is never injected.

## Verification

- Metadata contract tests cover opt-in, malformed fields, unsafe links, dynamic topic discovery, pagination, fork/private exclusion and API failure.
- Live public discovery initially found 31 projects including my Lyrea showcase, with 20 demo links. My homepage joins through its own marker after publication.
- Production build, type checks and HTTP link checks: see release checkpoint below.
- My Lyrea showcase contains only its README. The product workspace and source were not accessed.

## Review and limitations

Classification: **INCREMENTAL / EMPIRICAL**. I claim no scientific novelty.

The configured independent OMP code-review launcher is not available in this session; no replacement worker was launched. Parent source review and focused verification are recorded without claiming independent review. Browser interaction/visual testing was not requested and has not been performed. My local preview is provided for inspection. Touch/device testing, 200% text enlargement and human aesthetic acceptance remain unobserved.

GitHub can rate-limit discovery or delay scheduled jobs. I retain a dated complete snapshot when refresh fails. A new browser opening refreshes immediately; an already-open page refreshes hourly. Public raw content/CDN propagation may add a delay. Snapshot commit totals may lag current branch heads and count all authors. URL checks establish reachability, not complete product functionality.

## Releasing and updating

I build from my project checkout, save the exact source revision and package its distribution with the Sites hosting helper. The Site identity stays in `.openai/hosting.json`. Source changes need a new release; README metadata changes don’t. I never copy product sources, private planning, credentials or raw research artifacts into this repository.

## Release checkpoint — 2026-09-08

- `npm run check`: TypeScript and all five metadata/discovery/error tests pass.
- `npm run build`: static export succeeds, with no runtime database or Worker required.
- `npm install` audit: zero known vulnerabilities after compatible framework/tooling security updates.
- All 20 existing demo URLs and my Lyrea documentation URL returned HTTP 200 on bounded unauthenticated checks.
- My source review checked plain-text metadata rendering, validated HTTPS links, absence of client credentials, marker opt-in, full-refresh failure behavior, pagination and graph node/edge keyboard handlers.
- The initial generated catalogue contains 31 public projects and actual default-branch commit counts for all 31. It refreshes from repository-owned metadata rather than copying private planning.
- End-to-end automatic discovery passed: after I created my homepage repository, the unchanged refresh workflow discovered its README marker and generated a 32-project catalogue. [Workflow run](https://github.com/fabianxvogt/homepage/actions/runs/34241390052) succeeded with the built-in GitHub token and committed the generated snapshot. My homepage itself is the 21st configured hosted link.
