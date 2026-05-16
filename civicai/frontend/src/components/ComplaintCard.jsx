import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from './Button';

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

const ComplaintCard = ({ complaint, onStatusUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState(complaint.status);
  const date = new Date(complaint.created_at).toLocaleDateString();

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    if (onStatusUpdate) {
      setIsUpdating(true);
      await onStatusUpdate(complaint.id, newStatus);
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow transition flex flex-col h-full">
      {complaint.image_url ? (
        <img 
          src={complaint.image_url} 
          alt={complaint.title} 
          className="w-full h-48 object-cover border-b border-slate-100"
        />
      ) : (
        <div className="w-full h-48 bg-slate-50 flex flex-col items-center justify-center text-slate-400 border-b border-slate-100">
          <span className="text-xl mb-1">📷</span>
          <span className="text-xs font-medium uppercase tracking-wider">No Image Attached</span>
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-2 items-center flex-wrap">
            {onStatusUpdate ? (
              <select
                value={status}
                onChange={handleStatusChange}
                disabled={isUpdating}
                className={`text-xs font-bold tracking-wide uppercase rounded px-2 py-1 border focus:ring-1 focus:ring-slate-400 outline-none transition cursor-pointer ${statusColors[status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}
              >
                <option value="pending">PENDING</option>
                <option value="in_progress">IN PROGRESS</option>
                <option value="resolved">RESOLVED</option>
                <option value="rejected">REJECTED</option>
              </select>
            ) : (
              <span className={`px-2 py-1 text-xs font-bold tracking-wide uppercase rounded border ${statusColors[complaint.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                {complaint.status.replace('_', ' ')}
              </span>
            )}
            {complaint.ai_category && (
              <span className="px-2 py-1 text-[10px] font-bold tracking-wide uppercase rounded bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                ✨ AI
              </span>
            )}
            {complaint.report_count > 1 && (
              <span className="px-2 py-1 text-[10px] font-bold tracking-wide uppercase rounded bg-slate-50 text-slate-700 border border-slate-200">
                {complaint.report_count}x Reports
              </span>
            )}
            {complaint.priority && (
              <span className={`px-2 py-1 text-[10px] font-bold tracking-wide uppercase rounded border ${priorityColors[complaint.priority] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                {complaint.priority}
              </span>
            )}
            {complaint.severity && (
              <span className={`px-2 py-1 text-[10px] font-bold tracking-wide uppercase rounded border ${severityColors[complaint.severity] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                Sev: {complaint.severity}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap ml-2">{date}</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2 truncate">{complaint.title}</h3>
        <p className="text-sm text-slate-600 mb-5 line-clamp-2 flex-1 leading-relaxed">{complaint.description}</p>
        
        <div className="flex justify-between items-center text-xs text-slate-500 mt-auto pt-4 border-t border-slate-100">
          <span className="capitalize font-semibold text-slate-700 tracking-wide">{complaint.category.replace('_', ' ')}</span>
          {complaint.latitude && complaint.longitude && (
            <span className="text-slate-500 font-mono">
              {complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)}
            </span>
          )}
        </div>
        
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <Link 
            to={`/complaint/${complaint.id}`}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded"
          >
            View Details &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ComplaintCard;
