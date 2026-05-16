import React from 'react';
import ComplaintCard from './ComplaintCard';

const ComplaintList = ({ complaints, isLoading, error, onStatusUpdate }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(n => (
          <div key={n} className="animate-pulse bg-white rounded-lg shadow-sm border border-gray-200 h-80">
            <div className="h-48 bg-gray-200 w-full rounded-t-lg"></div>
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-12 text-red-500 bg-red-50 rounded-lg">{error}</div>;
  }

  if (!complaints || complaints.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
        <p className="text-gray-500">No complaints found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
      {complaints.map(complaint => (
        <ComplaintCard key={complaint.id} complaint={complaint} onStatusUpdate={onStatusUpdate} />
      ))}
    </div>
  );
};

export default ComplaintList;
