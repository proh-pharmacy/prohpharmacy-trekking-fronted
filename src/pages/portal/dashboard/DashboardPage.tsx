import React from 'react';

export const DashboardPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500">
          ProH Pharmacy Trekking Operations Management
        </p>
      </div>

      <div className="border border-dashed border-slate-300 rounded p-8 text-center bg-white">
        <p className="text-sm text-slate-600">
          Dashboard content outlet ready for design.
        </p>
      </div>
    </div>
  );
};

export default DashboardPage;
