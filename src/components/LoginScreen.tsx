import React, { useState, useEffect } from 'react';
import { Shield, LayoutDashboard, User, Lock, ArrowLeft } from 'lucide-react';
import { Role, DEFAULT_ROLE_PASSWORDS } from '../roles';

interface LoginScreenProps {
  onLogin: (role: Role) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordsConfig, setPasswordsConfig] = useState<Record<Role, string>>(DEFAULT_ROLE_PASSWORDS);

  useEffect(() => {
    const savedPasswords = localStorage.getItem('rolePasswords');
    if (savedPasswords) {
      try {
        setPasswordsConfig(JSON.parse(savedPasswords));
      } catch (e) {
        console.error("Failed to parse passwords", e);
      }
    }
  }, []);

  const roles: { id: Role; title: string; desc: string }[] = [
    { id: 'Direksi', title: 'Direksi', desc: 'Akses penuh ke semua laporan dan analisa' },
    { id: 'Head (SPV)', title: 'Head (SPV)', desc: 'Dashboard toko, request approval, dan analisa' },
    { id: 'Staff', title: 'Staff', desc: 'Akses laporan operasional dasar' },
    { id: 'Vaporista', title: 'Vaporista', desc: 'Request barang dan input data' },
  ];

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setPassword('');
    setError('');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole) {
      const correctPassword = passwordsConfig[selectedRole];
      if (password === correctPassword) {
        onLogin(selectedRole);
      } else {
        setError('Password salah. Silakan coba lagi.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-sm">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Retail Analytics</h1>
          <p className="text-slate-500 mt-2 text-center text-sm">
            {!selectedRole ? 'Pilih role Anda untuk melanjutkan.' : `Login sebagai ${selectedRole}`}
          </p>
        </div>

        {!selectedRole ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                className="w-full flex items-start gap-4 p-4 text-left border border-slate-200 rounded-xl hover:border-indigo-600 hover:bg-indigo-50 transition-colors group"
              >
                <div className="mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-indigo-900">{role.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{role.desc}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleLoginSubmit} className="animate-in fade-in slide-in-from-right-8 duration-300">
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Masukkan password"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-red-500 text-xs mt-2 font-medium">{error}</p>
              )}
              <div className="mt-3 text-right">
                <button
                  type="button"
                  onClick={() => {
                    const defaultPass = DEFAULT_ROLE_PASSWORDS[selectedRole];
                    alert(`Password default untuk ${selectedRole} adalah: ${defaultPass}`);
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                >
                  Lupa password? Lihat password default
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Login
              </button>
            </div>
          </form>
        )}
        
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Shield className="w-4 h-4" />
          <span>Secure Access</span>
        </div>
      </div>
    </div>
  );
}
