"use client"

import { useMemo, useState } from "react"
import type { SensorReading } from "@/components/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export default function SensorTableRaw({ data, activeView }: { data: SensorReading[], activeView: any }) {

  if(activeView !== "rawdata"){
    return;
  }

  const [searchTerm, setSearchTerm] = useState("")

  const filteredRows = useMemo(() => {
    const filtered = searchTerm
      ? data.filter(
          (reading) =>
            reading.sensorId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reading.city.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : data

    return [...filtered]
      .filter((r) => r.rawDataString)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 100)
  }, [data, searchTerm])

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-3xl font-semibold tracking-tight mb-4 flex justify-between items-center">
          Latest Raw Sensor Readings
        </CardTitle>
        <div className="relative w-full md:w-1/2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by sensor ID or city..."
            className="pl-8 bg-gray-800 text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xl">Raw Data String</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length > 0 ? (
                filteredRows.map((reading) => (
                  <TableRow key={`${reading.id}-${reading.timestamp}`}>
                    <TableCell className="text-lg font-mono text-purple-300">
                      {reading.rawDataString}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="text-center text-lg py-8">No data found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
