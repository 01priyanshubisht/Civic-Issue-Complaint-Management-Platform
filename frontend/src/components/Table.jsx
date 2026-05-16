import React from 'react';

const Table = ({ headers, children }) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 bg-white text-sm text-left">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header, index) => (
              <th key={index} scope="col" className="px-6 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {children}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
