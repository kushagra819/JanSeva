import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '../ui/button';
import { MapPin, Navigation } from 'lucide-react';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLocation?: { lat: number; lng: number };
}

function MapClickEvents({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationPicker({ onLocationSelect, initialLocation }: LocationPickerProps) {
  const [position, setPosition] = useState<L.LatLngTuple | null>(
    initialLocation ? [initialLocation.lat, initialLocation.lng] : null
  );
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultCenter: L.LatLngTuple = [20.5937, 78.9629]; // Default to center of India

  const handleLocationSelect = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onLocationSelect(lat, lng);
  };

  const captureGPS = () => {
    setLoadingLocation(true);
    setError(null);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoadingLocation(false);
          handleLocationSelect(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          setLoadingLocation(false);
          if (err.code === err.PERMISSION_DENIED) {
            setError("GPS permission denied. Please tap on the map to select location manually.");
          } else {
            setError("Could not determine location. Please select manually on the map.");
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLoadingLocation(false);
      setError("Geolocation is not supported by your browser.");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--foreground)] flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location
        </label>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={captureGPS}
          disabled={loadingLocation}
          className="text-xs"
        >
          <Navigation className="mr-2 h-3 w-3" />
          {loadingLocation ? "Locating..." : "Use Current Location"}
        </Button>
      </div>

      {error && <div className="text-xs text-[var(--warning)] bg-[var(--warning)]/10 p-2 rounded">{error}</div>}

      <div className="h-64 w-full rounded-xl overflow-hidden border border-[var(--border)] relative z-0">
        <MapContainer
          center={position || defaultCenter}
          zoom={position ? 15 : 4}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickEvents onLocationSelect={handleLocationSelect} />
          {position && <Marker position={position} draggable={true} eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const pos = marker.getLatLng();
              handleLocationSelect(pos.lat, pos.lng);
            }
          }} />}
        </MapContainer>
      </div>
      
      {position && (
        <div className="text-xs text-[var(--muted)]">
          Selected Coordinates: {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </div>
      )}
    </div>
  );
}
