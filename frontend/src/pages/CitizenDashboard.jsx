import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ComplaintList from '../components/ComplaintList';
import complaintService from '../services/complaint.service';

const CitizenDashboard = () => {
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMyComplaints = async () => {
      try {
        setIsLoading(true);
        const res = await complaintService.getMyComplaints();
        setComplaints(res.data || []);
      } catch (err) {
        setError('Failed to fetch your complaints.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMyComplaints();
  }, []);

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  };

  return (
    <div className="space-y-8 font-sans">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Citizen Portal</h1>
          <p className="text-slate-500 mt-1 text-sm">Monitor your reported infrastructure issues.</p>
        </div>
        <Link 
          to="/submit" 
          className="bg-blue-700 text-white px-5 py-2.5 rounded-md font-medium text-sm hover:bg-blue-800 transition shadow-sm"
        >
          Report New Issue
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total Submitted</h3>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{isLoading ? '-' : stats.total}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Pending Review</h3>
          <p className="text-2xl font-semibold text-blue-700 mt-2">{isLoading ? '-' : stats.pending}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Resolved Issues</h3>
          <p className="text-2xl font-semibold text-emerald-700 mt-2">{isLoading ? '-' : stats.resolved}</p>
        </div>
      </div>

      <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-6 text-slate-900">Recent Reports</h2>
        <ComplaintList complaints={complaints} isLoading={isLoading} error={error} />
      </section>
    </div>
  );
};

export default CitizenDashboard;
