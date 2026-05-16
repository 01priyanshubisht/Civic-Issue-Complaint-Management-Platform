import React, { useState, useEffect } from 'react';
import complaintService from '../services/complaint.service';
import Table from '../components/Table';
import Select from '../components/Select';
import ComplaintsMapView from '../components/ComplaintsMapView';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const AdminDashboard = () => {
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'map'

  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');

  const fetchComplaints = async () => {
    try {
      setIsLoading(true);
      const res = await complaintService.getAllComplaints();
      setComplaints(res.data || []);
    } catch (err) {
      setError('Failed to fetch complaints data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await complaintService.updateComplaintStatus(id, newStatus);
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const filteredComplaints = complaints.filter(c => {
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterCategory && c.category !== filterCategory) return false;
    if (filterSeverity && c.severity !== filterSeverity) return false;
    return true;
  });

  const priorityWeight = {
    Emergency: 4,
    Urgent: 3,
    Important: 2,
    Normal: 1,
  };

  const sortedAndFilteredComplaints = [...filteredComplaints].sort((a, b) => {
    const weightA = priorityWeight[a.priority] || 0;
    const weightB = priorityWeight[b.priority] || 0;
    // Sort by priority descending
    if (weightA !== weightB) {
      return weightB - weightA;
    }
    // Then by date descending
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const stats = {
    total: complaints.length,
    resolutionRate: complaints.length ? Math.round((complaints.filter(c => c.status === 'resolved').length / complaints.length) * 100) : 0,
    pending: complaints.filter(c => c.status === 'pending').length,
    active: complaints.filter(c => c.status === 'in_progress').length,
  };

  return (
    <div className="space-y-6 font-sans">
      <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Administration</h1>
          <p className="text-slate-500 mt-1 text-sm">Platform overview and data management.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 text-sm font-semibold rounded transition ${viewMode === 'table' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}
          >
            Table View
          </button>
          <button 
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 text-sm font-semibold rounded transition ${viewMode === 'map' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}
          >
            Map View
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">System Total</h3>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{isLoading ? '-' : stats.total}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Resolution Rate</h3>
          <p className="text-2xl font-semibold text-emerald-700 mt-2">{isLoading ? '-' : `${stats.resolutionRate}%`}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Pending Review</h3>
          <p className="text-2xl font-semibold text-slate-700 mt-2">{isLoading ? '-' : stats.pending}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Active Dispatch</h3>
          <p className="text-2xl font-semibold text-blue-700 mt-2">{isLoading ? '-' : stats.active}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
          <h2 className="text-xl font-semibold">Complaint Management</h2>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-end">
            <div className="w-full sm:w-48">
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="w-full sm:w-48">
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                <option value="pothole">Pothole</option>
                <option value="street_light">Street Light</option>
                <option value="garbage">Garbage</option>
                <option value="water_leak">Water Leak</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="w-full sm:w-32">
              <select 
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Severities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
        </div>

        {error && <div className="text-red-500 mb-4">{error}</div>}

        {viewMode === 'table' ? (
          <Table headers={['Date', 'Priority', 'Title', 'Category', 'User', 'Status', 'Action']}>
            {isLoading ? (
              <tr><td colSpan="7" className="text-center py-12 text-slate-500 text-sm">Loading data...</td></tr>
            ) : sortedAndFilteredComplaints.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-12 text-slate-500 text-sm">No records found matching filters.</td></tr>
            ) : (
              sortedAndFilteredComplaints.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition border-b border-slate-100 last:border-0">
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm font-medium">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {c.priority && (
                      <span className={`px-2 py-1 text-[10px] font-bold tracking-wide uppercase rounded border ${
                        c.priority === 'Emergency' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        c.priority === 'Urgent' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        c.priority === 'Important' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {c.priority}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-900 text-sm font-medium max-w-xs truncate">{c.title}</td>
                  <td className="px-6 py-4 capitalize text-slate-600 text-sm">{c.category.replace('_', ' ')}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{c.users?.name || 'Unknown User'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 inline-flex text-[11px] leading-5 font-bold uppercase tracking-wide rounded border ${
                      c.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      c.status === 'pending' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                      c.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <select
                      value={c.status}
                      onChange={(e) => handleStatusUpdate(c.id, e.target.value)}
                      className="border border-slate-300 rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 focus:ring-1 focus:ring-slate-400 outline-none cursor-pointer"
                    >
                      <option value="pending">PENDING</option>
                      <option value="in_progress">IN PROGRESS</option>
                      <option value="resolved">RESOLVED</option>
                      <option value="rejected">REJECTED</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </Table>
        ) : (
          <ComplaintsMapView complaints={sortedAndFilteredComplaints} />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
