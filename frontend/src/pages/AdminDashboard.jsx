import { useState, useEffect } from "react";
import ReportsMap from "../components/ReportsMap";

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");

  // Fetch reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/reports");
      const data = await res.json();
      if (res.ok) {
        setReports(data);
      } else {
        setError(data.error || "Failed to fetch reports");
      }
    } catch (err) {
      setError("Network Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Update report status
  const updateReport = async (id, newStatus) => {
    try {
      const res = await fetch(`http://localhost:8000/report/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchReports();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Network Error: " + err.message);
    }
  };

  // Delete report
  const deleteReport = async (id) => {
    if (!confirm("Are you sure you want to delete this report?")) return;
    try {
      const res = await fetch(`http://localhost:8000/report/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        fetchReports();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Network Error: " + err.message);
    }
  };

  const filteredReports =
    filter === "All" ? reports : reports.filter((r) => r.status === filter);
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="w-full bg-gray-900 shadow-md p-4">
        <h2 className="text-2xl font-bold tracking-wide">Admin Dashboard</h2>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
          <div className="flex gap-3">
            {["All", "Pending", "Resolved"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-5 py-2 rounded-lg font-medium transition ${
                  filter === status
                    ? status === "Pending"
                      ? "bg-red-500 text-white shadow"
                      : status === "Resolved"
                      ? "bg-green-500 text-white shadow"
                      : "bg-blue-500 text-white shadow"
                    : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <button
            onClick={fetchReports}
            className="px-5 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow hover:bg-indigo-700 transition"
          >
            Refresh Reports
          </button>
        </div>
        <div className="overflow-x-auto shadow-md rounded-lg bg-gray-900 border border-gray-700">
          <table className="w-full text-sm text-left text-gray-200 border-collapse">
            <thead className="bg-gray-800 text-gray-300 sticky top-0 z-10">
              <tr>
                <th className="p-2 border border-gray-700 text-center">ID</th>
                <th className="p-2 border border-gray-700">Title</th>
                <th className="p-2 border border-gray-700 w-64">Description</th>
                <th className="p-2 border border-gray-700 w-48">Location</th>
                <th className="p-2 border border-gray-700 text-center">
                  Category
                </th>
                <th className="p-2 border border-gray-700 text-center">
                  Status
                </th>
                <th className="p-2 border border-gray-700 text-center">
                  Actions
                </th>
                <th className="p-2 border border-gray-700 text-center">
                  Image
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report, idx) => (
                <tr
                  key={report.id}
                  className={`transition-colors ${
                    idx % 2 === 0 ? "bg-gray-900" : "bg-gray-800"
                  } hover:bg-gray-700`}
                >
                  <td className="p-2 border border-gray-700 text-center">
                    {report.id}
                  </td>
                  <td className="p-2 border border-gray-700 font-medium truncate max-w-[150px]">
                    {report.title}
                  </td>
                  <td className="p-2 border border-gray-700 whitespace-pre-wrap">
                    {report.description}
                  </td>
                  <td className="p-2 border border-gray-700 whitespace-pre-wrap">
                    {report.location}
                  </td>
                  <td className="p-2 border border-gray-700 text-center">
                    <span
                      className={`px-2 py-1 rounded text-white text-xs font-semibold ${
                        report.category === "pothole"
                          ? "bg-red-500"
                          : report.category === "garbage"
                          ? "bg-green-600"
                          : "bg-blue-500"
                      }`}
                    >
                      {report.category || "N/A"}
                    </span>
                  </td>
                  <td
                    className={`p-2 border border-gray-700 text-center font-semibold ${
                      report.status === "Resolved"
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {report.status}
                  </td>
                  <td className="p-2 border border-gray-700 text-center space-x-2">
                    <button
                      onClick={() => updateReport(report.id, "Resolved")}
                      className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => deleteReport(report.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs"
                    >
                      Delete
                    </button>
                  </td>
                  <td className="p-2 border border-gray-700 text-center">
                    {report.image_url && (
                      <img
                        src={report.image_url}
                        alt="Report"
                        className="h-14 w-14 object-cover rounded border border-gray-600 mx-auto"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 rounded-lg overflow-hidden shadow-lg border border-gray-700 bg-gray-900">
          <ReportsMap reports={filteredReports} />
        </div>
        <div className="text-center mt-6">
          {" "}
          <a
            href="/"
            className="text-blue-300 hover:text-blue-800 font-semibold hover:underline transition"
          >
            {" "}
            ← Back to Home{" "}
          </a>{" "}
        </div>
      </div>
    </div>
  );

}
