import { useEffect, useState } from 'react';
import { fetchCatalog } from '../api/client';

interface CatalogLayer {
  id: string;
  name: string;
  source: string;
  license: string;
  vintage: string;
  description: string;
  citation: string;
  tabs: string[];
}

export function DataSourcesPage() {
  const [catalog, setCatalog] = useState<{ layers: CatalogLayer[]; references?: string[]; data_gaps?: string[] } | null>(null);

  useEffect(() => {
    fetchCatalog().then(setCatalog).catch(console.error);
  }, []);

  return (
    <div className="data-sources-page">
      <h2>Data Sources</h2>
      <p className="intro">
        Catalog of bundled and reference datasets for wilderness value indicator analysis. Methods follow
        Summerson (2012), Summerson &amp; Bishop (2012), and ATCM XXXVI IP 39 (2013).
      </p>
      <div className="catalog-grid">
        {catalog?.layers.map((layer) => (
          <article key={layer.id} className="catalog-card">
            <h3>{layer.name}</h3>
            <dl>
              <dt>Source</dt>
              <dd>{layer.source}</dd>
              <dt>License</dt>
              <dd>{layer.license}</dd>
              <dt>Vintage</dt>
              <dd>{layer.vintage}</dd>
              <dt>Used in</dt>
              <dd>{layer.tabs.join(', ')}</dd>
            </dl>
            <p>{layer.description}</p>
            <cite>{layer.citation}</cite>
          </article>
        ))}
      </div>
      {catalog?.data_gaps && (
        <section className="data-gaps">
          <h3>Known Data Gaps</h3>
          <ul>
            {catalog.data_gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </section>
      )}
      {catalog?.references && (
        <section className="references">
          <h3>References</h3>
          <ul>
            {catalog.references.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
