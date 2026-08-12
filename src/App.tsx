import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { Sidebar } from './components/Sidebar';
import { DashboardContent } from './components/DashboardContent';
import { LoginScreen } from './components/LoginScreen';
import { Loader2, AlertCircle, Database, Shield, Menu, X, RefreshCw, LogOut, Moon, Sun } from 'lucide-react';
import { Role, DEFAULT_ROLE_ACCESS } from './roles';
import { logActivity } from './lib/activityLog';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeMenu, setActiveMenu] = useState('ringkasan_eksekutif');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [sheetData, setSheetData] = useState<string[][]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const [currentRole, setCurrentRole] = useState<Role>('Direksi');
  const [roleAccess, setRoleAccess] = useState<Record<Role, string[]>>(DEFAULT_ROLE_ACCESS);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' || 
             (!('darkMode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  const MENU_TITLES: Record<string, string> = {
    'ringkasan_eksekutif': 'Ringkasan Eksekutif',
    'scorecard_toko': 'Scorecard per Toko',
    'scorecard_bulanan': 'Scorecard Bulanan',
    'transfer_toko': 'Transfer Antar Toko',
    'bundling': 'Rekomendasi Bundling',
    'diskon': 'Rekomendasi Diskon',
    'forecast': 'Forecast & Restock',
    'stok_toko': 'Stok Akhir per Toko',
    'stok_gudang': 'Stok Gudang Utama',
    'analisa_sku': 'Analisa SKU',
    'dead_stock': 'Dead Stock',
    'transaksi_jual': 'Transaksi Penjualan',
    'bi_liquid': 'BI Liquid per Toko',
    'trend_market': 'Trend Market',
    'riwayat_beli': 'Riwayat Pembelian',
    'request_barang': 'Request Barang',
    'dashboard_request': 'Dashboard Request & SLA',
    'report_bundling': 'Report Bundling',
    'sop': 'SOP',
    'flowchart': 'Flowchart',
    'parameter': 'Parameter Analisa',
    'role_config': 'Konfigurasi Akses Role',
    'log_aktivitas': 'Log Aktivitas',
    'reset_approval': 'Hapus Data Trial'
  };

  useEffect(() => {
    loadSheetData();
    
    const loadRoleAccess = () => {
      const saved = localStorage.getItem('roleAccess');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Merge with defaults to ensure new menus are added
          const merged = { ...DEFAULT_ROLE_ACCESS };
          (Object.keys(parsed) as Role[]).forEach(role => {
            if (merged[role]) {
              const prevAccess = Array.isArray(parsed[role]) ? parsed[role] : [];
              const defaultExtras = DEFAULT_ROLE_ACCESS[role].filter(m => m === 'dashboard_request' || m === 'request_barang' || m === 'report_bundling' || m === 'reset_approval');
              merged[role] = Array.from(new Set([...prevAccess, ...defaultExtras]));
            }
          });
          setRoleAccess(merged);
        } catch (e) {
          console.error("Failed to parse role access", e);
        }
      }
    };
    
    loadRoleAccess();
    window.addEventListener('roleAccessUpdated', loadRoleAccess);
    return () => window.removeEventListener('roleAccessUpdated', loadRoleAccess);
  }, []);

  const allowedMenus = roleAccess[currentRole] || [];

  // Ensure active menu is allowed for current role, if not switch to first allowed
  useEffect(() => {
    if (allowedMenus.length > 0 && !allowedMenus.includes(activeMenu)) {
      setActiveMenu(allowedMenus[0]);
    }
  }, [currentRole, allowedMenus, activeMenu]);

  const validateSpreadsheetData = (data: string[][]) => {
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      if (data[i].includes('Toko') && data[i].includes('Produk') && data[i].includes('QTY')) {
        headerRowIdx = i;
        break;
      }
    }
    
    if (headerRowIdx === -1) return [];
    
    const headers = data[headerRowIdx].map(h => h.trim());
    const numericCols = ['QTY', 'Harga Beli', 'Harga Jual', 'Jumlah'];
    const colIndices = numericCols.map(col => ({
      name: col,
      idx: headers.indexOf(col)
    })).filter(c => c.idx !== -1);
    
    const errors: string[] = [];
    
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0 || !row.some(c => c && c.trim() !== '')) continue;
      
      // If it's a valid row, let's also check if it's not a summary row or something.
      // Usually if "Toko" is empty, it might be a summary. But let's check all numeric columns anyway.
      
      for (const col of colIndices) {
        const val = row[col.idx];
        if (val === undefined || val === null || val.trim() === '') {
           errors.push(`Row ${i + 1}, Column "${col.name}": Empty value`);
           continue;
        }
        
        const cleanVal = val.toString().replace(/[^0-9.-]+/g,"");
        if (cleanVal === "" || cleanVal === "-" || cleanVal === ".") {
          errors.push(`Row ${i + 1}, Column "${col.name}": Non-numeric value "${val}"`);
        } else {
          const num = Number(cleanVal);
          if (isNaN(num)) {
            errors.push(`Row ${i + 1}, Column "${col.name}": Invalid numeric value "${val}"`);
          }
        }
      }
    }
    
    return errors;
  };

  const loadSheetData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/sheets');
      if (!response.ok) {
        throw new Error('Failed to fetch data from server');
      }
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        complete: (results) => {
          const parsedData = results.data as string[][];
          setSheetData(parsedData);
          setValidationErrors(validateSpreadsheetData(parsedData));
        },
        error: (error: any) => {
          console.error(error);
          setError('Failed to parse spreadsheet data.');
        }
      });
    } catch (err: any) {
      console.error(err);
      setError('Failed to load data. Make sure the backend server is running and the sheet is accessible.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (role: Role) => {
    setCurrentRole(role);
    setIsLoggedIn(true);
    logActivity(role, 'Login berhasil', 'Sistem');
  };

  const handleLogout = () => {
    logActivity(currentRole, 'Logout', 'Sistem');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans transition-colors duration-200">
      <Sidebar 
        activeMenu={activeMenu} 
        setActiveMenu={(menu) => {
          setActiveMenu(menu);
          setIsSidebarOpen(false); // Close on mobile when selecting
        }}
        allowedMenus={allowedMenus}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-8 shrink-0 transition-colors duration-200">
          <div className="flex items-center gap-3 lg:gap-4">
            <button 
              className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg lg:text-xl font-semibold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">{MENU_TITLES[activeMenu] || 'Dashboard'}</h2>
            <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
            <span className="hidden sm:inline text-xs lg:text-sm text-slate-500 dark:text-slate-400 truncate">
              Sync status: Live Updates
            </span>
            <button 
              onClick={loadSheetData}
              disabled={isLoading}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-6">
            <button
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/30 px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg shrink-0">
              <Shield className="w-3 h-3 lg:w-4 lg:h-4 text-indigo-600 dark:text-indigo-400 hidden sm:block" />
              <span className="bg-transparent text-xs lg:text-sm font-semibold text-indigo-700 dark:text-indigo-400 outline-none max-w-[80px] lg:max-w-none">
                {currentRole}
              </span>
            </div>
            
            <button 
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
            
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-medium ml-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="hidden md:inline">Data Connected</span>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800 shadow-sm flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
              <Database className="w-4 h-4 lg:w-5 lg:h-5" />
            </div>
          </div>
        </header>

        {isLoading && sheetData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p>Syncing data from Google Sheets...</p>
          </div>
        ) : error ? (
          <div className="flex-1 p-4 lg:p-8 flex items-center justify-center">
            <div className="max-w-md w-full bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 text-center space-y-4 shadow-sm">
              <AlertCircle className="w-10 h-10 mx-auto" />
              <p className="font-medium">{error}</p>
              <button 
                onClick={loadSheetData}
                className="px-4 py-2 bg-white text-red-600 font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors shadow-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <DashboardContent 
            activeMenu={activeMenu} 
            data={sheetData} 
            role={currentRole}
            validationErrors={validationErrors}
          />
        )}
      </div>
    </div>
  );
}
