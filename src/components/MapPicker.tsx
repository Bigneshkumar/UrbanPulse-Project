import React, { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: any;
  }
}

export type Coords = { lat: number; lng: number };

type MapPickerProps = {
  value?: Coords;
  onChange?: (coords: Coords & { address?: string }) => void;
  height?: number;
};

const MapPicker: React.FC<MapPickerProps> = ({ value, onChange, height = 320 }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<any>(null);
  const DEFAULT_MAPS_KEY = "AIzaSyC-CDJEmo0jSpMPSx3HW8qpC31mHTOuKeI";
  const [apiKey, setApiKey] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("GOOGLE_MAPS_KEY") || DEFAULT_MAPS_KEY : DEFAULT_MAPS_KEY
  );
  const [coords, setCoords] = useState<Coords | undefined>(value);

  useEffect(() => {
    setCoords(value);
  }, [value]);

  useEffect(() => {
    if (!apiKey) return;

    function initMap() {
      if (!containerRef.current || !window.google) return;
      const center = coords || { lat: 23.8103, lng: 90.4125 }; // Dhaka as default
      const map = new window.google.maps.Map(containerRef.current, {
        center,
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      if (coords) {
        markerRef.current = new window.google.maps.Marker({ position: coords, map });
      }

      const geocoder = new window.google.maps.Geocoder();

      map.addListener("click", (e: any) => {
        const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() } as Coords;
        if (markerRef.current) markerRef.current.setMap(null);
        markerRef.current = new window.google.maps.Marker({ position: pos, map });
        geocoder.geocode({ location: pos }, (results: any, status: string) => {
          const address = status === "OK" && results?.[0]?.formatted_address ? results[0].formatted_address : undefined;
          setCoords(pos);
          onChange?.({ ...pos, address });
        });
      });
    }

    // Load script if not already present
    if (!window.google) {
      const scriptId = "google-maps-script";
      if (!document.getElementById(scriptId)) {
        const s = document.createElement("script");
        s.id = scriptId;
        s.async = true;
        s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
        s.onload = initMap;
        document.body.appendChild(s);
      } else {
        // already present
        initMap();
      }
    } else {
      initMap();
    }
  }, [apiKey]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(p);
      onChange?.(p);
    });
  };

  if (!apiKey) {
    return (
      <div className="space-y-2">
        <div className="text-sm opacity-80">Enter your Google Maps API key to enable the live map (saved locally):</div>
        <div className="flex gap-2">
          <input
            aria-label="Google Maps API Key"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="AIza..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button
            className="rounded-md px-3 py-2 text-sm bg-primary text-primary-foreground"
            onClick={() => {
              localStorage.setItem("GOOGLE_MAPS_KEY", apiKey);
            }}
          >Save</button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={useMyLocation}
            className="rounded-md px-3 py-2 text-sm bg-secondary text-secondary-foreground"
          >Use my location</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border" style={{ height }}>
      <div ref={containerRef} className="w-full h-full rounded-md" />
      <div className="p-2 text-xs text-muted-foreground">
        Tip: Click on the map to set the exact problem location.
      </div>
    </div>
  );
};

export default MapPicker;
