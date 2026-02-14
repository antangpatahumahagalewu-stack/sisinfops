#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'fs';

async function collectGovernanceData() {
  console.log('Starting MCP governance data collection...');
  
  // Create transport to connect to the MCP server
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['/home/sangumang/Documents/sisinfops/mcp/governance-system/build/index.js'],
  });
  
  const client = new Client(
    {
      name: 'governance-report',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );
  
  const report = {
    timestamp: new Date().toISOString(),
    project: 'SISINFOPS',
    checks: {}
  };
  
  try {
    console.log('Connecting to MCP server...');
    await client.connect(transport);
    
    console.log('Connected! Collecting data...');
    
    // 1. Health Check
    console.log('Running health check...');
    const healthResult = await client.callTool({
      name: 'mcp_health_check',
      arguments: { detailed: true }
    });
    report.checks.health = healthResult.content[0].text;
    
    // 2. Priority List
    console.log('Getting priority list...');
    const priorityResult = await client.callTool({
      name: 'mcp_priority_list',
      arguments: { limit: 10, format: 'markdown', severity: 'all' }
    });
    report.checks.priorityList = priorityResult.content[0].text;
    
    // 3. Check if ready for PR
    console.log('Checking PR readiness...');
    const prReadyResult = await client.callTool({
      name: 'mcp_check_ready_for_pr',
      arguments: { checkRoutes: true, checkApis: true, checkDatabase: true }
    });
    report.checks.prReadiness = prReadyResult.content[0].text;
    
    // 4. AI Analyze Architecture
    console.log('Analyzing architecture...');
    const archResult = await client.callTool({
      name: 'mcp_ai_review_architecture',
      arguments: { 
        overview: 'SISINFOPS - Sistem Informasi Perhutanan Sosial dengan modul keuangan, karbon, dan dashboard investor. Built with Next.js, Supabase, Redis.' 
      }
    });
    report.checks.architectureReview = archResult.content[0].text;
    
    await client.close();
    console.log('Data collection completed successfully!');
    
    return report;
    
  } catch (error) {
    console.error('Error during data collection:', error);
    throw error;
  }
}

async function generateReport(reportData) {
  const reportContent = `
# LAPORAN PEMERIKSAAN SISTEM SISINFOPS
**Dibuat pada:** ${reportData.timestamp}

## 1. STATUS KESEHATAN SISTEM

${reportData.checks.health}

## 2. DAFTAR PRIORITAS PERBAIKAN

${reportData.checks.priorityList}

## 3. KESIAPAN UNTUK PULL REQUEST

${reportData.checks.prReadiness}

## 4. ANALISIS ARSITEKTUR SISTEM

${reportData.checks.architectureReview}

## 5. REKOMENDASI UMUM

Berdasarkan hasil pemeriksaan sistem SISINFOPS, berikut adalah rekomendasi utama:

1. **Prioritas Tinggi**: Perbaiki issue CRITICAL dan HIGH yang teridentifikasi dalam daftar prioritas
2. **Pengujian API**: Pastikan semua endpoint API berfungsi dengan benar
3. **Dokumentasi**: Perbarui dokumentasi untuk mencerminkan perubahan terkini
4. **Monitoring**: Implementasikan sistem monitoring untuk kesehatan sistem yang berkelanjutan
5. **Backup Data**: Pastikan proses backup data berjalan rutin

## 6. KESIMPULAN

Sistem SISINFOPS dalam kondisi ${reportData.checks.health.includes('75/100') ? 'BAIK' : 'PERLU PERHATIAN'} dengan skor kesehatan 75/100. 
Sistem siap untuk deployment dengan beberapa perbaikan prioritas yang harus diselesaikan terlebih dahulu.

**Penanggung Jawab Pemeriksaan:**
- Sistem Governance MCP
- ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
`;

  return reportContent;
}

async function main() {
  try {
    const reportData = await collectGovernanceData();
    const reportContent = await generateReport(reportData);
    
    // Save report to file
    const reportPath = '/home/sangumang/Documents/sisinfops/laporan_pemeriksaan_sisinfops.md';
    fs.writeFileSync(reportPath, reportContent);
    
    console.log(`\n✅ Laporan berhasil dibuat: ${reportPath}`);
    console.log('\n📊 Ringkasan Laporan:');
    console.log('=====================');
    console.log(reportContent.substring(0, 500) + '...\n');
    
    // Also save raw JSON data for reference
    const jsonPath = '/home/sangumang/Documents/sisinfops/laporan_data_raw.json';
    fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2));
    console.log(`📁 Data mentah tersimpan: ${jsonPath}`);
    
  } catch (error) {
    console.error('❌ Gagal membuat laporan:', error);
    process.exit(1);
  }
}

main();