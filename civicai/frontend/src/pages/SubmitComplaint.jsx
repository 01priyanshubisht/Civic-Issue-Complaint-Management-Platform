import React from 'react';
import CreateComplaintForm from '../components/CreateComplaintForm';

const SubmitComplaint = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Report a Civic Issue</h1>
        <p className="text-gray-500 mt-1">Please provide details and location of the issue so authorities can address it.</p>
      </header>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <CreateComplaintForm />
      </div>
    </div>
  );
};

export default SubmitComplaint;
