import React, { useState, useEffect } from 'react';
import ComplaintList from '../components/ComplaintList';
import ComplaintsMapView from '../components/ComplaintsMapView';
import complaintService from '../services/complaint.service';

const OfficerDashboard = () => {
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'

  const fetchComplaints = async () => {
    try {
      setIsLoading(true);
      const res = await complaintService.getAllComplaints();
      setComplaints(res.data || []);
    } catch (err) {
      setError('Failed to fetch system complaints.');
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
      alert('Failed to update status. Please try again.');
      fetchComplaints();
    }
  };

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending').length,
    inProgress: complaints.filter(c => c.status === 'in_progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  };

  return (
    <div className="space-y-6 font-sans">
      <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Officer Dispatch Center</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage and resolve municipal infrastructure issues.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 text-sm font-semibold rounded transition ${viewMode === 'list' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}
          >
            List View
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
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total Assigned</h3>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{isLoading ? '-' : stats.total}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Pending Review</h3>
          <p className="text-2xl font-semibold text-slate-700 mt-2">{isLoading ? '-' : stats.pending}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Active Dispatch</h3>
          <p className="text-2xl font-semibold text-blue-700 mt-2">{isLoading ? '-' : stats.inProgress}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Resolved</h3>
          <p className="text-2xl font-semibold text-emerald-700 mt-2">{isLoading ? '-' : stats.resolved}</p>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Jurisdiction Queue</h2>
          <button 
            onClick={fetchComplaints}
            className="text-sm text-blue-700 hover:text-blue-900 font-semibold transition"
          >
            Refresh Data
          </button>
        </div>
        
        {viewMode === 'list' ? (
          <ComplaintList 
            complaints={complaints} 
            isLoading={isLoading} 
            error={error} 
            onStatusUpdate={handleStatusUpdate}
          />
        ) : (
          <ComplaintsMapView complaints={complaints} />
        )}
      </div>
    </div>
  );
};

export default OfficerDashboard;
