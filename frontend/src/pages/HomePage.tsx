import { AntarcticaWatermark } from '../components/home/AntarcticaWatermark';
import { WildernessDiagram } from '../components/home/WildernessDiagram';

export function HomePage() {
  return (
    <div className="home-page">
      <section className="home-intro">
        <h1>Antarctic Wilderness Values Dashboard</h1>
        <p className="subtitle">ANT-MICI · WP3 — Assessing cumulative impacts on biodiversity and wilderness values</p>
        <p>
          Antarctic tourism has grown for over 30 years, raising concerns about cumulative impacts on biodiversity
          and wilderness values. This dashboard supports policymakers and the tourism sector with interactive maps
          and analytics for <strong>Remoteness</strong>, <strong>Wildness</strong>, and <strong>Pristineness</strong>
          — the three pillars of Antarctic wilderness character.
        </p>
        <p>
          Methods follow Summerson &amp; Bishop (2012) and ATCM XXXVI IP 39 (2013) visibility-distance thresholds,
          with cumulative viewshed analysis for wildness and inviolate-area metrics for pristineness.
        </p>
      </section>

      <section className="home-diagram-showcase">
        <AntarcticaWatermark />
        <div className="home-diagram-content">
          <h2>Conceptual Framework</h2>
          <p className="diagram-caption">
            Overall Antarctic Wilderness Value / Character — Remoteness, Pristineness, and Wildness
          </p>
          <WildernessDiagram />
        </div>
      </section>
    </div>
  );
}
