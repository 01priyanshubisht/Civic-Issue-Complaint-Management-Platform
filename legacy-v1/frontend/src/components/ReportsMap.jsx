import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Leaflet requires explicit icon in React

const redIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const greenIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});


export default function ReportsMap({ reports }) {
  if (!reports || reports.length === 0) {
    return <p className="text-center mt-4">No reports to display on map.</p>;
  }

  // Default to first report location
  const firstLocation = reports[0].location.split(",");
  const defaultCenter = [
    parseFloat(firstLocation[0]),
    parseFloat(firstLocation[1]),
  ];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      style={{ height: "500px", width: "100%" }}
    >
      {/* Base map layer */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {/* Markers for each report */}
      {reports.map((report) => {
        if (!report.location) return null;
        const [lat, lng] = report.location.split(",").map(Number);
        return (
          <Marker
            key={report.id}
            position={[lat, lng]}
            icon={report.status === "Resolved" ? greenIcon : redIcon}
          >
            <Popup>
              <b>{report.title}</b>
              <br />
              {report.description}
              <br />
              <span className="text-sm text-gray-500">{report.status}</span>
            </Popup>
            <Popup>
              <b>{report.title}</b>
              <br />
              {report.description}
              <br />
              <span className="text-sm">Category: {report.category}</span>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
