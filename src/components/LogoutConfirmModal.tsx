import React from 'react';
import { LogOut, X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { User } from '../types';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLogout: () => void;
  currentUser: User | null;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmLogout,
  currentUser,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="logout-confirm-modal"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-lg border border-slate-300 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header in Indian Railways Navy Blue */}
        <div className="bg-[#000075] text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-amber-500">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center border border-white/20">
              <LogOut className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Confirm Official Logout</h3>
              <p className="text-[11px] text-blue-200">RAKSHA-BLOCK Authentication Desk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer"
            title="Cancel and close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="space-y-1 text-slate-800">
              <h4 className="font-bold text-sm text-slate-900">
                Are you sure you want to exit?
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are currently signed in as{' '}
                <strong className="text-blue-950 font-semibold">{currentUser?.name}</strong>{' '}
                ({currentUser?.designation} •{' '}
                <span className="font-mono text-amber-900">{currentUser?.employeeId}</span>).
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Exiting will securely terminate your session and return to the Indian Railways 4-Department Login Portal.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-500 flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>
              Unsaved draft inputs in requisition forms will be cleared upon session termination.
            </span>
          </div>
        </div>

        {/* Modal Footer with Required Buttons */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            id="btn-cancel-logout"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-confirm-logout"
            onClick={() => {
              onClose();
              onConfirmLogout();
            }}
            className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-white" />
            <span>Yes, Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
