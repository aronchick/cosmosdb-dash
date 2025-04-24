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
    const recordSize = new Blob([JSON.stringify(reading)]).size
    return recordSize
  }

  function formatUnixTime(unixTime: any) {
    const date = new Date(unixTime * 1000)
    const hours = date.getHours()
    const minutes = "0" + date.getMinutes()
    const seconds = "0" + date.getSeconds()
    return hours + ":" + minutes.substr(-2) + ":" + seconds.substr(-2)
  }

  function generateAltThroughput(readings: SensorReading[]) {
    const buckets: any = {}
    readings.forEach((entry) => {
      const time = new Date(entry.timestamp)
      const timeKey = (time.getTime() / 1000 | 0).toString()

      if ((time.getTime() / 1000) < ((time.getTime() / 1000) - 300)) return

      if (!buckets[timeKey]) {
        buckets[timeKey] = []
      }

      buckets[timeKey].push(entry)
    })

    const timestamps = Object.keys(buckets).sort()
    return timestamps.map((timestamp) => ({
      timestamp,
      count: buckets[timestamp].length,
      kbps: calculateByteSize(buckets[timestamp]) / 1024
    }))
  }

  const totalKb = useMemo(() => {
    return Object.values(groupedData)
      .flatMap((sensors) => Object.values(sensors))
      .flatMap((readings) => generateAltThroughput(readings))
      .reduce((sum, point) => sum + point.kbps, 0) * 5 * 60 // convert KB/s to total KB over 5 minutes
  }, [groupedData])

  return (
    <div>
      <h2 className="text-3xl mb-4">
        Sensor Throughput (Prev. 5 Minutes)
        <span className="text-lg text-gray-400 font-normal ml-2">
          ({(totalKb / 1000).toFixed(2)} MB)
        </span>
      </h2>
      {Object.entries(groupedData).map(([city, sensors]) => {
        const totalKbps = Object.values(sensors)
          .flatMap((readings) => generateAltThroughput(readings))
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
                const series = generateAltThroughput(readings)
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
                                labelFormatter={(value) => formatUnixTime(value)}
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
                                labelFormatter={(value) => formatUnixTime(value)}
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
