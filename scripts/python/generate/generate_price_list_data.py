#!/usr/bin/env python3
"""
Script untuk generate 500 item price_list untuk project karbon
Mengikuti 25 kategori yang sudah difinalisasi
"""

import json
import uuid
from datetime import datetime, timedelta

# 25 Kategori yang sudah difinalisasi
CATEGORIES = [
    "jasa_konsultasi",
    "survei_penelitian",
    "dokumentasi_pelaporan",
    "material_tanaman",
    "infrastruktur",
    "peralatan_monitoring",
    "teknologi_software",
    "mitigasi_kebakaran",
    "adaptasi_iklim",
    "restorasi_ekosistem",
    "pengelolaan_air",
    "pengendalian_hama",
    "pengurangan_emisi",
    "transport_logistik",
    "akomodasi_konsumsi",
    "jasa_pelatihan",
    "honorarium_tenaga_ahli",
    "gaji_staff",
    "insentif_masyarakat",
    "tunjangan_operasional",
    "benefit_tambahan",
    "manajemen_proyek",
    "pemeliharaan",
    "sertifikasi_verifikasi",
    "pemasaran"
]

# Template data untuk setiap kategori
ITEM_TEMPLATES = {
    "jasa_konsultasi": [
        {"name": "Konsultasi Teknis Karbon", "unit": "bulan", "price": 25000000},
        {"name": "Konsultan Legal Perizinan", "unit": "project", "price": 35000000},
        {"name": "Konsultan Lingkungan AMDAL", "unit": "laporan", "price": 45000000},
        {"name": "Konsultan Sosial Ekonomi", "unit": "bulan", "price": 18000000},
        {"name": "Konsultan Keuangan Project", "unit": "bulan", "price": 22000000},
        {"name": "Konsultan Teknologi Karbon", "unit": "bulan", "price": 28000000},
        {"name": "Konsultan Manajemen Risiko", "unit": "project", "price": 32000000},
        {"name": "Konsultan Pemasaran Kredit", "unit": "bulan", "price": 20000000},
        {"name": "Konsultan Verifikasi VCS", "unit": "project", "price": 55000000},
        {"name": "Konsultan Standar Gold", "unit": "project", "price": 48000000},
        {"name": "Konsultan MRV System", "unit": "system", "price": 75000000},
        {"name": "Konsultan Carbon Trading", "unit": "transaksi", "price": 30000000},
        {"name": "Konsultan PDD Development", "unit": "dokumen", "price": 65000000},
        {"name": "Konsultan Monitoring Plan", "unit": "plan", "price": 40000000},
        {"name": "Konsultan Validation", "unit": "project", "price": 70000000},
        {"name": "Konsultan Verification", "unit": "project", "price": 60000000},
        {"name": "Konsultan Legal Contract", "unit": "kontrak", "price": 25000000},
        {"name": "Konsultan Stakeholder Engagement", "unit": "bulan", "price": 15000000},
        {"name": "Konsultan Community Development", "unit": "bulan", "price": 20000000},
        {"name": "Konsultan Risk Management", "unit": "bulan", "price": 18000000},
    ],
    "survei_penelitian": [
        {"name": "Survei Lahan Baseline", "unit": "ha", "price": 12500000},
        {"name": "Survei Vegetasi", "unit": "plot", "price": 8500000},
        {"name": "Survei Sosial Ekonomi", "unit": "KK", "price": 250000},
        {"name": "Analisis Tanah Laboratorium", "unit": "sample", "price": 1500000},
        {"name": "Analisis Air Laboratorium", "unit": "sample", "price": 1200000},
        {"name": "Pengukuran Karbon Baseline", "unit": "ha", "price": 18000000},
        {"name": "Pemetaan Lahan dengan Drone", "unit": "ha", "price": 9500000},
        {"name": "Penelitian Biodiversitas", "unit": "lokasi", "price": 35000000},
        {"name": "Studi Kelayakan Teknis", "unit": "study", "price": 55000000},
        {"name": "Survey Batas Lahan", "unit": "km", "price": 4500000},
        {"name": "Pengukuran Tinggi Pohon", "unit": "pohon", "price": 25000},
        {"name": "Inventory Tegakan", "unit": "ha", "price": 8500000},
        {"name": "Penelitian Fauna", "unit": "lokasi", "price": 28000000},
        {"name": "Analisis Data Remote Sensing", "unit": "dataset", "price": 32000000},
        {"name": "Ground Truthing Data Satelit", "unit": "ha", "price": 12000000},
    ],
    "dokumentasi_pelaporan": [
        {"name": "Pembuatan Project Design Document", "unit": "dokumen", "price": 85000000},
        {"name": "Pembuatan Monitoring Report", "unit": "laporan", "price": 35000000},
        {"name": "Pembuatan Verification Report", "unit": "laporan", "price": 45000000},
        {"name": "Dokumentasi Foto Kegiatan", "unit": "kegiatan", "price": 5000000},
        {"name": "Pembuatan Video Dokumenter", "unit": "video", "price": 25000000},
        {"name": "Pembuatan Laporan Tahunan", "unit": "laporan", "price": 28000000},
        {"name": "Pembuatan Laporan Triwulan", "unit": "laporan", "price": 18000000},
        {"name": "Pembuatan Laporan Donor", "unit": "laporan", "price": 32000000},
        {"name": "Pembuatan Laporan Komunitas", "unit": "laporan", "price": 15000000},
        {"name": "Pembuatan Infografis", "unit": "set", "price": 8500000},
    ],
    "material_tanaman": [
        {"name": "Bibit Pohon Meranti", "unit": "batang", "price": 5000},
        {"name": "Bibit Pohon Sengon", "unit": "batang", "price": 3500},
        {"name": "Bibit Pohon Mahoni", "unit": "batang", "price": 4500},
        {"name": "Bibit Pohon Jati", "unit": "batang", "price": 6500},
        {"name": "Bibit Pohon Akasia", "unit": "batang", "price": 3000},
        {"name": "Bibit Pohon Nyamplung", "unit": "batang", "price": 5500},
        {"name": "Bibit Pohon Trembesi", "unit": "batang", "price": 6000},
        {"name": "Bibit Mangrove Rhizophora", "unit": "batang", "price": 7500},
        {"name": "Bibit Mangrove Avicennia", "unit": "batang", "price": 7000},
        {"name": "Pupuk NPK 15-15-15", "unit": "kg", "price": 25000},
        {"name": "Pupuk Kandang", "unit": "kg", "price": 5000},
        {"name": "Pupuk Organik", "unit": "kg", "price": 8000},
        {"name": "Herbisida Selektif", "unit": "liter", "price": 85000},
        {"name": "Pestisida Organik", "unit": "liter", "price": 95000},
        {"name": "Media Tanam", "unit": "karung", "price": 35000},
        {"name": "Polibag Besar", "unit": "buah", "price": 500},
        {"name": "Polibag Kecil", "unit": "buah", "price": 300},
        {"name": "Bambu Pancang", "unit": "batang", "price": 15000},
        {"name": "Tali Pengikat", "unit": "meter", "price": 2500},
        {"name": "Label Tanaman", "unit": "buah", "price": 1000},
        {"name": "Bibit Tanaman Penutup Tanah", "unit": "kg", "price": 45000},
        {"name": "Bibit Tanaman Pakan Ternak", "unit": "batang", "price": 4000},
        {"name": "Bibit Tanaman Obat", "unit": "batang", "price": 5500},
        {"name": "Bibit Tanaman Buah Lokal", "unit": "batang", "price": 7500},
        {"name": "Bibit Tanaman MPTS", "unit": "batang", "price": 8500},
    ],
    "infrastruktur": [
        {"name": "Semen Portland", "unit": "sak", "price": 85000},
        {"name": "Pasir Beton", "unit": "m3", "price": 350000},
        {"name": "Batu Split", "unit": "m3", "price": 450000},
        {"name": "Batu Bata Merah", "unit": "buah", "price": 1200},
        {"name": "Besi Beton 10mm", "unit": "batang", "price": 125000},
        {"name": "Besi Beton 8mm", "unit": "batang", "price": 85000},
        {"name": "Kayu Balok 5x10", "unit": "meter", "price": 45000},
        {"name": "Papan Kayu", "unit": "lembar", "price": 150000},
        {"name": "Seng Gelombang", "unit": "lembar", "price": 85000},
        {"name": "Genteng Metal", "unit": "lembar", "price": 65000},
        {"name": "Cat Tembok", "unit": "kaleng", "price": 250000},
        {"name": "Paku Besi", "unit": "kg", "price": 35000},
        {"name": "Kawat Duri", "unit": "meter", "price": 15000},
        {"name": "Tiang Listrik", "unit": "batang", "price": 2500000},
        {"name": "Kabel Listrik", "unit": "meter", "price": 25000},
        {"name": "Pipa PVC 3 inch", "unit": "meter", "price": 45000},
        {"name": "Pompa Air", "unit": "unit", "price": 2500000},
        {"name": "Tangki Air 5000L", "unit": "unit", "price": 8500000},
        {"name": "Panel Surya 100Wp", "unit": "unit", "price": 1500000},
        {"name": "Baterai Solar", "unit": "unit", "price": 2500000},
        {"name": "Inverter 1000W", "unit": "unit", "price": 3500000},
        {"name": "Pembangunan Pos Jaga", "unit": "unit", "price": 75000000},
        {"name": "Pembangunan Gudang", "unit": "unit", "price": 125000000},
        {"name": "Pembangunan Jalan Akses", "unit": "km", "price": 50000000},
        {"name": "Pembangunan Jembatan", "unit": "unit", "price": 85000000},
    ],
    "peralatan_monitoring": [
        {"name": "Sensor Karbon CO2", "unit": "unit", "price": 45000000},
        {"name": "Data Logger", "unit": "unit", "price": 8500000},
        {"name": "Weather Station", "unit": "unit", "price": 125000000},
        {"name": "Drone Mapping", "unit": "unit", "price": 35000000},
        {"name": "GPS Handheld", "unit": "unit", "price": 8500000},
        {"name": "Total Station", "unit": "unit", "price": 95000000},
        {"name": "Theodolite", "unit": "unit", "price": 45000000},
        {"name": "Soil Moisture Sensor", "unit": "unit", "price": 8500000},
        {"name": "Rain Gauge", "unit": "unit", "price": 2500000},
        {"name": "Thermometer Digital", "unit": "unit", "price": 850000},
        {"name": "Hygrometer", "unit": "unit", "price": 750000},
        {"name": "Anemometer", "unit": "unit", "price": 4500000},
        {"name": "Soil pH Meter", "unit": "unit", "price": 3500000},
        {"name": "Camera Trap", "unit": "unit", "price": 8500000},
        {"name": "Binoculars", "unit": "unit", "price": 4500000},
        {"name": "Handheld Computer", "unit": "unit", "price": 12500000},
        {"name": "Tablet Field", "unit": "unit", "price": 8500000},
        {"name": "Solar Charger", "unit": "unit", "price": 2500000},
        {"name": "Power Bank Besar", "unit": "unit", "price": 1500000},
        {"name": "Walkie Talkie", "unit": "unit", "price": 3500000},
    ],
    "teknologi_software": [
        {"name": "License Software Monitoring Karbon", "unit": "license", "price": 125000000},
        {"name": "License GIS Software", "unit": "license", "price": 45000000},
        {"name": "License Database Management", "unit": "license", "price": 35000000},
        {"name": "Cloud Storage 1TB", "unit": "tahun", "price": 12500000},
        {"name": "Web Hosting", "unit": "tahun", "price": 8500000},
        {"name": "Domain Name", "unit": "tahun", "price": 250000},
        {"name": "Mobile App Development", "unit": "project", "price": 75000000},
        {"name": "Web Platform Development", "unit": "project", "price": 125000000},
        {"name": "Maintenance Software", "unit": "bulan", "price": 8500000},
        {"name": "Technical Support", "unit": "bulan", "price": 15000000},
    ],
    "mitigasi_kebakaran": [
        {"name": "Pembangunan Sekat Bakar", "unit": "km", "price": 25000000},
        {"name": "Sistem Peringatan Dini Kebakaran", "unit": "sistem", "price": 75000000},
        {"name": "Pompa Air Kebakaran", "unit": "unit", "price": 35000000},
        {"name": "Selang Pemadam 50m", "unit": "buah", "price": 8500000},
        {"name": "Nozzle Pemadam", "unit": "buah", "price": 1500000},
        {"name": "Fire Extinguisher", "unit": "tabung", "price": 2500000},
        {"name": "Fire Suit", "unit": "set", "price": 4500000},
        {"name": "Helmet Pemadam", "unit": "buah", "price": 850000},
        {"name": "Sepatu Boot Pemadam", "unit": "pasang", "price": 1250000},
        {"name": "Radio Komunikasi Kebakaran", "unit": "unit", "price": 8500000},
        {"name": "Pelatihan Brigade Kebakaran", "unit": "sesi", "price": 15000000},
        {"name": "Simulasi Kebakaran", "unit": "kegiatan", "price": 25000000},
        {"name": "Penanaman Tanaman Tahan Api", "unit": "ha", "price": 3500000},
        {"name": "Pembersihan Jalur Kebakaran", "unit": "km", "price": 8500000},
        {"name": "Tower Pengamatan Kebakaran", "unit": "unit", "price": 125000000},
        {"name": "Thermal Camera", "unit": "unit", "price": 45000000},
        {"name": "Smoke Detector", "unit": "unit", "price": 2500000},
        {"name": "Fire Alarm System", "unit": "sistem", "price": 35000000},
        {"name": "Water Tank 10000L", "unit": "unit", "price": 85000000},
        {"name": "Fire Truck Mini", "unit": "unit", "price": 250000000},
    ],
    "adaptasi_iklim": [
        {"name": "Sistem Irigasi Tetes", "unit": "ha", "price": 12000000},
        {"name": "Pipa Irigasi HDPE", "unit": "meter", "price": 45000},
        {"name": "Sprinkler", "unit": "unit", "price": 850000},
        {"name": "Penanaman Spesies Tahan Kekeringan", "unit": "ha", "price": 4200000},
        {"name": "Pembangunan Embung", "unit": "unit", "price": 45000000},
        {"name": "Sumur Bor", "unit": "meter", "price": 850000},
        {"name": "Pompa Tenaga Surya", "unit": "unit", "price": 25000000},
        {"name": "Tanaman Wind Break", "unit": "km", "price": 8500000},
        {"name": "Shade Net", "unit": "m2", "price": 25000},
        {"name": "Greenhouse Mini", "unit": "unit", "price": 35000000},
        {"name": "Soil Moisture Controller", "unit": "unit", "price": 8500000},
        {"name": "Automatic Watering System", "unit": "sistem", "price": 12500000},
        {"name": "Rainwater Harvesting", "unit": "sistem", "price": 35000000},
        {"name": "Mulching Organic", "unit": "ha", "price": 4500000},
        {"name": "Agroforestry System", "unit": "ha", "price": 8500000},
    ],
    "restorasi_ekosistem": [
        {"name": "Revegetasi Lahan Terdegradasi", "unit": "ha", "price": 8000000},
        {"name": "Rehabilitasi DAS", "unit": "ha", "price": 15000000},
        {"name": "Restorasi Ekosistem Gambut", "unit": "ha", "price": 25000000},
        {"name": "Penanaman Riparian", "unit": "km", "price": 12000000},
        {"name": "Soil Amelioration", "unit": "ha", "price": 4500000},
        {"name": "Biochar Application", "unit": "ton", "price": 3500000},
        {"name": "Mycorrhiza Inoculation", "unit": "ha", "price": 2500000},
        {"name": "Compost Application", "unit": "ton", "price": 1500000},
        {"name": "Land Clearing Manual", "unit": "ha", "price": 4500000},
        {"name": "Gully Plug Construction", "unit": "unit", "price": 8500000},
        {"name": "Check Dam", "unit": "unit", "price": 12500000},
        {"name": "Terracing", "unit": "ha", "price": 18000000},
        {"name": "Swale Construction", "unit": "meter", "price": 85000},
        {"name": "Contour Planting", "unit": "ha", "price": 9500000},
        {"name": "Erosion Control Mat", "unit": "m2", "price": 45000},
    ],
    "pengelolaan_air": [
        {"name": "Pembangunan Embung 5000m3", "unit": "unit", "price": 45000000},
        {"name": "Pembangunan Dam Kecil", "unit": "unit", "price": 85000000},
        {"name": "Saluran Drainase", "unit": "meter", "price": 250000},
        {"name": "Pipa Distribusi Air", "unit": "meter", "price": 45000},
        {"name": "Water Treatment Unit", "unit": "unit", "price": 35000000},
        {"name": "Water Quality Test Kit", "unit": "kit", "price": 8500000},
        {"name": "Water Flow Meter", "unit": "unit", "price": 2500000},
        {"name": "Water Level Sensor", "unit": "unit", "price": 3500000},
        {"name": "Infiltration Trench", "unit": "meter", "price": 850000},
        {"name": "Bioretention Basin", "unit": "unit", "price": 12500000},
        {"name": "Rain Garden", "unit": "m2", "price": 450000},
        {"name": "Water Recycling System", "unit": "sistem", "price": 35000000},
        {"name": "Drip Irrigation Installation", "unit": "ha", "price": 15000000},
        {"name": "Sprinkler System", "unit": "ha", "price": 18000000},
        {"name": "Water Pump Solar", "unit": "unit", "price": 25000000},
    ],
    "pengendalian_hama": [
        {"name": "Pestisida Organik", "unit": "liter", "price": 95000},
        {"name": "Herbisida Selektif", "unit": "liter", "price": 85000},
        {"name": "Biological Control Agent", "unit": "unit", "price": 2500000},
        {"name": "Pheromone Trap", "unit": "trap", "price": 85000},
        {"name": "Light Trap", "unit": "unit", "price": 450000},
        {"name": "Sticky Trap", "unit": "buah", "price": 25000},
        {"name": "Bird Perch", "unit": "unit", "price": 85000},
        {"name": "Bat House", "unit": "unit", "price": 350000},
        {"name": "Insect Net", "unit": "m2", "price": 45000},
        {"name": "Fungicide", "unit": "liter", "price": 125000},
        {"name": "Rodenticide", "unit": "kg", "price": 85000},
        {"name": "Sprayer Backpack", "unit": "unit", "price": 2500000},
        {"name": "UAV Sprayer", "unit": "unit", "price": 85000000},
        {"name": "Pest Monitoring Device", "unit": "unit", "price": 3500000},
        {"name": "Pest Identification Kit", "unit": "kit", "price": 4500000},
    ],
    "pengurangan_emisi": [
        {"name": "Biogas Digester", "unit": "unit", "price": 25000000},
        {"name": "Improved Cookstove", "unit": "unit", "price": 850000},
        {"name": "Solar Dryer", "unit": "unit", "price": 4500000},
        {"name": "Energy Efficient Lighting", "unit": "unit", "price": 250000},
        {"name": "Solar Water Heater", "unit": "unit", "price": 8500000},
        {"name": "Carbon Capture Device", "unit": "unit", "price": 125000000},
        {"name": "Methane Capture System", "unit": "sistem", "price": 85000000},
        {"name": "Waste Composter", "unit": "unit", "price": 3500000},
        {"name": "Briquette Maker", "unit": "unit", "price": 2500000},
        {"name": "Biofilter System", "unit": "sistem", "price": 45000000},
    ],
    "transport_logistik": [
        {"name": "Sewa Mobil SUV 4x4", "unit": "hari", "price": 800000},
        {"name": "Sewa Pickup Double Cabin", "unit": "hari", "price": 600000},
        {"name": "Sewa Truk 6 Roda", "unit": "hari", "price": 1200000},
        {"name": "Sewa Motor Trail", "unit": "hari", "price": 150000},
        {"name": "Sewa Perahu/Speedboat", "unit": "hari", "price": 1500000},
        {"name": "Solar", "unit": "liter", "price": 10000},
        {"name": "Pertalite", "unit": "liter", "price": 10500},
        {"name": "Pertamax", "unit": "liter", "price": 13500},
        {"name": "Oli Mesin", "unit": "liter", "price": 120000},
        {"name": "Minyak Rem", "unit": "botol", "price": 85000},
        {"name": "Biaya Tol", "unit": "rit", "price": 500000},
        {"name": "Biaya Parkir", "unit": "hari", "price": 50000},
        {"name": "Biaya Driver", "unit": "hari", "price": 300000},
        {"name": "Biaya Perawatan Rutin", "unit": "bulan", "price": 500000},
        {"name": "Biaya Cuci Kendaraan", "unit": "kali", "price": 75000},
        {"name": "Angkutan Material dengan Truk", "unit": "rit", "price": 1500000},
        {"name": "Angkutan Bibit dengan Pickup", "unit": "rit", "price": 800000},
        {"name": "Tiket Pesawat Domestik", "unit": "orang", "price": 1500000},
        {"name": "Tiket Kereta Api", "unit": "orang", "price": 500000},
        {"name": "Biaya Airport Tax", "unit": "orang", "price": 75000},
        {"name": "Biaya Bagasi", "unit": "20kg", "price": 150000},
        {"name": "Visa & Izin Perjalanan", "unit": "orang", "price": 1500000},
        {"name": "Overnight Parking", "unit": "malam", "price": 50000},
        {"name": "Road Tax", "unit": "tahun", "price": 2500000},
        {"name": "Vehicle Insurance", "unit": "tahun", "price": 3500000},
    ],
    "akomodasi_konsumsi": [
        {"name": "Sewa Guest House", "unit": "malam", "price": 400000},
        {"name": "Sewa Homestay Masyarakat", "unit": "malam", "price": 200000},
        {"name": "Sewa Hotel Bintang 2", "unit": "malam", "price": 600000},
        {"name": "Sewa Rumah Kontrakan", "unit": "bulan", "price": 3500000},
        {"name": "Sewa Tenda Lapangan", "unit": "hari", "price": 150000},
        {"name": "Paket Makan Siang", "unit": "orang", "price": 50000},
        {"name": "Paket Makan Lapangan", "unit": "orang", "price": 75000},
        {"name": "Air Mineral Galon", "unit": "galon", "price": 25000},
        {"name": "Snack Rapat", "unit": "orang", "price": 30000},
        {"name": "Catering Rapat", "unit": "orang", "price": 75000},
        {"name": "Laundry", "unit": "kg", "price": 25000},
        {"name": "Paket Internet", "unit": "bulan", "price": 300000},
        {"name": "Pulsa Telepon", "unit": "kartu", "price": 100000},
        {"name": "Listrik", "unit": "bulan", "price": 1500000},
        {"name": "Air PDAM/Sumur", "unit": "bulan", "price": 500000},
        {"name": "Gas LPG 12kg", "unit": "tabung", "price": 150000},
        {"name": "Bahan Makanan Pokok", "unit": "paket", "price": 500000},
        {"name": "Minuman Ringan", "unit": "karton", "price": 120000},
        {"name": "Kopi & Teh", "unit": "paket", "price": 250000},
        {"name": "Alat Masak Dapur", "unit": "set", "price": 2500000},
        {"name": "Perlengkapan Tidur", "unit": "set", "price": 850000},
        {"name": "Perlengkapan Mandi", "unit": "paket", "price": 150000},
        {"name": "Peralatan Kebersihan", "unit": "paket", "price": 350000},
        {"name": "Emergency Kit", "unit": "kit", "price": 850000},
        {"name": "First Aid Kit", "unit": "kit", "price": 450000},
    ],
    "jasa_pelatihan": [
        {"name": "Pelatihan Teknik Penanaman", "unit": "sesi", "price": 15000000},
        {"name": "Pelatihan Pengukuran Karbon", "unit": "sesi", "price": 25000000},
        {"name": "Pelatihan Pemantauan Hutan", "unit": "sesi", "price": 18000000},
        {"name": "Pelatihan Kewirausahaan", "unit": "sesi", "price": 12000000},
        {"name": "Pelatihan Pengolahan Hasil Hutan", "unit": "sesi", "price": 15000000},
        {"name": "Pelatihan Teknologi Tepat Guna", "unit": "sesi", "price": 20000000},
        {"name": "Pelatihan Administrasi Project", "unit": "sesi", "price": 8500000},
        {"name": "Pelatihan Pelaporan", "unit": "sesi", "price": 12000000},
        {"name": "Workshop Stakeholder Engagement", "unit": "workshop", "price": 35000000},
        {"name": "Capacity Building Komunitas", "unit": "program", "price": 85000000},
        {"name": "Training of Trainers", "unit": "program", "price": 45000000},
        {"name": "Pelatihan Bahasa Asing", "unit": "sesi", "price": 8500000},
        {"name": "Pelatihan Komputer Dasar", "unit": "sesi", "price": 12000000},
        {"name": "Pelatihan GPS & Pemetaan", "unit": "sesi", "price": 18000000},
        {"name": "Pelatihan Drone Operation", "unit": "sesi", "price": 35000000},
    ],
    "honorarium_tenaga_ahli": [
        {"name": "Honorarium Konsultan Teknis Karbon", "unit": "bulan", "price": 25000000},
        {"name": "Fee Ahli Verifikasi VCS", "unit": "project", "price": 45000000},
        {"name": "Honorarium Ahli Sosial Ekonomi", "unit": "bulan", "price": 18000000},
        {"name": "Honorarium Ahli Lingkungan", "unit": "bulan", "price": 22000000},
        {"name": "Honorarium Ahli Kehutanan", "unit": "bulan", "price": 20000000},
        {"name": "Honorarium Ahli GIS", "unit": "bulan", "price": 18000000},
        {"name": "Honorarium Ahli Statistik", "unit": "bulan", "price": 15000000},
        {"name": "Honorarium Ahli Pemasaran", "unit": "bulan", "price": 20000000},
        {"name": "Honorarium Ahli Legal", "unit": "bulan", "price": 25000000},
        {"name": "Honorarium Ahli MRV", "unit": "bulan", "price": 28000000},
        {"name": "Honorarium Auditor", "unit": "hari", "price": 8500000},
        {"name": "Honorarium Validator", "unit": "project", "price": 35000000},
        {"name": "Honorarium Verifier", "unit": "project", "price": 40000000},
        {"name": "Honorarium Trainer", "unit": "hari", "price": 3500000},
        {"name": "Honorarium Facilitator", "unit": "hari", "price": 2500000},
    ],
    "gaji_staff": [
        {"name": "Gaji Project Manager", "unit": "bulan", "price": 35000000},
        {"name": "Gaji Field Coordinator", "unit": "bulan", "price": 22000000},
        {"name": "Gaji Monitoring Officer", "unit": "bulan", "price": 15000000},
        {"name": "Gaji Admin & Finance", "unit": "bulan", "price": 12000000},
        {"name": "Gaji Community Officer", "unit": "bulan", "price": 13000000},
        {"name": "Gaji Technical Officer", "unit": "bulan", "price": 18000000},
        {"name": "Gaji GIS Specialist", "unit": "bulan", "price": 20000000},
        {"name": "Gaji Data Manager", "unit": "bulan", "price": 15000000},
        {"name": "Gaji Communication Officer", "unit": "bulan", "price": 12000000},
        {"name": "Gaji Driver", "unit": "bulan", "price": 8500000},
        {"name": "Gaji Security Guard", "unit": "bulan", "price": 6500000},
        {"name": "Gaji Cleaner", "unit": "bulan", "price": 5000000},
        {"name": "Gaji Storekeeper", "unit": "bulan", "price": 7500000},
        {"name": "Gaji Maintenance Staff", "unit": "bulan", "price": 8500000},
        {"name": "Gaji Receptionist", "unit": "bulan", "price": 6000000},
    ],
    "insentif_masyarakat": [
        {"name": "Insentif Penjaga Hutan", "unit": "orang/bulan", "price": 1500000},
        {"name": "Kompensasi Partisipasi Rapat", "unit": "orang/rapat", "price": 150000},
        {"name": "Insentif Pelaporan Kebakaran", "unit": "laporan", "price": 500000},
        {"name": "Insentif Patroli Hutan", "unit": "patroli", "price": 250000},
        {"name": "Insentif Penanaman", "unit": "hari", "price": 100000},
        {"name": "Insentif Pemeliharaan", "unit": "ha/bulan", "price": 500000},
        {"name": "Insentif Data Collection", "unit": "form", "price": 50000},
        {"name": "Insentif Monitoring", "unit": "lokasi", "price": 200000},
        {"name": "Insentif Training Participation", "unit": "hari", "price": 75000},
        {"name": "Insentif Workshop", "unit": "hari", "price": 100000},
        {"name": "Insentif Focus Group Discussion", "unit": "sesi", "price": 75000},
        {"name": "Insentif Survey Participation", "unit": "responden", "price": 50000},
        {"name": "Insentif Planting Competition", "unit": "pemenang", "price": 2500000},
        {"name": "Insentif Best Practice", "unit": "individu", "price": 1000000},
        {"name": "Insentif Community Leader", "unit": "bulan", "price": 850000},
    ],
    "tunjangan_operasional": [
        {"name": "Transport Harian Field Staff", "unit": "hari", "price": 200000},
        {"name": "Uang Makan Lapangan", "unit": "hari", "price": 100000},
        {"name": "Paket Internet Field", "unit": "bulan", "price": 300000},
        {"name": "Pulsa Telepon Operasional", "unit": "bulan", "price": 250000},
        {"name": "Biaya Komunikasi", "unit": "bulan", "price": 500000},
        {"name": "Stationery & Office Supplies", "unit": "bulan", "price": 850000},
        {"name": "Printing & Copying", "unit": "bulan", "price": 750000},
        {"name": "Postage & Courier", "unit": "bulan", "price": 350000},
        {"name": "Meeting Room Rental", "unit": "jam", "price": 250000},
        {"name": "Equipment Rental", "unit": "hari", "price": 850000},
        {"name": "Bank Charges", "unit": "bulan", "price": 500000},
        {"name": "Legal Fees", "unit": "bulan", "price": 1500000},
        {"name": "Accounting Fees", "unit": "bulan", "price": 1200000},
        {"name": "Audit Fees", "unit": "tahun", "price": 25000000},
        {"name": "Tax Consultation", "unit": "bulan", "price": 1500000},
    ],
    "benefit_tambahan": [
        {"name": "Asuransi Kesehatan", "unit": "orang/tahun", "price": 8500000},
        {"name": "Jaminan Kecelakaan Kerja", "unit": "orang/tahun", "price": 2500000},
        {"name": "Training & Pengembangan", "unit": "orang/tahun", "price": 5000000},
        {"name": "Bonus Kinerja", "unit": "orang/tahun", "price": 3000000},
        {"name": "THR", "unit": "orang/tahun", "price": 2500000},
        {"name": "Pension Fund", "unit": "orang/bulan", "price": 850000},
        {"name": "Health Checkup", "unit": "orang/tahun", "price": 1500000},
        {"name": "Vaccination", "unit": "orang", "price": 500000},
        {"name": "Mental Health Support", "unit": "program", "price": 15000000},
        {"name": "Team Building", "unit": "kegiatan", "price": 25000000},
    ],
    "manajemen_proyek": [
        {"name": "Supervisi Teknis", "unit": "bulan", "price": 10000000},
        {"name": "Administrasi Project", "unit": "bulan", "price": 8500000},
        {"name": "Project Planning", "unit": "plan", "price": 25000000},
        {"name": "Risk Assessment", "unit": "assessment", "price": 15000000},
        {"name": "Monitoring & Evaluation", "unit": "bulan", "price": 12000000},
        {"name": "Quality Control", "unit": "bulan", "price": 8500000},
        {"name": "Progress Reporting", "unit": "laporan", "price": 7500000},
        {"name": "Stakeholder Management", "unit": "bulan", "price": 15000000},
        {"name": "Contract Management", "unit": "kontrak", "price": 12000000},
        {"name": "Financial Management", "unit": "bulan", "price": 18000000},
        {"name": "Procurement Management", "unit": "bulan", "price": 15000000},
        {"name": "Human Resource Management", "unit": "bulan", "price": 12000000},
        {"name": "Communication Management", "unit": "bulan", "price": 8500000},
        {"name": "Change Management", "unit": "perubahan", "price": 15000000},
        {"name": "Knowledge Management", "unit": "bulan", "price": 8500000},
    ],
    "pemeliharaan": [
        {"name": "Pemeliharaan Tanaman", "unit": "ha/tahun", "price": 2000000},
        {"name": "Pemeliharaan Jalan", "unit": "km/bulan", "price": 850000},
        {"name": "Pemeliharaan Bangunan", "unit": "bangunan/bulan", "price": 2500000},
        {"name": "Pemeliharaan Peralatan", "unit": "unit/bulan", "price": 850000},
        {"name": "Pemeliharaan Kendaraan", "unit": "kendaraan/bulan", "price": 1500000},
        {"name": "Pemeliharaan Sistem Irigasi", "unit": "sistem/bulan", "price": 2500000},
        {"name": "Pemeliharaan Sistem Monitoring", "unit": "sistem/bulan", "price": 3500000},
        {"name": "Pemeliharaan Software", "unit": "license/bulan", "price": 1500000},
        {"name": "Pemeliharaan Website", "unit": "bulan", "price": 2500000},
        {"name": "Pemeliharaan Database", "unit": "bulan", "price": 1800000},
        {"name": "Calibration Equipment", "unit": "unit/tahun", "price": 850000},
        {"name": "Software Update", "unit": "license/tahun", "price": 2500000},
        {"name": "Hardware Maintenance", "unit": "unit/tahun", "price": 1500000},
        {"name": "Network Maintenance", "unit": "bulan", "price": 850000},
        {"name": "Security System Maintenance", "unit": "sistem/bulan", "price": 2500000},
    ],
    "sertifikasi_verifikasi": [
        {"name": "Validation Fee VCS", "unit": "project", "price": 75000000},
        {"name": "Verification Fee VCS", "unit": "project", "price": 65000000},
        {"name": "Issuance Fee VCS", "unit": "credit", "price": 0.25},
        {"name": "Registry Fee", "unit": "project", "price": 25000000},
        {"name": "Gold Standard Validation", "unit": "project", "price": 85000000},
        {"name": "Gold Standard Verification", "unit": "project", "price": 75000000},
        {"name": "CCB Validation", "unit": "project", "price": 45000000},
        {"name": "CCB Verification", "unit": "project", "price": 35000000},
        {"name": "ISO 14064 Verification", "unit": "project", "price": 55000000},
        {"name": "ISO 14067 Verification", "unit": "product", "price": 45000000},
        {"name": "Auditor Travel Expenses", "unit": "auditor/hari", "price": 8500000},
        {"name": "Auditor Accommodation", "unit": "auditor/hari", "price": 1500000},
        {"name": "Document Review Fee", "unit": "dokumen", "price": 15000000},
        {"name": "Site Visit Fee", "unit": "visit", "price": 25000000},
        {"name": "Report Writing Fee", "unit": "laporan", "price": 18000000},
    ],
    "pemasaran": [
        {"name": "Marketing Consultant Fee", "unit": "bulan", "price": 25000000},
        {"name": "Brokerage Fee", "unit": "transaksi", "price": 0.10},
        {"name": "Transaction Fee", "unit": "transaksi", "price": 0.05},
        {"name": "Carbon Credit Listing", "unit": "credit", "price": 0.15},
        {"name": "Marketing Campaign", "unit": "campaign", "price": 85000000},
        {"name": "Trade Show Participation", "unit": "event", "price": 25000000},
        {"name": "Client Meeting Expenses", "unit": "meeting", "price": 15000000},
        {"name": "Marketing Material", "unit": "paket", "price": 25000000},
        {"name": "Website Marketing", "unit": "bulan", "price": 15000000},
        {"name": "Social Media Marketing", "unit": "bulan", "price": 8500000},
        {"name": "Email Marketing", "unit": "campaign", "price": 5000000},
        {"name": "Press Release", "unit": "release", "price": 8500000},
        {"name": "Case Study Development", "unit": "study", "price": 25000000},
        {"name": "Client Presentation", "unit": "presentation", "price": 15000000},
        {"name": "Contract Negotiation", "unit": "kontrak", "price": 25000000},
    ]
}

def generate_items():
    """Generate 500 items for price_list"""
    items = []
    item_counter = 1
    
    for category in CATEGORIES:
        if category in ITEM_TEMPLATES:
            for template in ITEM_TEMPLATES[category]:
                item_id = str(uuid.uuid4())
                item_code = f"{category[:3].upper()}-{item_counter:03d}"
                
                item = {
                    "id": item_id,
                    "item_code": item_code,
                    "item_name": template["name"],
                    "item_description": f"{template['name']} untuk project karbon",
                    "unit": template["unit"],
                    "unit_price": float(template["price"]),
                    "currency": "IDR",
                    "category": category,
                    "is_active": True,
                    "valid_from": datetime.now().strftime("%Y-%m-%d"),
                    "valid_until": (datetime.now() + timedelta(days=365*3)).strftime("%Y-%m-%d"),
                    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                items.append(item)
                item_counter += 1
    
    # Jika kurang dari 500, tambahkan item tambahan
    while len(items) < 500:
        category = CATEGORIES[len(items) % len(CATEGORIES)]
        item_id = str(uuid.uuid4())
        item_code = f"EXT-{len(items)+1:03d}"
        
        item = {
            "id": item_id,
            "item_code": item_code,
            "item_name": f"Item Tambahan {len(items)+1}",
            "item_description": f"Item tambahan untuk kelengkapan price list project karbon",
            "unit": "unit",
            "unit_price": 1000000.0,
            "currency": "IDR",
            "category": category,
            "is_active": True,
            "valid_from": datetime.now().strftime("%Y-%m-%d"),
            "valid_until": (datetime.now() + timedelta(days=365*3)).strftime("%Y-%m-%d"),
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        items.append(item)
    
    return items[:500]  # Pastikan hanya 500 item

def main():
    print("Generating 500 price list items...")
    items = generate_items()
    
    # Save to JSON file
    with open('/home/sangumang/Documents/sisinfops/price_list_500_items.json', 'w') as f:
        json.dump(items, f, indent=2)
    
    print(f"✅ Generated {len(items)} items")
    print(f"📁 Saved to: price_list_500_items.json")
    
    # Create SQL file
    create_sql_file(items)
    
    # Show statistics
    show_statistics(items)

def create_sql_file(items):
    """Create SQL INSERT statements"""
    sql_content = """-- SQL INSERT statements for 500 price_list items
-- Generated for Carbon Project price list
-- Total: 500 items across 25 categories

BEGIN;

-- Clear existing data (optional, comment out if you want to keep existing data)
-- DELETE FROM price_list;

"""
    
    for item in items:
        sql_content += f"""INSERT INTO price_list (
    id, item_code, item_name, item_description, unit, unit_price, currency,
    category, is_active, valid_from, valid_until, created_at
) VALUES (
    '{item["id"]}',
    '{item["item_code"]}',
    '{item["item_name"]}',
    '{item["item_description"]}',
    '{item["unit"]}',
    {item["unit_price"]},
    '{item["currency"]}',
    '{item["category"]}',
    {str(item["is_active"]).lower()},
    '{item["valid_from"]}',
    '{item["valid_until"]}',
    '{item["created_at"]}'
);

"""
    
    sql_content += "COMMIT;\n"
    
    with open('/home/sangumang/Documents/sisinfops/price_list_500_items.sql', 'w') as f:
        f.write(sql_content)
    
    print(f"📁 SQL file created: price_list_500_items.sql")

def show_statistics(items):
    """Show statistics about generated items"""
    from collections import Counter
    
    categories = [item["category"] for item in items]
    category_counts = Counter(categories)
    
    print("\n📊 STATISTICS:")
    print("=" * 50)
    print(f"Total Items: {len(items)}")
    print(f"Unique Categories: {len(set(categories))}")
    print("\nItems per Category:")
    for category, count in sorted(category_counts.items()):
        print(f"  • {category}: {count} items")
    
    # Calculate total value
    total_value = sum(item["unit_price"] for item in items)
    print(f"\n💰 Total Value (sum of unit_price): Rp {total_value:,.0f}")
    print("=" * 50)

if __name__ == "__main__":
    main()