import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const statusColors = {
  pending: '#eab308', // yellow-500
  in_progress: '#3b82f6', // blue-500
  resolved: '#22c55e', // green-500
  rejected: '#ef4444', // red-500
};

const createCustomIcon = (status) => {
  const color = statusColors[status] || '#6b7280'; // gray-500 fallback
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 16px;
        height: 16px;
        display: block;
        left: -8px;
        top: -8px;
        position: relative;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 4px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
  });
};

const ComplaintsMapView = ({ complaints }) => {
  const validComplaints = complaints.filter(c => c.latitude && c.longitude);
  
  // Center roughly based on first complaint or default to New Delhi
  const defaultCenter = validComplaints.length > 0 
    ? [validComplaints[0].latitude, validComplaints[0].longitude] 
    : [28.6139, 77.2090];

  return (
    <div className="h-[500px] w-full rounded-lg overflow-hidden border border-gray-300 shadow-sm relative z-0">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validComplaints.map(complaint => (
          <Marker 
            key={complaint.id} 
            position={[complaint.latitude, complaint.longitude]}
            icon={createCustomIcon(complaint.status)}
          >
            <Popup>
              <div className="p-1 min-w-[200px]">
                <div className="font-bold text-gray-900 mb-1">{complaint.title}</div>
                <div className="text-xs text-gray-500 mb-2 capitalize">{complaint.category.replace('_', ' ')}</div>
                <div className="text-sm text-gray-700 line-clamp-2 mb-2">{complaint.description}</div>
                <div className="text-xs font-semibold mt-2" style={{ color: statusColors[complaint.status] }}>
                  {complaint.status.replace('_', ' ').toUpperCase()}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default ComplaintsMapView;
