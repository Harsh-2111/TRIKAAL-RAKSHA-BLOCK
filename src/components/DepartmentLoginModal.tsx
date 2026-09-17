import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  UserCheck,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Train,
  ArrowRight,
  Database,
  KeyRound,
} from 'lucide-react';
import { User, UserRole } from '../types';
import {
  verifyCredentialsAgainstSupabase,
  JUDGE_DEMO_CREDENTIALS,
  SUPABASE_URL,
} from '../lib/supabase';

interface DepartmentLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRole: UserRole;
  onSelectRoleChange: (role: UserRole) => void;
  onLoginSuccess: (user: User) => void;
}

export const DepartmentLoginModal: React.FC<DepartmentLoginModalProps> = ({
  isOpen,
  onClose,
  selectedRole,
  onSelectRoleChange,
  onLoginSuccess,
}) => {
  const [userId, setUserId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const currentRoleInfo = JUDGE_DEMO_CREDENTIALS[selectedRole];

  // Auto-focus and reset fields when modal opens or role changes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setUserId('');
      setPassword('');
      setShowPassword(false);
    }
  }, [isOpen, selectedRole]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!userId.trim()) {
      setErrorMessage('❌ Please enter your Unique User ID');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('❌ Please enter your Password');
      return;
    }

    setIsVerifying(true);

    try {
      // Direct query and validation via Supabase profiles table:
      // query: supabase.from('profiles').select('*').eq('user_id', entered_id)
      const result = await verifyCredentialsAgainstSupabase(userId, password, selectedRole);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
        onClose();
      } else {
        setErrorMessage(result.error || '❌ Invalid User ID or Password');
      }
    } catch (err: any) {
      setErrorMessage('❌ Verification error: ' + (err.message || 'Please check network'));
    } finally {
      setIsVerifying(false);
    }
  };

  // Department color accent
  const getHeaderAccent = () => {
    switch (selectedRole) {
      case 'ENG_OFFICER':
        return 'border-blue-400 bg-blue-50 text-blue-900';
      case 'ST_OFFICER':
        return 'border-emerald-400 bg-emerald-50 text-emerald-900';
      case 'TRD_OFFICER':
        return 'border-amber-400 bg-amber-50 text-amber-900';
      case 'SECTION_CONTROLLER':
        return 'border-purple-400 bg-purple-50 text-purple-900';
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-login-title"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200">
        {/* IRCTC Navy Blue Header */}
        <div className="bg-[#000075] text-white p-4 sm:p-6 relative border-b-4 border-amber-500">
          <button
            id="btn-close-login-modal"
            onClick={onClose}
            className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close login modal"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2.5 sm:space-x-3 mb-2 pr-8">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-amber-400 flex items-center space-x-1.5">
                <Train className="w-3 h-3" />
                <span>IR-RBAC AUTHENTICATION GATEWAY</span>
              </div>
              <h2 id="modal-login-title" className="text-base sm:text-xl font-black text-white tracking-tight">
                {currentRoleInfo.departmentName} - Secure Login
              </h2>
            </div>
          </div>

          <div className="mt-2 text-[11px] sm:text-xs text-blue-100/90 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="bg-white/15 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono">
              Role: {selectedRole}
            </span>
            <span className="text-white/40">•</span>
            <span>Division: Delhi (DLI)</span>
            <span className="text-white/40">•</span>
            <span className="flex items-center space-x-1 text-emerald-300">
              <Database className="w-3 h-3" />
              <span>Supabase `profiles`</span>
            </span>
          </div>
        </div>

        {/* Modal Body & Form */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
          {/* Department Indicator Badge */}
          <div className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between ${getHeaderAccent()}`}>
            <div className="flex items-center space-x-2">
              <KeyRound className="w-4 h-4" />
              <span>Authenticating for: <strong>{currentRoleInfo.label}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => {
                setUserId(currentRoleInfo.id);
                setPassword(currentRoleInfo.pass);
                setErrorMessage(null);
              }}
              className="rounded border border-current/30 bg-white/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wider hover:bg-white transition-colors cursor-pointer"
              title={`Auto fill demo credentials for ${currentRoleInfo.label}`}
            >
              Auto Fill
            </button>
          </div>

          {/* Inline Red Error Message Display */}
          {errorMessage && (
            <div
              id="login-error-message"
              role="alert"
              aria-live="assertive"
              className="p-3 rounded-lg bg-red-50 border border-red-300 text-red-700 text-xs flex items-start space-x-2 shadow-xs animate-in slide-in-from-top-1"
            >
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="font-semibold">{errorMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Unique User ID Input */}
            <div>
              <label
                htmlFor="input-login-userid"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Unique User ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="input-login-userid"
                  value={userId}
                  onChange={(e) => {
                    setUserId(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder={`e.g., ${currentRoleInfo.id}`}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#000075] focus:border-[#000075] font-mono transition-all"
                  autoFocus
                  required
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Verified directly against the Supabase <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">profiles</code> table (<code className="font-mono">user_id</code> column).
              </p>
            </div>

            {/* Password Input with Show/Hide Eye Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="input-login-password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Password / Passcode <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">Case-sensitive</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="input-login-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Enter your security passcode"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#000075] focus:border-[#000075] font-mono transition-all"
                  required
                />
                <button
                  type="button"
                  id="btn-toggle-password-visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              id="btn-submit-department-login"
              disabled={isVerifying}
              className="w-full py-3 px-4 rounded-lg bg-[#000075] hover:bg-blue-900 active:bg-blue-950 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#000075] disabled:opacity-60 cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying with Supabase...</span>
                </>
              ) : (
                <>
                  <span>Verify & Access {currentRoleInfo.label}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
