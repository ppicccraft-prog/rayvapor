import React from 'react';
import { BookOpen, FileText, CheckCircle2, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

export function Sop() {
  const sections = [
    {
      id: 'ruang-lingkup',
      title: '1. Tujuan dan Ruang Lingkup',
      icon: BookOpen,
      content: (
        <div className="space-y-4 text-slate-600">
          <p>
            Standard Operating Procedure (SOP) ini dirancang sebagai panduan standar untuk menggunakan Dashboard Analytics Rayvapor. Tujuan utamanya adalah untuk memastikan setiap pengambilan keputusan—baik terkait manajemen inventori, strategi promosi, maupun operasional toko—berbasis data (data-driven), sistematis, dan selaras dengan standar operasional perusahaan.
          </p>
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
            <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              <strong>Prinsip Utama:</strong> Seluruh rekomendasi aksi yang dihasilkan oleh sistem (seperti Transfer Toko, Bundling, Diskon, dan Forecast) harus di-review terlebih dahulu oleh user dengan otoritas (Head/SPV) sebelum dieksekusi di lapangan.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'hak-akses',
      title: '2. Panduan Hak Akses (Role-Based Access)',
      icon: ShieldCheck,
      content: (
        <div className="space-y-4 text-slate-600">
          <p>
            Dashboard ini menerapkan sistem akses berbasis peran (role-based) untuk menjaga keamanan dan relevansi data:
          </p>
          <ul className="space-y-3">
            <li className="flex gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <div>
                <strong>Direksi:</strong> Memiliki akses penuh (Full Access) ke seluruh modul, termasuk Ringkasan Eksekutif, pengaturan parameter analisa, pengaturan role, dan seluruh laporan transaksi perusahaan.
              </div>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <div>
                <strong>Head (SPV):</strong> Bertanggung jawab atas persetujuan aksi strategis. Memiliki akses ke Scorecard Toko, persetujuan Transfer Antar Toko, penerapan Diskon/Bundling, dan SLA Request Barang.
              </div>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <div>
                <strong>Staff:</strong> Bertanggung jawab atas operasional dan administrasi harian. Dapat mengakses Stok Toko, Transaksi Penjualan, Report Bundling, dan SLA Dashboard.
              </div>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <div>
                <strong>Vaporista (Toko):</strong> Akses operasional lapangan spesifik seperti membuat tiket Request Barang ke Gudang Utama.
              </div>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'inventori',
      title: '3. Pengelolaan Inventori dan Dead Stock',
      icon: FileText,
      content: (
        <div className="space-y-4 text-slate-600">
          <p>Manajemen inventori dilakukan dengan mengevaluasi perputaran barang (turnover) melalui modul Analisa SKU dan Dead Stock.</p>
          
          <h4 className="font-semibold text-slate-800 mt-4">A. Analisa Dead Stock</h4>
          <ul className="list-disc pl-5 space-y-2">
            <li>Review modul <strong>Dead Stock</strong> secara rutin (minimal seminggu sekali).</li>
            <li>Identifikasi barang yang memiliki nilai Days of Inventory (DOI) tinggi tanpa pergerakan (aging &gt; 90 hari).</li>
            <li>Terapkan strategi prioritas berdasarkan rekomendasi sistem (apakah perlu didiskon, dibundling, atau ditarik ke Gudang Utama).</li>
          </ul>

          <h4 className="font-semibold text-slate-800 mt-4">B. Eksekusi Transfer Antar Toko</h4>
          <ul className="list-disc pl-5 space-y-2">
            <li>Buka modul <strong>Transfer Antar Toko</strong> pada bagian Rekomendasi Aksi.</li>
            <li>Sistem akan mendeteksi toko yang kelebihan stok (overstock) dan toko yang kekurangan stok (understock/potensi out-of-stock).</li>
            <li><strong>Validasi:</strong> Head/SPV harus memvalidasi kelayakan transfer, termasuk mempertimbangkan jarak logistik antar toko dan kapasitas display toko penerima.</li>
            <li>Jika disetujui, eksekusi pemindahan melalui sistem POS utama perusahaan.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'promosi',
      title: '4. Strategi Promosi (Bundling & Diskon)',
      icon: Zap,
      content: (
        <div className="space-y-4 text-slate-600">
          <p>Rekomendasi promosi dihasilkan oleh algoritma sistem untuk mengoptimalkan profitabilitas dan mencairkan stok yang bergerak lambat.</p>
          
          <h4 className="font-semibold text-slate-800 mt-4">A. Eksekusi Rekomendasi Bundling</h4>
          <ul className="list-disc pl-5 space-y-2">
            <li>Masuk ke modul <strong>Bundling</strong>. Sistem memasangkan produk Fast Moving (Hero Product) dengan Slow Moving (Laggard Product).</li>
            <li>Pastikan margin gabungan setelah diskon bundling masih sesuai dengan kebijakan batas minimum margin perusahaan.</li>
            <li>Implementasikan paket bundling di kasir/POS dan pantau efektivitasnya di <strong>Report Bundling</strong>.</li>
          </ul>

          <h4 className="font-semibold text-slate-800 mt-4">B. Penerapan Diskon</h4>
          <ul className="list-disc pl-5 space-y-2">
            <li>Gunakan modul <strong>Diskon</strong> khusus untuk produk Dead Stock parah atau menjelang masa kadaluarsa (jika relevan).</li>
            <li>Pilih skema diskon bertingkat yang direkomendasikan sistem (misal: 10%, 20%, atau 30%).</li>
            <li><strong>Approval:</strong> Setiap persetujuan diskon di atas 20% memerlukan validasi dari Head/Direksi.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'monitoring',
      title: '5. Monitoring Kinerja & Request Barang',
      icon: AlertTriangle,
      content: (
        <div className="space-y-4 text-slate-600">
          <h4 className="font-semibold text-slate-800">A. Evaluasi Kinerja (Scorecard)</h4>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Scorecard Toko:</strong> Evaluasi kontribusi harian dan mingguan masing-masing toko. Perhatikan metrik penjualan kotor, margin, dan rasio barang terjual.</li>
            <li>Toko dengan performa merah (di bawah target) harus segera diinvestigasi ketersediaan barang dan trafik kunjungannya.</li>
          </ul>

          <h4 className="font-semibold text-slate-800 mt-4">B. Proses Request Barang (Operasional)</h4>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Vaporista</strong> membuat permintaan restock melalui modul <strong>Request Barang</strong> sebelum barang habis (hit minimum stock level).</li>
            <li><strong>Staff Gudang / SPV</strong> memonitor tiket di <strong>Dashboard Request & SLA</strong>.</li>
            <li>Setiap request harus diselesaikan (fulfilled) dalam batas waktu SLA (Service Level Agreement) yang disepakati (misal: maksimal 24 jam untuk pengiriman). Keterlambatan akan dicatat dalam indikator rapor Gudang.</li>
          </ul>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Standard Operating Procedure (SOP)</h1>
            <p className="text-slate-500">Panduan Penggunaan dan Rekomendasi Eksekusi Dashboard Analytics</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {sections.map((section) => (
          <div key={section.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4 px-6 flex items-center gap-3">
              <section.icon className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>
            </div>
            <div className="p-6">
              {section.content}
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg mb-1">Butuh Bantuan Lebih Lanjut?</h3>
          <p className="text-slate-400 text-sm">Gunakan fitur Chatbot Assistant di pojok kanan bawah untuk bertanya seputar data dan rekomendasi secara spesifik.</p>
        </div>
        <div className="shrink-0">
          <button 
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Kembali ke Atas
          </button>
        </div>
      </div>
    </div>
  );
}
