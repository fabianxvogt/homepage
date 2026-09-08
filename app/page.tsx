'use client';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  ArrowUpRight,
  BookOpen,
  GitBranch,
  GitCommitHorizontal,
  GitFork as Github,
  Minus,
  Plus,
  Maximize2,
  Move,
  Radio,
  Star,
  ExternalLink,
  Sparkles,
  Code2,
  FlaskConical,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import initial from '@/data/initial-projects.json';
import {
  discoverProjects,
  safeURL,
  type Project,
  type Snapshot,
} from '@/lib/portfolio';
const colors = [
  '#cca4f5',
  '#88b9ff',
  '#71dfbf',
  '#f7bc83',
  '#f49bc8',
  '#e2d283',
];
const ordered = [
  'Education',
  'Artificial intelligence',
  'Mathematics',
  'Music',
  'Creative tools',
  'Play & products',
];
const CACHE_KEY = 'fabian-atlas-v1';
type GraphNode = {
  id: string;
  title: string;
  x: number;
  y: number;
  kind: 'root' | 'topic' | 'subtopic' | 'project';
  color: string;
  projects: Project[];
  project?: Project;
  parent?: string;
};
type Selection = {
  title: string;
  description: string;
  projects: Project[];
  project?: Project;
  color: string;
};
function validSnapshot(value: unknown): value is Snapshot {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as Snapshot).projects) &&
    (value as Snapshot).projects.every(
      (p) =>
        p &&
        typeof p.id === 'string' &&
        typeof p.title === 'string' &&
        typeof p.topic === 'string' &&
        typeof p.description === 'string' &&
        ['product', 'research'].includes(p.type) &&
        safeURL(p.repo) &&
        (!p.demo || safeURL(p.demo)) &&
        (!p.docs || safeURL(p.docs)),
    )
  );
}
export default function Home() {
  const [data, setData] = useState<Snapshot>(initial as Snapshot);
  const [status, setStatus] = useState('Refreshing from GitHub');
  const [selected, setSelected] = useState<Selection | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [filter, setFilter] = useState('all');
  const [hover, setHover] = useState<string | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    let previous = initial as Snapshot;
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (validSnapshot(cache)) {
        previous = cache;
        setData(cache);
      }
    } catch {}
    async function refresh() {
      try {
        const r = await fetch(
          'https://raw.githubusercontent.com/fabianxvogt/homepage/main/data/initial-projects.json',
          { signal: AbortSignal.timeout(10000), cache: 'no-cache' },
        );
        if (r.ok) {
          const snapshot = await r.json();
          if (validSnapshot(snapshot)) {
            previous = snapshot;
            if (!cancelled) setData(snapshot);
          }
        }
      } catch {}
      try {
        const fresh = await discoverProjects();
        const oldById = new Map(previous.projects.map((p) => [p.id, p]));
        fresh.projects = fresh.projects.map((p) => ({
          ...p,
          ...(oldById.get(p.id)?.commits !== undefined
            ? { commits: oldById.get(p.id)!.commits }
            : {}),
        }));
        fresh.commitsUpdatedAt = previous.commitsUpdatedAt;
        if (!cancelled) {
          setData(fresh);
          setStatus('Synced with GitHub');
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
          } catch {}
        }
      } catch {
        if (!cancelled) setStatus('Saved catalogue · refresh unavailable');
      }
    }
    void refresh();
    const interval = setInterval(() => void refresh(), 60 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    const el = viewport.current;
    if (el) setZoom(Math.max(0.65, Math.min(1, (el.clientWidth - 50) / 1450)));
  }, []);
  const all = data.projects;
  const projects = all.filter((p) => filter === 'all' || p.type === filter);
  const topics = [...new Set(projects.map((p) => p.topic.split('/')[0]))].sort(
    (a, b) =>
      (ordered.indexOf(a) < 0 ? 99 : ordered.indexOf(a)) -
        (ordered.indexOf(b) < 0 ? 99 : ordered.indexOf(b)) ||
      a.localeCompare(b),
  );
  const graph = useMemo(() => {
    const width = Math.max(1000, topics.length * 240 + 40);
    const nodes: GraphNode[] = [
      {
        id: 'root',
        title: 'My interests',
        x: width / 2 - 120,
        y: 26,
        kind: 'root',
        color: '#cca4f5',
        projects,
      },
    ];
    let bottom = 520;
    topics.forEach((topic, i) => {
      const color =
        colors[
          (ordered.indexOf(topic) < 0 ? i : ordered.indexOf(topic)) %
            colors.length
        ];
      const ps = projects.filter((p) => p.topic.split('/')[0] === topic);
      const x = 40 + i * 240;
      const id = 'topic:' + topic;
      nodes.push({
        id,
        title: topic,
        x,
        y: 200,
        kind: 'topic',
        color,
        projects: ps,
        parent: 'root',
      });
      let y = 322;
      const subs = [
        ...new Set(ps.map((p) => p.topic.split('/').slice(1).join(' / '))),
      ];
      subs.forEach((sub) => {
        const members = ps
          .filter((p) => p.topic.split('/').slice(1).join(' / ') === sub)
          .sort(
            (a, b) =>
              Number(!!b.featured) - Number(!!a.featured) ||
              a.title.localeCompare(b.title),
          );
        const sid = id + '/' + sub;
        nodes.push({
          id: sid,
          title: sub,
          x,
          y,
          kind: 'subtopic',
          color,
          projects: members,
          parent: id,
        });
        y += 87;
        members.forEach((p) => {
          nodes.push({
            id: p.id,
            title: p.title,
            x: x + 12,
            y,
            kind: 'project',
            color,
            projects: [p],
            project: p,
            parent: sid,
          });
          y += 99;
        });
        y += 36;
      });
      bottom = Math.max(bottom, y);
    });
    return { nodes, width, height: bottom };
  }, [data, filter, topics.join('|')]);
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const selectNode = (n: GraphNode) =>
    setSelected({
      title: n.title,
      description: n.project
        ? n.project.description
        : n.kind === 'root'
          ? 'Products, experiments and the ideas that connect them.'
          : `Exploring ${n.title.toLowerCase()} through ${n.projects.length} public ${n.projects.length === 1 ? 'project' : 'projects'}.`,
      projects: n.projects,
      project: n.project,
      color: n.color,
    });
  const commits = all.reduce((s, p) => s + (p.commits || 0), 0),
    counted = all.filter((p) => p.commits !== undefined).length;
  const demos = all.filter((p) => p.demo).length;
  const lyrea = all.find((p) => p.primary);
  const recent = [...all]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);
  return (
    <main>
      <header>
        <a className="brand" href="#" aria-label="Fabian homepage">
          f<span>v</span>
          <i />
          <b>Fabian</b>
        </a>
        <nav>
          <a href="#atlas">Explore</a>
          <a href="#about">About me</a>
          <a
            href="https://github.com/fabianxvogt"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <ArrowUpRight size={14} />
          </a>
        </nav>
      </header>
      <section className="intro">
        <div>
          <p className="eyebrow">
            <span className="live-dot" /> A PERSONAL ATLAS / ALWAYS EVOLVING
          </p>
          <h1>
            Curiosity, <em>connected.</em>
          </h1>
          <p>
            I’m Fabian. I build products and explore research,
            <br className="desktop-break" /> music, and creative computation.
          </p>
        </div>
        <div className="intro-aside">
          <span className="tiny-orbit">✳</span>
          <p>
            From an idea
            <br />
            to something you can explore.
          </p>
          <a href="#atlas">
            Follow the connections <span>↓</span>
          </a>
        </div>
      </section>
      <section
        className="atlas"
        id="atlas"
        aria-label="Interactive project graph"
      >
        <div className="atlas-heading">
          <span>01 / THE INTEREST GRAPH</span>
          <span className="graph-hint">
            Click a node or connection to explore
          </span>
          <div className="type-filter" aria-label="Project type">
            {['all', 'product', 'research'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
              >
                {f === 'all'
                  ? 'Everything'
                  : f === 'product'
                    ? 'Products'
                    : 'Research'}
              </button>
            ))}
          </div>
        </div>
        <div
          className="graph-viewport"
          ref={viewport}
          tabIndex={0}
          aria-label="Scrollable interests tree. Use zoom controls or scroll to explore."
          onPointerDown={(e) => {
            if ((e.target as Element).closest('button,a,[role="button"]'))
              return;
            const el = viewport.current!;
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              left: el.scrollLeft,
              top: el.scrollTop,
            };
            if (e.pointerType === 'mouse')
              e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current || e.pointerType !== 'mouse') return;
            viewport.current!.scrollLeft =
              drag.current.left - (e.clientX - drag.current.x);
            viewport.current!.scrollTop =
              drag.current.top - (e.clientY - drag.current.y);
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <div
            style={{
              width: graph.width * zoom,
              height: graph.height * zoom,
              position: 'relative',
              margin: '0 auto',
            }}
          >
            <div
              className="graph-plane"
              style={{
                width: graph.width,
                height: graph.height,
                transform: `scale(${zoom})`,
              }}
            >
              <svg
                className="connections"
                width={graph.width}
                height={graph.height}
                aria-label="Clickable relationships"
              >
                {graph.nodes
                  .filter((n) => n.parent)
                  .map((n) => {
                    const parent = nodeById.get(n.parent!)!;
                    const sx = parent.x + (parent.kind === 'root' ? 120 : 100),
                      sy =
                        parent.y +
                        (parent.kind === 'root'
                          ? 84
                          : parent.kind === 'topic'
                            ? 58
                            : 43);
                    const tx = n.x + 100,
                      ty = n.y;
                    const path =
                      n.kind === 'project'
                        ? `M ${parent.x + 4} ${sy} L ${parent.x + 4} ${ty + 36} Q ${parent.x + 4} ${ty + 43} ${n.x + 3} ${ty + 43}`
                        : `M ${sx} ${sy} C ${sx} ${sy + (ty - sy) / 2}, ${tx} ${sy + (ty - sy) / 2}, ${tx} ${ty}`;
                    const action = () =>
                      setSelected({
                        title: `${parent.title} → ${n.title}`,
                        description: `${n.title} belongs to ${parent.title}. Follow this connection to explore the ${n.project ? 'project' : 'projects'} below.`,
                        projects: n.projects,
                        project: n.project,
                        color: n.color,
                      });
                    return (
                      <g
                        key={n.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Explore connection from ${parent.title} to ${n.title}`}
                        onClick={action}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            action();
                          }
                        }}
                        onMouseEnter={() => setHover(n.id)}
                        onMouseLeave={() => setHover(null)}
                        className="edge"
                      >
                        <path
                          d={path}
                          fill="none"
                          stroke={n.color}
                          strokeOpacity={hover === n.id ? 1 : 0.28}
                          strokeWidth={hover === n.id ? 2.5 : 1.4}
                        />
                        <path
                          d={path}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={24}
                        />
                      </g>
                    );
                  })}
              </svg>
              {graph.nodes.map((n) => (
                <button
                  key={n.id}
                  className={`graph-node ${n.kind} ${n.project?.featured ? 'featured' : ''} ${hover === n.id ? 'highlight' : ''}`}
                  style={
                    {
                      left: n.x,
                      top: n.y,
                      '--node-color': n.color,
                    } as CSSProperties
                  }
                  onClick={() => selectNode(n)}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                  aria-label={`${n.title}${n.project ? `, ${n.project.type}` : `, ${n.projects.length} projects`}`}
                >
                  {n.kind === 'root' ? (
                    <>
                      <Sparkles size={23} />
                      <span>My interests</span>
                      <small>Different paths. Shared curiosity.</small>
                    </>
                  ) : n.kind === 'project' ? (
                    <>
                      <span className="node-meta">
                        {n.project?.type === 'research' ? (
                          <FlaskConical size={12} />
                        ) : (
                          <Code2 size={12} />
                        )}{' '}
                        {n.project?.featured
                          ? n.project.primary
                            ? 'MAIN PROJECT'
                            : 'FEATURED'
                          : n.project?.type}
                        <ArrowUpRight size={14} />
                      </span>
                      <strong>{n.title}</strong>
                      <span className="node-bottom">
                        {n.project?.demo ? (
                          <>
                            <i /> Try it live
                          </>
                        ) : n.project?.docs ? (
                          'Documentation available'
                        ) : (
                          n.project?.language || 'Open source'
                        )}
                        <span>↗</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <i className="topic-dot" />
                      <span>{n.title}</span>
                      <small>
                        {n.projects.length.toString().padStart(2, '0')}
                      </small>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="graph-footer">
          <span>
            <Move size={14} /> Drag to explore{' '}
            <span className="muted-separator">·</span> Scroll for more projects
          </span>
          <div className="zoom-controls">
            <button
              aria-label="Zoom out"
              onClick={() => setZoom((z) => Math.max(0.35, z - 0.15))}
            >
              <Minus size={17} />
            </button>
            <output aria-label="Zoom level">{Math.round(zoom * 100)}%</output>
            <button
              aria-label="Zoom in"
              onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
            >
              <Plus size={17} />
            </button>
            <button
              aria-label="Fit entire graph"
              onClick={() => {
                const el = viewport.current!;
                setZoom(
                  Math.min(
                    1,
                    (el.clientWidth - 30) / graph.width,
                    (el.clientHeight - 30) / graph.height,
                  ),
                );
                el.scrollTo({ left: 0, top: 0 });
              }}
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
      </section>
      <section className="stats" aria-label="Public GitHub statistics">
        <div>
          <GitBranch size={18} />
          <strong>{all.length}</strong>
          <span>Public projects</span>
        </div>
        <div>
          <Radio size={18} />
          <strong>{demos}</strong>
          <span>Hosted experiences</span>
        </div>
        <div>
          <GitCommitHorizontal size={18} />
          <strong>{commits ? commits.toLocaleString() : '—'}</strong>
          <span>Commits · {counted} default branches</span>
        </div>
        <div>
          <Star size={18} />
          <strong>{all.reduce((s, p) => s + p.stars, 0)}</strong>
          <span>GitHub stars</span>
        </div>
      </section>
      <p className="sync-status">
        <span className="live-dot" />
        {status}{' '}
        <span>
          · Metadata {new Date(data.updatedAt).toISOString().slice(0, 10)}
          {data.commitsUpdatedAt
            ? ` · Commit snapshot ${data.commitsUpdatedAt.slice(0, 10)}`
            : ''}
        </span>
      </p>
      <section className="about" id="about">
        <div className="about-copy">
          <p className="eyebrow">02 / A LITTLE ABOUT ME</p>
          <h2>
            Many interests.
            <br />
            <em>One curious mind.</em>
          </h2>
          <p>
            I like making ideas tangible: useful products, playful instruments,
            and experiments that ask clear questions.
          </p>
          <p>
            My work moves between education, artificial intelligence,
            mathematics, music, and creative computation. This atlas brings
            those threads together—and leaves room for whatever comes next.
          </p>
          <a
            href="https://github.com/fabianxvogt"
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            Follow my work on GitHub <ArrowUpRight size={17} />
          </a>
        </div>
        <div className="about-right">
          {lyrea && (
            <article className="lyrea-feature">
              <p className="eyebrow">
                <BookOpen size={16} /> EDUCATION / MAIN PROJECT
              </p>
              <div className="lyrea-title">
                {lyrea.title} <span>↗</span>
              </div>
              <p>{lyrea.description}</p>
              <div className="feature-links">
                {lyrea.docs && (
                  <a href={lyrea.docs} target="_blank" rel="noreferrer">
                    Read the docs <ArrowUpRight size={16} />
                  </a>
                )}
                <a href={lyrea.repo} target="_blank" rel="noreferrer">
                  Public showcase <Github size={16} />
                </a>
              </div>
              <small>I keep the product source code private.</small>
            </article>
          )}
          <div className="recent">
            <p className="eyebrow">RECENT REPOSITORY UPDATES</p>
            {recent.map((p) => (
              <a key={p.id} href={p.repo} target="_blank" rel="noreferrer">
                <span>
                  <GitCommitHorizontal size={15} />
                  {p.title}
                </span>
                <time dateTime={p.updatedAt}>{p.updatedAt.slice(5, 10)}</time>
              </a>
            ))}
          </div>
        </div>
      </section>
      <footer>
        <a className="footer-name" href="#">
          Fabian <span>↟</span>
        </a>
        <p>Built with curiosity. Shared in the open.</p>
        <a
          href="https://github.com/fabianxvogt/homepage#add-a-project"
          target="_blank"
          rel="noreferrer"
        >
          How this atlas grows <ArrowUpRight size={15} />
        </a>
      </footer>
      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent
          className="project-sheet"
          style={{ '--node-color': selected?.color } as CSSProperties}
        >
          <SheetHeader>
            <p className="eyebrow">
              {selected?.project?.type || 'A CONNECTION IN THE ATLAS'}
            </p>
            <SheetTitle>{selected?.title}</SheetTitle>
            <SheetDescription>{selected?.description}</SheetDescription>
          </SheetHeader>
          <div className="sheet-body">
            {selected?.project ? (
              <>
                <div className="project-path">
                  {selected.project.topic.split('/').join(' / ')}
                </div>
                <div className="project-actions">
                  {selected.project.demo && (
                    <a
                      className="primary-action"
                      href={selected.project.demo}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Try it live <ExternalLink size={17} />
                    </a>
                  )}
                  {selected.project.docs && (
                    <a
                      href={selected.project.docs}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Read documentation <BookOpen size={17} />
                    </a>
                  )}
                  <a
                    href={selected.project.repo}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {selected.project.sourceAvailability === 'private'
                      ? 'Public showcase'
                      : 'Explore repository'}
                    <Github size={17} />
                  </a>
                </div>
                <dl>
                  <div>
                    <dt>Language</dt>
                    <dd>{selected.project.language || 'Documentation'}</dd>
                  </div>
                  <div>
                    <dt>Stars</dt>
                    <dd>{selected.project.stars}</dd>
                  </div>
                  <div>
                    <dt>Forks</dt>
                    <dd>{selected.project.forks}</dd>
                  </div>
                  {selected.project.commits !== undefined && (
                    <div>
                      <dt>Default-branch commits</dt>
                      <dd>{selected.project.commits}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Repository updated</dt>
                    <dd>{selected.project.updatedAt.slice(0, 10)}</dd>
                  </div>
                </dl>
                {selected.project.sourceAvailability === 'private' && (
                  <p className="detail-note">
                    I keep the actual product source private. I use this
                    repository for its public introduction and portfolio
                    metadata.
                  </p>
                )}
                <p className="detail-note">
                  Project information comes from this repository’s README.
                  Hosted experiences may be bounded previews; see the project
                  documentation for scope.
                </p>
              </>
            ) : (
              <div className="related-projects">
                {selected?.projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() =>
                      setSelected({
                        title: p.title,
                        description: p.description,
                        projects: [p],
                        project: p,
                        color: selected.color,
                      })
                    }
                  >
                    <small>
                      {p.type}
                      {p.demo ? ' · LIVE' : ''}
                    </small>
                    <strong>
                      {p.title}
                      <ArrowUpRight size={16} />
                    </strong>
                    <span>{p.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
