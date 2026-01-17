"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TabRingkasan } from "./tab-ringkasan"
import { TabKelembagaan } from "./tab-kelembagaan"
import { TabLahan } from "./tab-lahan"
import { TabDokumen } from "./tab-dokumen"
import { TabKegiatan } from "./tab-kegiatan"
import { TabGaleri } from "./tab-galeri"
import { TabPeta } from "./tab-peta"
import { TabCatatan } from "./tab-catatan"
import { TabStatistik } from "./tab-statistik"
import { TabKelengkapanProyek } from "./tab-kelengkapan-proyek"

export function PsTabs({ psId }: { psId: string }) {
  return (
    <Tabs defaultValue="ringkasan" className="w-full">
      <TabsList className="inline-flex h-auto flex-wrap items-center justify-start gap-1 mb-6 rounded-md bg-gradient-to-r from-green-700 to-green-900 p-1 text-white">
        <TabsTrigger 
          value="ringkasan" 
          className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-600/80 hover:bg-green-500 text-white data-[state=active]:bg-white data-[state=active]:text-green-900 data-[state=active]:shadow-lg"
        >
          📋 Ringkasan
        </TabsTrigger>
        <TabsTrigger 
          value="kelembagaan" 
          className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-600/80 hover:bg-green-500 text-white data-[state=active]:bg-white data-[state=active]:text-green-900 data-[state=active]:shadow-lg"
        >
          🏛️ Kelembagaan
        </TabsTrigger>
        <TabsTrigger 
          value="lahan" 
          className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-600/80 hover:bg-green-500 text-white data-[state=active]:bg-white data-[state=active]:text-green-900 data-[state=active]:shadow-lg"
        >
          🌱 Lahan
        </TabsTrigger>
        <TabsTrigger 
          value="dokumen" 
          className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-600/80 hover:bg-green-500 text-white data-[state=active]:bg-white data-[state=active]:text-green-900 data-[state=active]:shadow-lg"
        >
          📄 Dokumen
        </TabsTrigger>
        <TabsTrigger 
          value="kegiatan" 
          className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-600/80 hover:bg-green-500 text-white data-[state=active]:bg-white data-[state=active]:text-green-900 data-[state=active]:shadow-lg"
        >
          🔧 Kegiatan
        </TabsTrigger>
        <TabsTrigger 
          value="galeri" 
          className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-600/80 hover:bg-green-500 text-white data-[state=active]:bg-white data-[state=active]:text-green-900 data-[state=active]:shadow-lg"
        >
          🖼️ Galeri
        </TabsTrigger>
        <TabsTrigger 
          value="peta" 
          className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-600/80 hover:bg-green-500 text-white data-[state=active]:bg-white data-[state=active]:text-green-900 data-[state=active]:shadow-lg"
        >
          🗺️ Peta
        </TabsTrigger>
        <TabsTrigger 
          value="catatan" 
          className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-600/80 hover:bg-green-500 text-white data-[state=active]:bg-white data-[state=active]:text-green-900 data-[state=active]:shadow-lg"
        >
          📝 Catatan
        </TabsTrigger>
        <TabsTrigger 
          value="statistik" 
          className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-600/80 hover:bg-green-500 text-white data-[state=active]:bg-white data-[state=active]:text-green-900 data-[state=active]:shadow-lg"
        >
          📊 Statistik
        </TabsTrigger>
        <TabsTrigger 
          value="kelengkapan-proyek" 
          className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-600/80 hover:bg-green-500 text-white data-[state=active]:bg-white data-[state=active]:text-green-900 data-[state=active]:shadow-lg"
        >
          ✅ Kelengkapan Proyek
        </TabsTrigger>
      </TabsList>

      <TabsContent value="ringkasan">
        <TabRingkasan psId={psId} />
      </TabsContent>
      <TabsContent value="kelembagaan">
        <TabKelembagaan psId={psId} />
      </TabsContent>
      <TabsContent value="lahan">
        <TabLahan psId={psId} />
      </TabsContent>
      <TabsContent value="dokumen">
        <TabDokumen psId={psId} />
      </TabsContent>
      <TabsContent value="kegiatan">
        <TabKegiatan psId={psId} />
      </TabsContent>
      <TabsContent value="galeri">
        <TabGaleri psId={psId} />
      </TabsContent>
      <TabsContent value="peta">
        <TabPeta psId={psId} />
      </TabsContent>
      <TabsContent value="catatan">
        <TabCatatan psId={psId} />
      </TabsContent>
      <TabsContent value="statistik">
        <TabStatistik psId={psId} />
      </TabsContent>
      <TabsContent value="kelengkapan-proyek">
        <TabKelengkapanProyek psId={psId} />
      </TabsContent>
    </Tabs>
  )
}
