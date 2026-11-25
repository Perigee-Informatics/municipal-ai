// Browser-only mini map: click or drag the pin to set coordinates.
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function LocationPicker({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const pin = useRef<L.Marker | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!el.current || map.current) return;
    const icon = L.divIcon({ className: "", html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#d4913b;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.5)"></span>', iconSize: [18, 18], iconAnchor: [9, 9] });
    map.current = L.map(el.current).setView([lat, lng], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(map.current);
    pin.current = L.marker([lat, lng], { draggable: true, icon }).addTo(map.current);
    pin.current.on("dragend", () => { const p = pin.current!.getLatLng(); cb.current(p.lat, p.lng); });
    map.current.on("click", (e: L.LeafletMouseEvent) => { pin.current!.setLatLng(e.latlng); cb.current(e.latlng.lat, e.latlng.lng); });
    return () => { map.current?.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cur = pin.current?.getLatLng();
    if (pin.current && cur && (Math.abs(cur.lat - lat) > 1e-6 || Math.abs(cur.lng - lng) > 1e-6)) {
      pin.current.setLatLng([lat, lng]);
      map.current?.panTo([lat, lng]);
    }
  }, [lat, lng]);

  return <div ref={el} className="h-64 w-full rounded-lg border border-border" />;
}
