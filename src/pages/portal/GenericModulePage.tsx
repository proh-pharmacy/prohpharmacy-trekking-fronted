import React from 'react';
import { useLocation } from 'react-router-dom';
import { FlatButton } from '../../components/flat-form/FlatButton';
import toast from 'react-hot-toast';

interface GenericModuleProps {
  title?: string;
  description?: string;
  icon?: string;
}

export const GenericModulePage: React.FC<GenericModuleProps> = ({
  title,
  description,
  icon = 'pi pi-compass',
}) => {
  const location = useLocation();
  const moduleName =
    title ||
    location.pathname
      .replace('/portal/', '')
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#1e2126] border border-white/[0.06] rounded shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">{moduleName}</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#b6ff56]/15 text-[#b6ff56] border border-[#b6ff56]/30 rounded">
              Ready for Integration
            </span>
          </div>
          <p className="text-xs text-white/50 mt-1">
            {description || `ProH Pharmacy Trekking Operations — ${moduleName} module.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <FlatButton
            variant="outline"
            size="sm"
            onClick={() => toast.success(`Refreshing ${moduleName}...`)}
            className="!border-white/10 !text-white hover:!bg-white/5 text-xs font-semibold"
            leftIcon="pi pi-refresh"
          >
            Refresh
          </FlatButton>
          <FlatButton
            variant="primary"
            size="sm"
            onClick={() => toast.success(`Action triggered for ${moduleName}`)}
            className="!bg-[#b6ff56] hover:!bg-[#a5f341] !text-[#101214] !border-transparent text-xs font-bold"
            leftIcon="pi pi-plus"
          >
            Add Record
          </FlatButton>
        </div>
      </div>

      {/* Main Card Surface */}
      <div className="p-10 bg-[#1e2126] border border-white/[0.06] rounded shadow-sm flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-[#101214] border border-white/10 flex items-center justify-center text-[#b6ff56] text-xl shadow-inner">
          <i className={icon} />
        </div>
        <div className="space-y-1 max-w-md">
          <h2 className="text-base font-bold text-white tracking-wide">
            {moduleName} Viewport Ready
          </h2>
          <p className="text-xs text-white/50 leading-relaxed">
            This module outlet is structured and mounted within the sleek dark portal layout.
            Ready to receive backend API contracts and components.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GenericModulePage;
