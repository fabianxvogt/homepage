<!-- portfolio
{
  "title": "My Homepage",
  "topic": "Play & products/Useful software",
  "type": "product",
  "description": "My interactive atlas of products, research, music and creative computation. Each project brings its own story from its README.",
  "demo": "https://fabian-portfolio.fabian523417.chatgpt.site"
}
-->

# My homepage

I’m Fabian. I build products and explore research, music, and creative computation.

[Explore my portfolio](https://fabian-portfolio.fabian523417.chatgpt.site) as an interactive downward tree, from **My interests** through topics and subtopics to my public repositories. I highlight [Lyrea](https://github.com/fabianxvogt/lyrea) as my main education project; I keep its product code private.

## Add a project

I put this JSON comment **at the start of a public repository’s README.md** (lowercase `readme.md` also works):

```html
<!-- portfolio
{
  "title": "Project name",
  "topic": "Music/Sound & rhythm",
  "type": "product",
  "description": "What I built and what visitors can do with it.",
  "demo": "https://example.com",
  "docs": "https://example.com/docs",
  "featured": false
}
-->
```

I use `product` or `research` for `type`. `title`, `topic`, `type` and `description` are required; `demo`, `docs`, `featured`, `primary` and `sourceAvailability` are optional. I use `primary: true` to feature my main project, and `sourceAvailability: "private"` for a public showcase whose actual product source is private. Topic paths contain two to four nonempty segments. I use HTTPS URLs. I remove optional URL fields when I don’t have a confirmed destination.

**Each repository’s README is the central place for its node and links.** To replace a hosted version, I change `demo` there. I can create new topic names without editing my homepage. I remove the marker to opt a repository out. Private, forked, archived and unmarked repositories stay out of the graph.

## Automatic discovery

My homepage fetches my public GitHub repositories and their README markers when someone opens it, and again every hour while the page remains open. No token is shipped to visitors. Requests are bounded and read-only, with paginated enumeration and six concurrent README fetches. GitHub or network failure keeps the last complete catalogue visible with a status label.

An hourly GitHub Actions workflow also rebuilds `data/initial-projects.json`. That file is a **generated snapshot**, not a hand-maintained project registry. The website fetches its latest public copy without requiring a new deployment. New metadata also appears through direct browser discovery, so delayed scheduled workflows don’t block additions. GitHub can delay scheduled runs and disables schedules in inactive repositories after its standard inactivity window; I can run the workflow manually.

Commit statistics count all authors’ commits reachable from each indexed repository’s **default branch**, not my personal contributions or all branches. The website labels the snapshot date and counted-repository coverage. Stars and forks are repository totals. “Repository updated” reflects GitHub’s push timestamp, including README changes. Metadata validity and a reachable URL are not scientific or product-quality certifications.

## Local development

Node 24 and npm:

```sh
npm ci
npm run dev
npm run build
npm run check
```

I can refresh the snapshot locally with `npm run sync`. Setting `GH_TOKEN` enables default-branch commit counts through GitHub’s GraphQL API; the token is read from the process environment and is never written to the public snapshot. The hourly workflow uses its built-in repository token.

## Navigation

- [Roadmap](ROADMAP.md)
- [Implementation and verification](docs/README.md)
- [Metadata parser and public discovery](lib/portfolio.ts)
- [Snapshot refresh](scripts/sync-projects.ts)

I keep all portfolio descriptions in my own voice and include only deliberately public metadata.
