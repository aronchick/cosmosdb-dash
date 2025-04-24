"use client"

import { useMemo, useState } from "react"
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
  // Initially null means division is off
  const [divisionToggleTime, setDivisionToggleTime] = useState<number | null>(null)

  const groupedData = useMemo(() => {
    const now = new Date()
    now.setSeconds(0, 0)
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
    return new Blob([JSON.stringify(reading)]).size
  }

  function formatUnixTime(unixTime: any) {
    const date = new Date(unixTime * 1000)
    const hours = date.getHours()
    const minutes = "0" + date.getMinutes()
    const seconds = "0" + date.getSeconds()
    return hours + ":" + minutes.substr(-2) + ":" + seconds.substr(-2)
  }

  function generateAltThroughput(readings: SensorReading[], divideAfter?: number) {
    const buckets: any = {}

    readings.forEach((entry) => {
      const time = new Date(entry.timestamp)
      const timeKey = (time.getTime() / 1000 | 0).toString()
      if (!buckets[timeKey]) buckets[timeKey] = []
      buckets[timeKey].push(entry)
    })

    const timestamps = Object.keys(buckets).sort()

    return timestamps.map((timestamp) => {
      const time = parseInt(timestamp)
      const count = buckets[timestamp].length
      const kbps = calculateByteSize(buckets[timestamp]) / 1024

      const divided = divideAfter && time >= divideAfter
      return {
        timestamp,
        count: divided ? count / 60 : count,
        kbps: divided ? kbps / 60 : kbps,
      }
    })
  }

  const totalKb = useMemo(() => {
    return Object.entries(groupedData).flatMap(([city, sensors]) =>
      Object.values(sensors).flatMap((readings) =>
        generateAltThroughput(readings, divisionToggleTime)
      )
    ).reduce((sum, point) => sum + point.kbps, 0) * 5 * 60
  }, [groupedData, divisionToggleTime])

  const handleToggleDivision = () => {
    const now = Math.floor(Date.now() / 1000)
    setDivisionToggleTime((prev) => (prev ? null : now))
  }

  const isDivisionActive = !!divisionToggleTime
  const adjustedMb = isDivisionActive ? (totalKb / 1000) / 60 : totalKb / 1000

  return (
    <div>
      <h2
        className="text-3xl mb-4"
        onClick={handleToggleDivision}
        title="Click to toggle divide-by-60 mode for all cities"
      >
        Sensor Throughput<br/>
        <span className="text-2xl text-white-800 font-bold">
          ({adjustedMb.toFixed(2)} MB Generated)
        </span>
      </h2>

      {Object.entries(groupedData).map(([city, sensors]) => {
        const totalKbps = Object.values(sensors)
          .flatMap((readings) => generateAltThroughput(readings, divisionToggleTime))
          .reduce((sum, point) => sum + point.kbps, 0)

        return (
          <div key={city} className="mb-10">
            <h3 className="text-2xl font-bold mb-4">
              {city}<br/>
              <span className="text-white-600 text-lg font-normal">
                ({totalKbps.toFixed(2)} KB/s)
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Object.entries(sensors).map(([sensorId, readings]) => {
                const series = generateAltThroughput(readings, divisionToggleTime)
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
