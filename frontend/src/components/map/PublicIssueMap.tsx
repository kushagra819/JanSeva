import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getPublicIssueDetail, getPublicMapIssues, type PublicIssueDetail } from '../../api/public';
import type { MapIssue } from '../../types';
import indiaBoundary from '../../assets/india-boundary.json';

type IssueGroup = {
  key: string;
  latitude: number;
  longitude: number;
  issues: MapIssue[];
  active: number;
  resolved: number;
  emergency: number;
  high: number;
  departments: string[];
};

interface PublicIssueMapProps {
  appMode?: boolean;
  issues?: MapIssue[];
  staffMode?: boolean;
  onIssuesChange?: (issues: MapIssue[]) => void;
  onIssueSelect?: (issue: MapIssue) => void;
}

const isResolved = (issue: MapIssue) => issue.status === 'RESOLVED' || issue.status === 'REJECTED';
const label = (value?: string) => value?.replaceAll('_', ' ') || 'Awaiting routing';
const isInsideIndiaView = (issue: MapIssue) => issue.publicLatitude >= 6.2 && issue.publicLatitude <= 37.8 && issue.publicLongitude >= 67.5 && issue.publicLongitude <= 98.5;

function ZoomObserver({ onZoom }: { onZoom: (zoom: number) => void }) {
  useMapEvents({ zoomend: event => onZoom(event.target.getZoom()) });
  return null;
}

function Recenter({ location }: { location: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (location) map.flyTo(location, 15, { duration: 1.1 }); }, [location, map]);
  return null;
}

const gridSizeForZoom = (zoom: number) => {
  if (zoom <= 8) return 0.15;
  if (zoom <= 11) return 0.07;
  if (zoom <= 13) return 0.03;
  if (zoom === 14) return 0.015;
  return 0;
};

export function PublicIssueMap({ appMode = false, issues: suppliedIssues, staffMode = false, onIssuesChange, onIssueSelect }: PublicIssueMapProps) {
  const [loadedIssues, setLoadedIssues] = useState<MapIssue[]>([]);
  const issues = (suppliedIssues ?? loadedIssues).filter(isInsideIndiaView);
  const [zoom, setZoom] = useState(5);
  const [loading, setLoading] = useState(!suppliedIssues);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [details, setDetails] = useState<Record<string, PublicIssueDetail | 'loading' | 'error'>>({});

  const refresh = useCallback(async () => {
    if (suppliedIssues) { setLoading(false); return; }
    try {
      const result = await getPublicMapIssues();
      const mapped = result.filter(issue => Number.isFinite(issue.publicLatitude) && Number.isFinite(issue.publicLongitude) && isInsideIndiaView(issue));
      setLoadedIssues(mapped);
      onIssuesChange?.(mapped);
      setUpdatedAt(new Date());
      setError('');
    } catch {
      setError('Live issue locations are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }, [onIssuesChange, suppliedIssues]);

  const loadDetail = useCallback(async (issue: MapIssue, force = false) => {
    if (!force && details[issue.id]) return;
    setDetails(current => ({ ...current, [issue.id]: 'loading' }));
    try {
      const detail = await getPublicIssueDetail(issue.id);
      setDetails(current => ({ ...current, [issue.id]: detail }));
    } catch {
      setDetails(current => ({ ...current, [issue.id]: 'error' }));
    }
  }, [details]);

  const locateMe = () => {
    if (!navigator.geolocation) return setError('Location is not supported in this browser.');
    navigator.geolocation.getCurrentPosition(
      position => setCurrentLocation([position.coords.latitude, position.coords.longitude]),
      () => setError('Location permission was denied. You can still explore the map.'),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  useEffect(() => {
    void refresh();
    if (suppliedIssues) return;
    const interval = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(interval);
  }, [refresh, suppliedIssues]);

  const groups = useMemo<IssueGroup[]>(() => {
    const gridSize = gridSizeForZoom(zoom);
    const buckets = new Map<string, MapIssue[]>();
    issues.forEach(issue => {
      const key = gridSize === 0 ? issue.id : `${Math.floor(issue.publicLatitude / gridSize)}:${Math.floor(issue.publicLongitude / gridSize)}`;
      buckets.set(key, [...(buckets.get(key) || []), issue]);
    });
    return [...buckets.entries()].map(([key, groupedIssues]) => {
      const resolved = groupedIssues.filter(isResolved).length;
      return {
        key,
        latitude: groupedIssues.reduce((sum, issue) => sum + issue.publicLatitude, 0) / groupedIssues.length,
        longitude: groupedIssues.reduce((sum, issue) => sum + issue.publicLongitude, 0) / groupedIssues.length,
        issues: groupedIssues,
        active: groupedIssues.length - resolved,
        resolved,
        emergency: groupedIssues.filter(issue => issue.priority === 'EMERGENCY').length,
        high: groupedIssues.filter(issue => issue.priority === 'HIGH').length,
        departments: [...new Set(groupedIssues.map(issue => label(issue.departmentCode)))]
      };
    });
  }, [issues, zoom]);

  const totals = useMemo(() => {
    const resolved = issues.filter(isResolved).length;
    return { all: issues.length, active: issues.length - resolved, resolved };
  }, [issues]);

  const mapHeight = appMode ? 'h-[calc(100dvh-9.25rem)] min-h-[520px] w-full' : staffMode ? 'h-[68vh] min-h-[500px] w-full' : 'h-[62vh] min-h-[440px] w-full';

  return <div className={`overflow-hidden border border-white/10 bg-[#0b111b] shadow-2xl shadow-black/30 ${appMode ? 'rounded-none border-x-0' : 'rounded-[1.75rem]'}`}>
    {!appMode && <div className="grid gap-3 border-b border-white/10 p-4 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:items-center">
      {[
        ['Mapped issues', totals.all, 'text-white'],
        ['Active', totals.active, 'text-amber-300'],
        ['Resolved', totals.resolved, 'text-emerald-300']
      ].map(([title, value, color]) => <div key={title} className="rounded-xl bg-white/[.045] px-4 py-3"><p className="text-xs text-slate-400">{title}</p><p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p></div>)}
      <div className="flex items-center gap-2 text-xs text-slate-400 sm:justify-end"><span className={`h-2 w-2 rounded-full ${error ? 'bg-red-400' : 'animate-pulse bg-emerald-400'}`} />{loading ? 'Connecting…' : error || (staffMode ? 'Role-scoped live map' : `Live · updated ${updatedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)}</div>
    </div>}

    <div className="relative">
      <MapContainer
        center={[22.5937, 78.9629]}
        zoom={5}
        minZoom={5}
        maxBounds={[[6.2, 67.5], [37.8, 98.5]]}
        maxBoundsViscosity={1}
        scrollWheelZoom
        className={mapHeight}
        preferCanvas
      >
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <GeoJSON
          data={indiaBoundary as any}
          interactive={false}
          style={{ color: '#ff8a27', weight: 2.4, opacity: .95, fillColor: '#ff7a2f', fillOpacity: .08 }}
        />
        <ZoomObserver onZoom={setZoom} />
        <Recenter location={currentLocation} />
        {currentLocation && <CircleMarker center={currentLocation} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2a7fff', fillOpacity: 1 }}><Tooltip permanent direction="top">You are here</Tooltip></CircleMarker>}
        {groups.map(group => {
          const color = group.emergency > 0 ? '#ef4444' : group.active > 0 ? '#f4c430' : '#70c44f';
          const isSingle = group.issues.length === 1;
          const radius = isSingle ? (zoom >= 15 ? 8 : 11) : Math.min(34, 13 + Math.log2(group.issues.length + 1) * 5);
          const issue = group.issues[0];
          const detail = details[issue.id];
          return <CircleMarker key={group.key} center={[group.latitude, group.longitude]} radius={radius} pathOptions={{ color: '#fff', weight: isSingle ? 2 : 1, opacity: .9, fillColor: color, fillOpacity: isSingle ? .95 : .75 }} eventHandlers={isSingle ? { popupopen: () => void loadDetail(issue) } : undefined}>
            {!isSingle && <Tooltip permanent direction="center" className="issue-count-tooltip">{group.issues.length}</Tooltip>}
            <Popup className="issue-map-popup">
              <div className="w-[270px] max-w-full space-y-2 text-slate-900">
                <strong>{isSingle ? issue.trackingCode : `${group.issues.length} issues in this area`}</strong>
                <div className="text-xs">
                  {isSingle ? <>
                    <p><b>Status:</b> {label(issue.status)}</p>
                    <p><b>Department:</b> {label(issue.departmentCode)}</p>
                    <p><b>Priority:</b> {label(issue.priority)}</p>
                    {detail === 'loading' && <p className="pt-2 text-slate-500">Loading issue details…</p>}
                    {detail === 'error' && <button type="button" className="mt-2 font-semibold text-blue-700" onClick={() => void loadDetail(issue, true)}>Retry details</button>}
                    {typeof detail === 'object' && <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                      {detail.hasPublicImage && detail.publicImageUrl && <img src={detail.publicImageUrl} alt={`Evidence for ${issue.trackingCode}`} className="h-32 w-full rounded-lg object-cover" />}
                      <p className="max-h-24 overflow-y-auto whitespace-pre-wrap leading-5">{detail.description}</p>
                      <p className="text-[11px] text-slate-500">Reported {new Date(detail.createdAt).toLocaleString()}</p>
                      {detail.timeline.length > 0 && <div className="rounded-lg bg-slate-100 p-2"><b className="block text-[11px] uppercase tracking-wide text-slate-500">Latest update</b><span>{detail.timeline.at(-1)?.message}</span></div>}
                    </div>}
                    {staffMode && onIssueSelect && <button type="button" onClick={() => onIssueSelect(issue)} className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white">Open work item</button>}
                  </> : <>
                    <p><b>Active:</b> {group.active} · <b>Resolved:</b> {group.resolved}</p>
                    <p><b>Priority:</b> {group.emergency} emergency · {group.high} high</p>
                    <p><b>Departments:</b> {group.departments.join(', ')}</p>
                    <p className="mt-1 text-slate-500">Zoom in to open individual issues.</p>
                  </>}
                </div>
              </div>
            </Popup>
          </CircleMarker>;
        })}
      </MapContainer>
      <button type="button" onClick={locateMe} className="absolute right-3 top-3 z-[500] flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#0b111b]/95 text-xl text-white shadow-xl backdrop-blur transition hover:bg-white/10" aria-label="Use my current location">⌖</button>
      {!loading && issues.length === 0 && !error && <div className="pointer-events-none absolute inset-x-0 top-6 z-[500] mx-auto w-fit rounded-full border border-white/10 bg-black/75 px-4 py-2 text-sm text-white backdrop-blur">No mapped issues yet. New reports will appear automatically.</div>}
      {!appMode && <div className="pointer-events-none absolute bottom-7 left-3 z-[500] rounded-xl border border-white/10 bg-[#0b111b]/90 p-3 text-xs text-slate-300 shadow-xl backdrop-blur"><p className="mb-2 font-semibold text-white">Issue status</p><div className="space-y-1.5"><p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />Emergency</p><p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#f4c430]" />Active</p><p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#70c44f]" />Resolved</p></div></div>}
    </div>
    <p className="border-t border-white/10 bg-[#0b111b]/95 px-4 py-3 text-center text-xs text-slate-300">{staffMode ? 'Tap a pin for details, then open the work item · exact coordinates are role-protected' : 'Tap any pin to see the issue, evidence and responsible department · public locations are privacy-rounded'}</p>
  </div>;
}
