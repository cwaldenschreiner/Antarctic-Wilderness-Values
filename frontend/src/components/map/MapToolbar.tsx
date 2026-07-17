export type MapInteractionMode = 'pan' | 'zoom-box' | 'select';

interface Props {
  mode: MapInteractionMode;
  onModeChange: (mode: MapInteractionMode) => void;
  onZoomAntarctica: () => void;
  onZoomData: () => void;
  hasData: boolean;
  selectedLabel: string | null;
  onClearSelection: () => void;
}

export function MapToolbar({
  mode,
  onModeChange,
  onZoomAntarctica,
  onZoomData,
  hasData,
  selectedLabel,
  onClearSelection,
}: Props) {
  return (
    <div className="map-toolbar">
      <div className="map-toolbar-group" role="group" aria-label="Map interaction mode">
        <button
          type="button"
          className={mode === 'pan' ? 'active' : ''}
          onClick={() => onModeChange('pan')}
          title="Pan and scroll zoom"
        >
          Pan
        </button>
        <button
          type="button"
          className={mode === 'zoom-box' ? 'active' : ''}
          onClick={() => onModeChange('zoom-box')}
          title="Drag a box to zoom"
        >
          Zoom
        </button>
        <button
          type="button"
          className={mode === 'select' ? 'active' : ''}
          onClick={() => onModeChange('select')}
          title="Click features to select"
        >
          Select
        </button>
      </div>
      <div className="map-toolbar-group" role="group" aria-label="Zoom extent">
        <button type="button" onClick={onZoomAntarctica} title="Zoom to full Antarctic view">
          ⊕ Antarctica
        </button>
        <button type="button" onClick={onZoomData} disabled={!hasData} title="Zoom to visible data">
          ⊕ Data
        </button>
      </div>
      {selectedLabel && (
        <div className="map-selection-chip">
          <span>{selectedLabel}</span>
          <button type="button" onClick={onClearSelection} aria-label="Clear selection">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
