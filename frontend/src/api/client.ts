const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function fetchCatalog() {
  const r = await fetch(`${API_BASE}/layers/catalog`);
  if (!r.ok) throw new Error('Failed to load catalog');
  return r.json();
}

export async function fetchLayer(name: string) {
  const r = await fetch(`${API_BASE}/layers/${name}`);
  if (!r.ok) throw new Error(`Failed to load layer ${name}`);
  return r.json();
}

export async function uploadFile(file: File) {
  const form = new FormData();
  form.append('file', file);
  const r = await fetch(`${API_BASE}/upload`, { method: 'POST', body: form });
  if (!r.ok) throw new Error('Upload failed');
  return r.json();
}

export async function analyzeRemoteness(body: Record<string, unknown>) {
  const r = await fetch(`${API_BASE}/analyze/remoteness`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('Remoteness analysis failed');
  return r.json();
}

export async function analyzeWildness(body: Record<string, unknown>) {
  const r = await fetch(`${API_BASE}/analyze/wildness`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('Wildness analysis failed');
  return r.json();
}

export async function analyzePristineness(body: Record<string, unknown>) {
  const r = await fetch(`${API_BASE}/analyze/pristineness`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('Pristineness analysis failed');
  return r.json();
}
