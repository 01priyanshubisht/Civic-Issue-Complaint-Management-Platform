import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix leaflet icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
};

// This component ensures the map view updates when the position state changes externally
const MapUpdater = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15);
    }
  }, [position, map]);
  return null;
};

const LocationPickerMap = ({ position, setPosition }) => {
  const [defaultCenter, setDefaultCenter] = useState([28.6139, 77.2090]); // New Delhi default

  useEffect(() => {
    if (navigator.geolocation && !position) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setDefaultCenter(coords);
          setPosition(coords);
        },
        (err) => {
          console.warn("Location access denied or unavailable", err);
        }
      );
    }
  }, [position, setPosition]);

  return (
    <div className="h-64 w-full rounded-md overflow-hidden border border-slate-300 shadow-sm relative z-0">
      <MapContainer
        center={position || defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={setPosition} />
        <MapUpdater position={position} />
      </MapContainer>
      <div className="absolute top-2 right-2 z-[1000] bg-white px-2 py-1 rounded text-xs font-medium shadow-md pointer-events-none">
        Click map to drop pin
      </div>
    </div>
  );
};

export default LocationPickerMap;
