"use client"

import { useMemo, useState } from "react"
import type { SensorReading } from "@/components/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export default function SensorTable({ data }: { data: SensorReading[] }) {
  const [searchTerm, setSearchTerm] = useState("")

  // Filter and sort data
  const tableData = useMemo(() => {
    // Filter by search term
    const filtered = searchTerm
      ? data.filter(
          (reading) =>
            reading.sensorId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reading.city.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      : data

    // Sort by timestamp (newest first)
    return [...filtered].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 100) // Only show the 100 most recent readings
  }, [data, searchTerm])

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-3xl">Latest Sensor Readings</CardTitle>
        <div className="relative mt-4">
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
                <TableHead className="text-xl">Sensor ID</TableHead>
                <TableHead className="text-xl">Timestamp</TableHead>
                <TableHead className="text-xl">City</TableHead>
                <TableHead className="text-xl">Temperature</TableHead>
                <TableHead className="text-xl">Humidity</TableHead>
                <TableHead className="text-xl">Pressure</TableHead>
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
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-lg py-8">
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
