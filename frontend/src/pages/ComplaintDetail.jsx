import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import complaintService from '../services/complaint.service';

const statusColors = {
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

const severityColors = {
  Low: 'bg-slate-100 text-slate-700 border-slate-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  High: 'bg-orange-50 text-orange-700 border-orange-200',
  Critical: 'bg-rose-50 text-rose-700 border-rose-200',
};

const priorityColors = {
  Normal: 'bg-slate-100 text-slate-700 border-slate-200',
  Important: 'bg-blue-50 text-blue-700 border-blue-200',
  Urgent: 'bg-orange-50 text-orange-700 border-orange-200',
  Emergency: 'bg-rose-50 text-rose-700 border-rose-200',
};

const ComplaintDetail = () => {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        const res = await complaintService.getComplaintById(id);
        setComplaint(res.data);
      } catch (err) {
        setError('Failed to load complaint details.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchComplaint();
  }, [id]);

  if (isLoading) {
    return <div className="text-center py-20 text-gray-500">Loading details...</div>;
  }

  if (error || !complaint) {
    return <div className="text-center py-20 text-red-500 bg-red-50 rounded-lg">{error || 'Complaint not found.'}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <Link to={-1} className="text-blue-700 hover:text-blue-900 text-sm font-semibold transition">&larr; Return to Dashboard</Link>
      
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {complaint.image_url && (
          <img src={complaint.image_url} alt={complaint.title} className="w-full h-72 object-cover border-b border-slate-100" />
        )}
        <div className="p-8 md:p-10">
          <div className="flex justify-between items-start mb-6">
            <div className="flex gap-2 flex-wrap items-center">
              <span className={`px-3 py-1 text-xs font-bold tracking-wide uppercase rounded border ${statusColors[complaint.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                {complaint.status.replace('_', ' ')}
              </span>
              {complaint.priority && (
                <span className={`px-3 py-1 text-xs font-bold tracking-wide uppercase rounded border ${priorityColors[complaint.priority] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  Priority: {complaint.priority}
                </span>
              )}
              {complaint.severity && (
                <span className={`px-3 py-1 text-xs font-bold tracking-wide uppercase rounded border ${severityColors[complaint.severity] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  Severity: {complaint.severity}
                </span>
              )}
            </div>
            <span className="text-slate-500 text-sm font-medium">{new Date(complaint.created_at).toLocaleDateString()}</span>
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-6 tracking-tight">{complaint.title}</h1>
          
          <div className="bg-slate-50 p-5 rounded border border-slate-200 mb-8 flex flex-wrap gap-8">
            <div>
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Category</span>
              <span className="text-slate-900 capitalize font-medium">{complaint.category.replace('_', ' ')}</span>
            </div>
            {complaint.latitude && complaint.longitude && (
              <div>
                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">GPS Location</span>
                <span className="text-slate-700 font-mono text-sm">{complaint.latitude.toFixed(6)}, {complaint.longitude.toFixed(6)}</span>
              </div>
            )}
            <div>
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reported By</span>
              <span className="text-slate-900 font-medium">{complaint.users?.name || 'Citizen'}</span>
            </div>
          </div>

          <div className="prose max-w-none mb-8">
            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-widest border-b border-slate-100 pb-2">Incident Description</h3>
            <p className="whitespace-pre-wrap leading-relaxed text-slate-700 text-base">{complaint.description}</p>
          </div>

          {(complaint.ai_summary || complaint.ai_category) && (
            <div className="bg-indigo-50/50 p-6 rounded-lg border border-indigo-100">
              <h3 className="text-sm font-bold text-indigo-900 mb-4 uppercase tracking-widest flex items-center gap-2">
                ✨ AI Analysis
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <span className="block text-[11px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Predicted Category</span>
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-900 capitalize font-medium">{complaint.ai_category?.replace('_', ' ') || 'Unknown'}</span>
                    {complaint.ai_confidence && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                        {Math.round(complaint.ai_confidence * 100)}% Match
                      </span>
                    )}
                  </div>
                </div>
                
                <div>
                  <span className="block text-[11px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Duplicate Reports</span>
                  <span className="text-indigo-900 font-medium">
                    {complaint.report_count > 1 
                      ? `${complaint.report_count} merged duplicate reports` 
                      : 'Unique report (no duplicates)'}
                  </span>
                </div>
              </div>

              {complaint.ai_summary && (
                <div className="mb-4 bg-white p-4 rounded border border-indigo-50">
                  <span className="block text-[11px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Smart Summary</span>
                  <p className="text-slate-700 text-sm leading-relaxed">{complaint.ai_summary}</p>
                </div>
              )}

              {complaint.ai_routing && (
                <div>
                  <span className="block text-[11px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Suggested Routing</span>
                  <span className="text-sm font-medium text-indigo-800 bg-indigo-100/50 px-3 py-1.5 rounded inline-block">
                    {complaint.ai_routing}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetail;
