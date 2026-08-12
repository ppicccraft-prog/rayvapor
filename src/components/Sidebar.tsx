import React, { useState } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Settings, TrendingUp, 
  Lightbulb, BookOpen, ChevronDown, ChevronRight, BarChart3, Database,
  ArrowRightLeft, Percent, PackagePlus, Zap, Shield, X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MENU_GROUPS = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    id: 'group_dashboard',
    items: [
      { id: 'ringkasan_eksekutif', label: 'Ringkasan Eksekutif' },
      { id: 'scorecard_toko', label: 'Scorecard per Toko' },
      { id: 'scorecard_bulanan', label: 'Scorecard Bulanan' }
    ]
  },
  {
    title: 'Rekomendasi Aksi',
    icon: Zap,
    id: 'group_rekomendasi',
    badge: 'PRIORITAS',
    items: [
      { id: 'overview_rekomendasi', label: 'Overview & Grafik' },
      { id: 'transfer_toko', label: 'Transfer Antar Toko' },
      { id: 'bundling', label: 'Bundling' },
      { id: 'diskon', label: 'Diskon' },
      { id: 'forecast', label: 'Forecast & Restock' }
    ]
  },
  {
    title: 'Inventory',
    icon: Package,
    id: 'group_inventory',
    items: [
      { id: 'stok_toko', label: 'Stok Akhir per Toko' },
      { id: 'stok_gudang', label: 'Stok Gudang Utama' },
      { id: 'analisa_sku', label: 'Analisa SKU' },
      { id: 'dead_stock', label: 'Dead Stock' }
    ]
  },
  {
    title: 'Penjualan',
    icon: TrendingUp,
    id: 'group_penjualan',
    items: [
      { id: 'transaksi_jual', label: 'Transaksi Penjualan' },
      { id: 'bi_liquid', label: 'BI Liquid per Toko' }
    ]
  },
  {
    title: 'Pembelian',
    icon: ShoppingCart,
    id: 'group_pembelian',
    items: [
      { id: 'riwayat_beli', label: 'Riwayat Pembelian' }
    ]
  },
  {
    title: 'Trend Market',
    icon: TrendingUp,
    id: 'trend_market',
    isDirectMenu: true,
  },
  {
    title: 'Operasional Toko',
    icon: PackagePlus,
    id: 'group_operasional',
    items: [
      { id: 'request_barang', label: 'Request Barang' },
      { id: 'dashboard_request', label: 'Dashboard Request & SLA' },
      { id: 'report_bundling', label: 'Report Bundling' }
    ]
  },
  {
    title: 'Dokumentasi',
    icon: BookOpen,
    id: 'group_dokumentasi',
    items: [
      { id: 'sop', label: 'SOP' },
      { id: 'flowchart', label: 'Flowchart' }
    ]
  },
  {
    title: 'Pengaturan',
    icon: Settings,
    id: 'group_pengaturan',
    items: [
      { id: 'parameter', label: 'Parameter Analisa' },
      { id: 'role_config', label: 'Konfigurasi Akses Role' },
      { id: 'log_aktivitas', label: 'Log Aktivitas' },
      { id: 'reset_approval', label: 'Hapus Data Trial' }
    ]
  }
];

interface SidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  allowedMenus: string[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ activeMenu, setActiveMenu, allowedMenus, isOpen, setIsOpen }: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'group_dashboard': true,
    'group_rekomendasi': true
  });
  const [imageError, setImageError] = useState(false);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col h-screen border-r border-slate-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 shrink-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {!imageError ? (
              <img 
                src="/logo.png" 
                alt="Rayvapor" 
                className="h-10 w-10 object-contain bg-white rounded-full p-0.5" 
                onError={() => setImageError(true)} 
              />
            ) : null}
            <div className={cn("flex items-center gap-3", !imageError && "hidden")}>
              <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold text-white">R</div>
            </div>
            <h1 className="text-white font-semibold text-lg tracking-tight">Rayvapor</h1>
          </div>
          <button 
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1">
          {MENU_GROUPS.map((group) => {
            // Check if this is a direct menu
            if (group.isDirectMenu) {
              if (!allowedMenus.includes(group.id)) return null;
              
              const isActive = activeMenu === group.id;
              
              return (
                <div key={group.id} className="px-3">
                  <button
                    onClick={() => setActiveMenu(group.id)}
                    className={cn(
                      "flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:text-white hover:bg-slate-800"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <group.icon className="w-5 h-5 opacity-80" />
                      <span>{group.title}</span>
                    </div>
                  </button>
                </div>
              );
            }

            // Otherwise, it's a group with items
            const visibleItems = (group.items || []).filter(item => allowedMenus.includes(item.id));
            
            if (visibleItems.length === 0) return null;

            const isExpanded = expandedGroups[group.id] ?? false; // Default to collapsed if not explicitly set
            const hasActiveChild = visibleItems.some(item => item.id === activeMenu);
            
            return (
              <div key={group.id} className="px-3">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    hasActiveChild && !isExpanded ? "text-blue-400" : "text-slate-300 hover:text-white hover:bg-slate-800"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <group.icon className="w-5 h-5 opacity-80" />
                    <span>{group.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.badge && (
                      <span className="text-[9px] bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                        {group.badge}
                      </span>
                    )}
                    {isExpanded ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="mt-1 mb-2 ml-4 pl-4 border-l border-slate-700/50 flex flex-col gap-1">
                    {visibleItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveMenu(item.id)}
                        className={cn(
                          "flex items-center w-full text-left px-3 py-2 text-sm transition-colors rounded-lg",
                          activeMenu === item.id 
                            ? "bg-blue-600 text-white font-medium" 
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="p-6 text-xs text-slate-500 border-t border-slate-800 shrink-0">
          Data Source: 1sNab...MI4
        </div>
      </div>
    </>
  );
}
