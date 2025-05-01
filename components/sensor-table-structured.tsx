"use client"

import { useMemo, useState } from "react"
import type { SensorReading } from "@/components/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export default function SensorTableStructured({ data, activeView }: { data: SensorReading[], activeView: any }) {
  if (activeView !== "schematised") return null

  const [searchTerm, setSearchTerm] = useState("")
  const [showRawLatLon, setShowRawLatLon] = useState(true)

  const tableData = useMemo(() => {
    const filtered = searchTerm
      ? data.filter(
          (reading) =>
            reading.sensorId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reading.city.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : data

    return [...filtered]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 100)
  }, [data, searchTerm])

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-3xl font-semibold tracking-tight">
            Structured Sensor Data
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRawLatLon((prev) => !prev)}
            className="opacity-50 h-8 w-8 px-2 py-1 bg-gray-800 border-gray-700 hover:bg-gray-700"
            title="Toggle Lat/Lon format"
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-4 gap-4">
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
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xl">Sensor ID</TableHead>
                <TableHead className="text-xl">Timestamp</TableHead>
                <TableHead className="text-xl">City</TableHead>
                <TableHead className="text-xl">Temperature</TableHead>
                <TableHead className="text-xl">Humidity</TableHead>
                <TableHead className="text-xl">Pressure</TableHead>
                <TableHead className="text-xl">Lat/Lon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.length > 0 ? (
                tableData.map((reading) => (
                  <TableRow key={`${reading.id}-${reading.timestamp}`}>
                    <TableCell className="text-lg font-medium">{reading.sensorId}</TableCell>
                    <TableCell className="text-lg">{new Date(reading.timestamp).toLocaleString()}</TableCell>
                    <TableCell className="text-lg">{reading.city}</TableCell>
                    <TableCell className="text-lg">{reading.temperature.toFixed(2)}°F</TableCell>
                    <TableCell className="text-lg">{reading.humidity.toFixed(2)}%</TableCell>
                    <TableCell className="text-lg">{reading.pressure.toFixed(2)}</TableCell>
                    <TableCell className="text-lg">
                      {showRawLatLon
                        ? `${reading.lat}, ${reading.long}`
                        : `${parseFloat(reading.lat).toFixed(2)}, ${parseFloat(reading.long).toFixed(2)}`}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-lg py-8">
                    No data found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
