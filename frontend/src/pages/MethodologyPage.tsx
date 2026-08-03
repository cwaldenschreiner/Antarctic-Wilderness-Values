import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type Ref = { id: string; text: string; href?: string };

const REFS: Ref[] = [
  {
    id: 'ant-mici-rug',
    text: 'ANT-MICI — Antarctic tourism: developing knowledge and tools to minimise cumulative impacts on biodiversity and wilderness values in Antarctica. Arctic Centre, University of Groningen (PT-REPAIR / NWO NWA.20.1435.004).',
    href: 'https://www.rug.nl/research/arctisch-centrum/projects/pt-repair/ant-mici/?lang=en',
  },
  {
    id: 'summerson-bishop-2012',
    text: 'Summerson, R. & Bishop, I.D. (2012). The impact of human activities on wilderness and aesthetic values in Antarctica. Polar Research, 31, 10858.',
    href: 'https://doi.org/10.3402/polar.v31i0.10858',
  },
  {
    id: 'ip39-2013',
    text: 'New Zealand (2013). Monitoring and assessment of aesthetic values of the Antarctic environment. ATCM XXXVI Information Paper 39.',
    href: 'https://documents.ats.aq/ATCM36/ip/ATCM36_ip039_e.doc',
  },
  {
    id: 'leihy-2020',
    text: 'Leihy, R.I. et al. (2020). Antarctica’s wilderness fails to capture continent’s biodiversity. Nature, 583, 567–571.',
    href: 'https://doi.org/10.1038/s41586-020-2506-3',
  },
  {
    id: 'aronson-hughes-2011',
    text: 'Aronson, R.B., Thatje, S., McClintock, J.B. & Hughes, K.A. (2011). Anthropogenic impacts on marine ecosystems in Antarctica. Annals of the New York Academy of Sciences, 1223, 82–107.',
    href: 'https://doi.org/10.1111/j.1749-6632.2010.05926.x',
  },
  {
    id: 'comnap-2024',
    text: 'COMNAP (2024). Antarctic Facilities List, Version 3.5.0. Council of Managers of National Antarctic Programs.',
    href: 'https://www.comnap.aq/antarctic-facilities-information',
  },
  {
    id: 'iaato',
    text: 'IAATO. International Association of Antarctica Tour Operators — visitor site records.',
    href: 'https://iaato.org/',
  },
  {
    id: 'lee-2019',
    text: 'Lee, J.R. (2019). Conserving Antarctic biodiversity in the Anthropocene. Doctoral dissertation, University of Queensland.',
    href: 'https://doi.org/10.14264/uql.2019.163',
  },
  {
    id: 'natural-earth',
    text: 'Natural Earth. 10m physical land and Antarctic ice shelves (public domain).',
    href: 'https://www.naturalearthdata.com/',
  },
];

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="ext-link">
      {children}
    </a>
  );
}

function Cite({ id }: { id: string }) {
  const ref = REFS.find(r => r.id === id);
  if (!ref) return null;
  if (ref.href) {
    return (
      <ExtLink href={ref.href}>
        <span className="cite-chip">{id}</span>
      </ExtLink>
    );
  }
  return <span className="cite-chip">{id}</span>;
}

export function MethodologyPage() {
  return (
    <div className="methodology-page">
      <header className="method-hero">
        <h2>Methodology</h2>
        <p className="intro">
          Detailed description of each wilderness-value analysis in this dashboard — beyond
          the short tooltips on the indicator pages. This WP3 dashboard is part of{' '}
          <ExtLink href="https://www.rug.nl/research/arctisch-centrum/projects/pt-repair/ant-mici/?lang=en">
            ANT-MICI
          </ExtLink>
          {' '}(University of Groningen Arctic Centre / PT-REPAIR). Indicator methods follow
          Summerson &amp; Bishop (2012) and ATCM XXXVI IP 39 (New Zealand, 2013), with the
          pristineness baseline from Leihy et al. (2020).
        </p>
        <nav className="method-toc" aria-label="On this page">
          <a href="#about">About ANT-MICI</a>
          <a href="#common">Common grid</a>
          <a href="#remoteness">Remoteness</a>
          <a href="#wildness">Wildness</a>
          <a href="#pristineness">Pristineness</a>
          <a href="#outputs">Reading outputs</a>
          <a href="#references">References</a>
        </nav>
      </header>

      <section id="about" className="method-section">
        <h3>About ANT-MICI</h3>
        <p>
          <strong>ANT-MICI</strong> — <em>Antarctic tourism: developing knowledge and tools
          to minimise cumulative impacts on biodiversity and wilderness values in
          Antarctica</em> — responds to more than 30 years of growth in tourist numbers and
          visited sites. The cumulative effects of these activities on Antarctic biodiversity
          and wilderness values remain poorly known. Working with societal partners, the
          programme aims to give policymakers and the tourism sector: a 20-year Antarctic
          tourism forecast; maps of biodiversity and wilderness values; an inventory of
          cumulative impacts; a monitoring system; and strategies and regulatory tools to
          minimise future impacts <Cite id="ant-mici-rug" />.
        </p>
        <p>
          This interactive dashboard is the WP3 wilderness-values mapping component of that
          work. Project lead: Kees Bastmeijer (Arctic Centre, University of Groningen).
          Co-leads include Steven Chown (Monash University), Peter Convey and Jasmine Lee
          (British Antarctic Survey), Rien Aerts and Stef Bokhorst (Vrije Universiteit
          Amsterdam), and Yu-Fai Leung (North Carolina State University). Funding: NWO
          PT-REPAIR programme, grant <code>NWA.20.1435.004</code>.
        </p>
        <p>
          Project page:{' '}
          <ExtLink href="https://www.rug.nl/research/arctisch-centrum/projects/pt-repair/ant-mici/?lang=en">
            rug.nl — ANT-MICI (PT-REPAIR)
          </ExtLink>
        </p>
      </section>

      <section id="common" className="method-section">
        <h3>Common analysis grid</h3>
        <p>
          All three indicators are computed on the same continent-wide lattice in
          South Polar Stereographic projection (<strong>EPSG:3031</strong>), covering roughly
          ±3,000 km from the South Pole at <strong>50 km</strong> cell spacing. The analysis
          domain is a 2,800 km radius disk plus near-land cells out to 3,300 km so the
          South Shetland Islands and Elephant Island are included without filling the
          intervening open ocean. Distance calculations use projected metres
          (k-d tree nearest neighbour), so kilometres are Euclidean in EPSG:3031 — appropriate
          for polar work and consistent across Remoteness, Wildness, and Pristineness.
        </p>
        <p>
          Map overlays are PNG rasters aligned to that grid. Zooming keeps cells crisp
          (nearest-neighbour display); it does <em>not</em> invent finer analytical
          resolution. The basemap uses Natural Earth 10m land and ice shelves for
          geographic context <Cite id="natural-earth" />.
        </p>
        <p>
          Optional GeoJSON / Shapefile / GeoPackage uploads on each indicator page can
          add or replace facility or footprint features for scenario testing.
        </p>
      </section>

      <section id="remoteness" className="method-section method-section--blue">
        <div className="method-section-head">
          <h3>Remoteness</h3>
          <Link to="/remoteness" className="method-page-link">Open Remoteness page →</Link>
        </div>
        <h4>Question answered</h4>
        <p>
          How isolated is each part of Antarctica from permanent infrastructure and
          known visitor landing sites?
        </p>
        <h4>How the analysis runs</h4>
        <ol>
          <li>
            Load COMNAP facilities <Cite id="comnap-2024" /> and ATS / IAATO land-based
            visitor sites <Cite id="iaato" /> <Cite id="lee-2019" /> (plus any upload).
          </li>
          <li>
            For every 50 km cell, measure distance to the nearest facility and nearest
            visitor site.
          </li>
          <li>
            Convert distance to an impact score with exponential decay:
            impact falls to ~37% of its near-field value at the chosen decay radius
            (defaults: 100 km facilities, 50 km visitors). Visitor impact is scaled by
            a weight (default 0.5).
          </li>
          <li>
            Remoteness score = <code>(1 − clipped impact) × 100</code> so higher values
            mean more remote.
          </li>
          <li>
            Separately, classify cells into remoteness ranks using minimum distance to
            any human feature and IP 39 Table 4 thresholds: &lt;5 km, 5–20 km, 20–50 km,
            &gt;50 km <Cite id="ip39-2013" /> <Cite id="summerson-bishop-2012" />.
          </li>
        </ol>
        <h4>Parameters you can change</h4>
        <ul>
          <li><strong>Facility decay radius</strong> — how far station influence extends.</li>
          <li><strong>Visitor decay radius</strong> — same for transient visitor sites.</li>
          <li><strong>Visitor weight</strong> — relative strength of visitor vs facility impact.</li>
        </ul>
        <h4>Outputs</h4>
        <ul>
          <li><strong>Remoteness Score</strong> map (0–100 continuous).</li>
          <li><strong>Remoteness Rank</strong> map (four distance classes).</li>
          <li>Summary metrics: high-remoteness share/area, mean score, facility count.</li>
          <li>Rank-distribution and score-histogram charts after Run Analysis.</li>
        </ul>
      </section>

      <section id="wildness" className="method-section method-section--green">
        <div className="method-section-head">
          <h3>Wildness</h3>
          <Link to="/wildness" className="method-page-link">Open Wildness page →</Link>
        </div>
        <h4>Question answered</h4>
        <p>
          Which parts of the continent remain outside the practical sight and sound
          range of human activity (“out of sight and sound”)?
        </p>
        <h4>How the analysis runs</h4>
        <ol>
          <li>
            Use the same facilities and visitor sites as Remoteness
            <Cite id="comnap-2024" /> <Cite id="iaato" />.
          </li>
          <li>
            Mark a cell as <em>impacted</em> if it lies within the facility sight/sound
            range <em>or</em> the visitor sight/sound range; otherwise mark it <em>wild</em>.
          </li>
          <li>
            Assign binary scores: wild = 100, impacted = 0. Defaults (100 km facilities,
            50 km visitors) follow the IP 39 §6 framing used in this dashboard
            <Cite id="ip39-2013" /> <Cite id="summerson-bishop-2012" />.
          </li>
          <li>
            Build an optional viewshed / impact-mask layer showing only impacted cells
            (non-impacted cells stay clear so the basemap remains visible).
          </li>
        </ol>
        <p className="method-note-inline">
          Note: this implementation uses distance thresholds as a continent-wide proxy
          for cumulative viewshed. A full DEM-based viewshed (e.g. REMA) is described in
          the literature but is not required to explore threshold sensitivity here.
        </p>
        <h4>Parameters you can change</h4>
        <ul>
          <li><strong>Facility sight/sound range</strong> — radius around stations and similar infrastructure.</li>
          <li><strong>Visitor site sight/sound range</strong> — typically smaller for transient activity.</li>
        </ul>
        <h4>Outputs</h4>
        <ul>
          <li><strong>Wildness Index</strong> map (0 = impacted, 100 = wild).</li>
          <li><strong>Impacted (viewshed)</strong> presence overlay.</li>
          <li>Metrics: wild share, share within impact range, wild area (km²).</li>
        </ul>
      </section>

      <section id="pristineness" className="method-section method-section--teal">
        <div className="method-section-head">
          <h3>Pristineness</h3>
          <Link to="/pristineness" className="method-page-link">Open Pristineness page →</Link>
        </div>
        <h4>Question answered</h4>
        <p>
          How unmodified is each cell, combining historical “never visited” wilderness
          with recent visit intensity?
        </p>
        <h4>How the analysis runs</h4>
        <ol>
          <li>
            Start from the Leihy et al. (2020) inviolate wilderness baseline — 50 km
            cells with no recorded human visitation across ~2.7 million activity records
            (1819–2018) <Cite id="leihy-2020" />. Broader anthropogenic-impact context for
            Antarctic ecosystems is reviewed by Aronson, Thatje, McClintock &amp; Hughes
            (2011) <Cite id="aronson-hughes-2011" />.
          </li>
          <li>
            Measure distance to ATS visitor sites and weight decay by 5-year visit totals
            so high-traffic Peninsula sites influence a wider neighbourhood than rarely
            visited sites <Cite id="iaato" />.
          </li>
          <li>
            Score inviolate cells in roughly 50–100 (visit impact can reduce but not erase
            the baseline). Non-inviolate cells score roughly 0–60 from visit proximity alone.
          </li>
          <li>
            Compute fragmentation stats on the inviolate mask (patch count, largest patch).
          </li>
        </ol>
        <h4>Parameters you can change</h4>
        <ul>
          <li><strong>Visit decay (base)</strong> — radius for low-traffic sites.</li>
          <li><strong>Visit decay (max, high-traffic)</strong> — additional range scaled by visit volume.</li>
        </ul>
        <h4>Outputs</h4>
        <ul>
          <li><strong>Pristineness Index</strong> map (0–100; higher = less modified).</li>
          <li><strong>Inviolate Areas</strong> presence overlay.</li>
          <li>Metrics: inviolate share/extent, number of patches, largest patch size.</li>
        </ul>
      </section>

      <section id="outputs" className="method-section">
        <h3>Reading map and chart outputs</h3>
        <ul>
          <li>
            <strong>Score layers</strong> use continuous colormaps. Zero is a real class
            (e.g. least remote, impacted, or most modified) and remains visible on-continent.
          </li>
          <li>
            <strong>Rank / class layers</strong> use discrete colours; Remoteness Rank 0
            means &lt;5 km from human activity, not “no data”.
          </li>
          <li>
            <strong>Presence masks</strong> (viewshed, inviolate) only draw positive cells
            so absence stays transparent over the basemap.
          </li>
          <li>
            <strong>Charts under the map</strong> summarise continent-wide distributions
            after you run analysis (histograms need a live run; some summary stats also
            load from precomputed defaults).
          </li>
          <li>
            Dataset licences, vintages, and gaps are listed on the{' '}
            <Link to="/data-sources">Data Sources</Link> tab.
          </li>
        </ul>
      </section>

      <section id="references" className="method-section">
        <h3>References &amp; linked sources</h3>
        <p className="intro" style={{ marginBottom: '0.75rem' }}>
          Click a citation to open the source (DOI, ATS document, or organisational page)
          in a new tab.
        </p>
        <ol className="method-ref-list">
          {REFS.map(r => (
            <li key={r.id} id={`ref-${r.id}`}>
              {r.href ? <ExtLink href={r.href}>{r.text}</ExtLink> : r.text}
              {' '}
              <code className="ref-id">{r.id}</code>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
