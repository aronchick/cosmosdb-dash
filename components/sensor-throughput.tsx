"use client"

import { useMemo } from "react"
import type { SensorReading } from "@/components/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const FIVE_MIN_MS = 5 * 60 * 1000

export default function SensorThroughput({ data }: { data: SensorReading[] }) {
  const groupedData = useMemo(() => {
    const now = new Date()
    now.setSeconds(0, 0) // Snap to start of current minute
    const cutoff = now.getTime() - FIVE_MIN_MS

    const grouped: Record<string, Record<string, SensorReading[]>> = {}

    data.forEach((reading) => {
      const timestamp = new Date(reading.timestamp).getTime()
      if (timestamp < cutoff || timestamp >= now.getTime()) return

      const city = reading.city
      const sensor = reading.sensorId

      if (!grouped[city]) grouped[city] = {}
      if (!grouped[city][sensor]) grouped[city][sensor] = []
      grouped[city][sensor].push(reading)
    })

    return grouped
  }, [data])

  const calculateByteSize = (reading: SensorReading) => {
    const recordSize = new Blob([JSON.stringify(reading)]).size;
    return recordSize
  }

  const getThroughputSeries = (readings: SensorReading[]) => {
    const countBuckets: Record<string, number> = {}
    const byteBuckets: Record<string, number> = {}

    readings.forEach((r) => {
      const time = new Date(r.timestamp)
      time.setSeconds(0, 0) // Bucket per minute
      const bucket = time.toISOString()

      countBuckets[bucket] = (countBuckets[bucket] || 0) + 1
      byteBuckets[bucket] = (byteBuckets[bucket] || 0) + calculateByteSize(r)
    });

    const timestamps = Object.keys(countBuckets).sort()
    return timestamps.map((timestamp) => ({
      timestamp,
      count: countBuckets[timestamp],
      kbps: +(byteBuckets[timestamp] / 60 / 1024).toFixed(2), // KB per second
    }))
  }

  return (
    <div>
      <h2 className="text-3xl mb-4">Sensor Throughput (Prev. 5 Minutes)</h2>
      {Object.entries(groupedData).map(([city, sensors]) => {
        // Aggregate total KB/s across all sensors in the city
        const totalKbps = Object.values(sensors)
          .flatMap((readings) => getThroughputSeries(readings))
          .reduce((sum, point) => sum + point.kbps, 0)

        return (
          <div key={city} className="mb-10">
            <h3 className="text-2xl font-bold mb-4">
              {city}{" "}
              <span className="text-gray-400 text-lg font-normal">
                ({totalKbps.toFixed(2)} KB/s)
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Object.entries(sensors).map(([sensorId, readings]) => {
                const series = getThroughputSeries(readings)
                const latest = new Date(
                  Math.max(...readings.map((r) => new Date(r.timestamp).getTime()))
                ).toLocaleTimeString()

                return (
                  <Card key={sensorId} className="bg-gray-900 border-gray-800 pb-5">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold">{sensorId}</CardTitle>
                      <p className="text-sm text-gray-400">Last update: {latest}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-24">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={series}>
                              <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#4FD1C5"
                                strokeWidth={2}
                                dot={false}
                              />
                              <XAxis dataKey="timestamp" hide />
                              <YAxis hide />
                              <Tooltip
                                contentStyle={{ backgroundColor: "#1f2937", border: "none" }}
                                labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                          <p className="text-center text-sm text-gray-400 mt-1">Items per second</p>
                        </div>

                        <div className="h-24">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={series}>
                              <Line
                                type="monotone"
                                dataKey="kbps"
                                stroke="#FBBF24"
                                strokeWidth={2}
                                dot={false}
                              />
                              <XAxis dataKey="timestamp" hide />
                              <YAxis hide />
                              <Tooltip
                                contentStyle={{ backgroundColor: "#1f2937", border: "none" }}
                                labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                                formatter={(value: number) => [`${value.toFixed(2)} KB/s`, "Rate"]}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                          <p className="text-center text-sm text-gray-400 mt-1">KB/s</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
