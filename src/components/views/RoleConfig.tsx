import React, { useState, useEffect } from 'react';
import { Shield, Save, Check, Users, Key } from 'lucide-react';
import { Role, DEFAULT_ROLE_ACCESS, DEFAULT_ROLE_PASSWORDS, MENU_ITEMS } from '../../roles';

export function RoleConfig() {
  const [roleAccess, setRoleAccess] = useState<Record<Role, string[]>>(DEFAULT_ROLE_ACCESS);
  const [rolePasswords, setRolePasswords] = useState<Record<Role, string>>(DEFAULT_ROLE_PASSWORDS);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Reset to synchronized defaults to ensure no restriction blocks remain
    setRoleAccess(DEFAULT_ROLE_ACCESS);
    setRolePasswords(DEFAULT_ROLE_PASSWORDS);
  }, []);

  const handleToggleAccess = (role: Role, menuId: string) => {
    setRoleAccess(prev => {
      const current = prev[role] || [];
      const updated = current.includes(menuId)
        ? current.filter(id => id !== menuId)
        : [...current, menuId];
      return { ...prev, [role]: updated };
    });
  };

  const handlePasswordChange = (role: Role, newPassword: string) => {
    setRolePasswords(prev => ({
      ...prev,
      [role]: newPassword
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem('roleAccess', JSON.stringify(roleAccess));
    localStorage.setItem('rolePasswords', JSON.stringify(rolePasswords));
    
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      
      // Dispatch custom event to let App.tsx know config was updated
      window.dispatchEvent(new Event('roleAccessUpdated'));
      
      setTimeout(() => setShowSuccess(false), 3000);
    }, 600);
  };

  const ROLES: Role[] = ['Direksi', 'Head (SPV)', 'Staff', 'Vaporista'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Konfigurasi Akses Role</h2>
            <p className="text-xs text-slate-500">Atur hak akses menu untuk masing-masing role pengguna</p>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 w-full sm:w-auto"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Menyimpan...
            </>
          ) : showSuccess ? (
            <>
              <Check className="w-4 h-4" />
              Tersimpan
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Simpan Perubahan
            </>
          )}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-700 w-1/3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    Menu Aplikasi
                  </div>
                </th>
                {ROLES.map(role => (
                  <th key={role} className="px-6 py-4 text-center">
                    <div className="font-bold text-slate-800 text-base">{role}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-slate-50/30">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-700">Password Login</span>
                  </div>
                </td>
                {ROLES.map(role => (
                  <td key={`pwd-${role}`} className="px-6 py-4 text-center align-middle">
                    <input
                      type="text"
                      value={rolePasswords[role] || ''}
                      onChange={(e) => handlePasswordChange(role, e.target.value)}
                      className="w-full text-center px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Enter password"
                    />
                  </td>
                ))}
              </tr>
              {MENU_ITEMS.map((menu) => {
                if (menu.id === 'role_config') return null; // Hide config from regular matrix
                
                return (
                  <tr key={menu.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-700">{menu.label}</span>
                      <div className="text-xs text-slate-400 font-mono mt-1">{menu.id}</div>
                    </td>
                    {ROLES.map(role => {
                      const hasAccess = roleAccess[role]?.includes(menu.id);
                      return (
                        <td key={`${role}-${menu.id}`} className="px-6 py-4 text-center align-middle">
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={hasAccess}
                              onChange={() => handleToggleAccess(role, menu.id)}
                            />
                            <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
