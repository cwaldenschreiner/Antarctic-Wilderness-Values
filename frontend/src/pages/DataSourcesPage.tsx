import { useEffect, useState } from 'react';
import { fetchCatalog } from '../api/client';
import type { CatalogResponse } from '../api/client';

export function DataSourcesPage() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);

  useEffect(() => { fetchCatalog().then(setCatalog).catch(console.error); }, []);

  return (
    <div className="data-sources-page">
      <h2>Data Sources</h2>
      <p className="intro">
        All datasets used in ANT-MICI WP3 wilderness value indicator analysis.
        Methods follow Summerson (2012), Summerson &amp; Bishop (2012), and ATCM XXXVI IP 39 (New Zealand, 2013).
        Programme context:{' '}
        <a
          href="https://www.rug.nl/research/arctisch-centrum/projects/pt-repair/ant-mici/?lang=en"
          target="_blank"
          rel="noopener noreferrer"
          className="ext-link"
        >
          ANT-MICI at the University of Groningen Arctic Centre
        </a>
        .
      </p>

      <div className="catalog-grid">
        {catalog?.layers.map(layer => (
          <article key={layer.id} className="catalog-card">
            <h3>{layer.name}</h3>
            <dl>
              <dt>Source</dt>    <dd>{layer.source}</dd>
              <dt>License</dt>   <dd>{layer.license}</dd>
              <dt>Vintage</dt>   <dd>{layer.vintage}</dd>
              {layer.n_features && <><dt>Features</dt><dd>{layer.n_features.toLocaleString()}</dd></>}
              <dt>Used in</dt>   <dd>{layer.tabs.join(', ')}</dd>
            </dl>
            <p>{layer.description}</p>
            <cite>{layer.citation}</cite>
          </article>
        ))}
      </div>

      {catalog?.data_gaps && (
        <section className="gaps-section">
          <h3>Known Data Gaps</h3>
          <ul>{catalog.data_gaps.map(g => <li key={g}>{g}</li>)}</ul>
        </section>
      )}

      {catalog?.references && (
        <section className="refs-section">
          <h3>References</h3>
          <ol>{catalog.references.map(r => <li key={r}>{r}</li>)}</ol>
        </section>
      )}
    </div>
  );
}
