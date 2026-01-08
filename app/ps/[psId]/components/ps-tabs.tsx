"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TabRingkasan } from "./tab-ringkasan"
import { TabKelembagaan } from "./tab-kelembagaan"
import { TabDokumen } from "./tab-dokumen"
import { TabKegiatan } from "./tab-kegiatan"
import { TabGaleri } from "./tab-galeri"
import { TabPeta } from "./tab-peta"
import { TabCatatan } from "./tab-catatan"

export function PsTabs({ psId }: { psId: string }) {
  return (
    <Tabs defaultValue="ringkasan" className="w-full">
      <TabsList className="flex flex-wrap">
        <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
        <TabsTrigger value="kelembagaan">Kelembagaan</TabsTrigger>
        <TabsTrigger value="dokumen">Dokumen</TabsTrigger>
        <TabsTrigger value="kegiatan">Kegiatan</TabsTrigger>
        <TabsTrigger value="galeri">Galeri</TabsTrigger>
        <TabsTrigger value="peta">Peta</TabsTrigger>
        <TabsTrigger value="catatan">Catatan</TabsTrigger>
      </TabsList>

      <TabsContent value="ringkasan">
        <TabRingkasan psId={psId} />
      </TabsContent>
      <TabsContent value="kelembagaan">
        <TabKelembagaan psId={psId} />
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
    </Tabs>
  )
}
