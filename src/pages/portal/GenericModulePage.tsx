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
      {/* Header Card in #2d333b with #444c56 border */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#2d333b] border border-[#444c56]/60 rounded shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">{moduleName}</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#41cc84]/15 text-[#41cc84] border border-[#41cc84]/30 rounded">
              Ready for Integration
            </span>
          </div>
          <p className="text-xs text-[#768390] mt-1">
            {description || `ProH Pharmacy Trekking Operations — ${moduleName} module.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <FlatButton
            variant="outline"
            size="sm"
            onClick={() => toast.success(`Refreshing ${moduleName}...`)}
            className="!border-[#444c56] !text-[#adbac7] hover:!bg-white/5 text-xs font-semibold"
            leftIcon="pi pi-refresh"
          >
            Refresh
          </FlatButton>
          <FlatButton
            variant="primary"
            size="sm"
            onClick={() => toast.success(`Action triggered for ${moduleName}`)}
            className="!bg-[#41cc84] hover:!bg-[#36ba76] active:!bg-[#2fa367] !text-white !border-transparent text-xs font-bold"
            leftIcon="pi pi-plus"
          >
            Add Record
          </FlatButton>
        </div>
      </div>

      {/* Main Card Surface in #2d333b */}
      <div className="p-10 bg-[#2d333b] border border-[#444c56]/60 rounded shadow-sm flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-[#22272e] border border-[#444c56] flex items-center justify-center text-[#41cc84] text-xl shadow-inner">
          <i className={icon} />
        </div>
        <div className="space-y-1 max-w-md">
          <h2 className="text-base font-bold text-white tracking-wide">
            {moduleName} Viewport Ready
          </h2>
          <p className="text-xs text-[#768390] leading-relaxed">
            This module outlet is structured and mounted within the #22272e / #2d333b layout.
            Ready to receive backend API contracts and components.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GenericModulePage;
