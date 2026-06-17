import { MapView } from '../components/map/MapView';
import { WildernessDiagram } from '../components/home/WildernessDiagram';

export function HomePage() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="hero-text">
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
        </div>
        <div className="hero-map">
          <MapView layers={[]} center={[20, -78]} zoom={1.8} />
        </div>
      </section>
      <section className="home-diagram">
        <h2>Conceptual Framework</h2>
        <WildernessDiagram />
      </section>
    </div>
  );
}
