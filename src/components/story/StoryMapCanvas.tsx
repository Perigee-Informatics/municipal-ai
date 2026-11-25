// Browser-only: imported lazily from the Story Map page.
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { typeColor, type StoryView } from "@/lib/stories";

export default function StoryMapCanvas({ stories, activeId, onSelect }: { stories: StoryView[]; activeId: string | null; onSelect: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const cluster = useRef<L.MarkerClusterGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { scrollWheelZoom: false }).setView([27.7, 85.3], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map.current);
    cluster.current = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 40 });
    map.current.addLayer(cluster.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const c = cluster.current;
    if (!c) return;
    c.clearLayers();
    markers.current.clear();
    stories.forEach((s) => {
      if (s.latitude == null || s.longitude == null) return;
      const color = typeColor(s.event_types?.name);
      const icon = L.divIcon({
        className: "",
        html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const m = L.marker([s.latitude, s.longitude], { icon, title: s.title }).on("click", () => onSelect(s.id));
      markers.current.set(s.id, m);
      c.addLayer(m);
    });
    const pts = stories.filter((s) => s.latitude != null).map((s) => [s.latitude!, s.longitude!] as [number, number]);
    if (pts.length && map.current) map.current.fitBounds(L.latLngBounds(pts).pad(0.2), { maxZoom: 7 });
  }, [stories, onSelect]);

  useEffect(() => {
    if (!activeId || !map.current || !cluster.current) return;
    const m = markers.current.get(activeId);
    if (!m) return;
    cluster.current.zoomToShowLayer(m, () => m.openTooltip?.());
  }, [activeId]);

  return <div ref={el} className="h-full w-full" />;
}
