import React, { useMemo } from 'react';
import { AlertCircle, BarChart3 } from 'lucide-react';
import { parseSpreadsheetData } from '../lib/dataParser';
import { ExecutiveSummary } from './views/ExecutiveSummary';
import { StoreScorecard } from './views/StoreScorecard';
import { ScorecardBulanan } from './views/ScorecardBulanan';
import { SkuAnalysis } from './views/SkuAnalysis';
import { Recommendations } from './views/Recommendations';
import { TransferToko } from './views/TransferToko';
import { Bundling } from './views/Bundling';
import { Diskon } from './views/Diskon';
import { Forecast } from './views/Forecast';
import { OverviewRekomendasi } from './views/OverviewRekomendasi';
import { BiLiquid } from './views/BiLiquid';
import { RoleConfig } from './views/RoleConfig';
import { Parameter } from './views/Parameter';
import { RiwayatPembelian } from './views/RiwayatPembelian';
import { DeadStock } from './views/DeadStock';
import { TransaksiPenjualan } from './views/TransaksiPenjualan';
import { StokToko } from './views/StokToko';
import { TrendMarket } from './views/TrendMarket';
import { RequestBarang } from './views/RequestBarang';
import { DashboardRequest } from './views/DashboardRequest';
import { ReportBundling } from './views/ReportBundling';
import { Sop } from './views/Sop';
import { Flowchart } from './views/Flowchart';
import { ResetApproval } from './views/ResetApproval';
import { LogAktivitas } from './views/LogAktivitas';
import { Chatbot } from './Chatbot';

interface DashboardContentProps {
  activeMenu: string;
  data: string[][];
  role?: string;
  validationErrors?: string[];
}

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
  'log_aktivitas': 'Log Aktivitas'
};

export function DashboardContent({ activeMenu, data, role = 'Direksi', validationErrors = [] }: DashboardContentProps) {
  const parsedData = useMemo(() => parseSpreadsheetData(data), [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500">
        No data available.
      </div>
    );
  }

  if (!parsedData || !parsedData.stats) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="bg-yellow-50 text-yellow-700 p-6 rounded-xl border border-yellow-200 text-center max-w-lg">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="font-bold text-lg mb-2">Unrecognized Data Format</h3>
          <p className="text-sm opacity-80">The loaded spreadsheet does not match the expected structure (Toko, Bulan, Produk, QTY, dll).</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeMenu) {
      case 'ringkasan_eksekutif':
        return <ExecutiveSummary data={parsedData} validationErrors={validationErrors} />;
      case 'scorecard_toko':
        return <StoreScorecard data={parsedData} />;
      case 'scorecard_bulanan':
        return <ScorecardBulanan />;
      case 'analisa_sku':
        return <SkuAnalysis data={parsedData} />;
      case 'dead_stock':
        return <DeadStock />;
      case 'overview_rekomendasi':
        return <OverviewRekomendasi />;
      case 'transfer_toko':
        return <TransferToko />;
      case 'bundling':
        return <Bundling role={role} />;
      case 'diskon':
        return <Diskon role={role} />;
      case 'stok_toko':
        return <StokToko data={parsedData} />;
      case 'forecast':
        return <Forecast role={role} />;
      case 'bi_liquid':
        return <BiLiquid dataAnalisa={parsedData} />;
      case 'role_config':
        return <RoleConfig />;
      case 'parameter':
        return <Parameter />;
      case 'riwayat_beli':
        return <RiwayatPembelian dataAnalisa={parsedData} />;
      case 'transaksi_jual':
        return <TransaksiPenjualan dataAnalisa={parsedData} />;
      case 'trend_market':
        return <TrendMarket data={parsedData} />;
      case 'request_barang':
        return <RequestBarang role={role} />;
      case 'dashboard_request':
        return <DashboardRequest role={role} />;
      case 'report_bundling':
        return <ReportBundling />;
      case 'sop':
        return <Sop />;
      case 'flowchart':
        return <Flowchart />;
      case 'reset_approval':
        return <ResetApproval />;
      case 'log_aktivitas':
        return <LogAktivitas />;
      default:
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md shadow-sm">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Modul {MENU_TITLES[activeMenu] || 'Ini'} Sedang Dikembangkan
              </h3>
              <p className="text-slate-500 text-sm">
                Tampilan dan integrasi data untuk bagian ini sedang dalam tahap pengembangan.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900 transition-colors duration-200 relative">
      <div className="w-full space-y-6 lg:space-y-8">
        {renderContent()}
      </div>
      <Chatbot contextData={{ activeMenu, stats: parsedData.stats, topProducts: parsedData.topProducts.slice(0, 10), monthlyTrend: parsedData.monthlyTrend }} />
    </div>
  );
}

