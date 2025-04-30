"use client"

import { useMemo, useState } from "react"
import type { SensorReading } from "@/components/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Table } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

const METRICS = [
  { key: "temperature", label: "Temperature", unit: "°F" },
  { key: "humidity", label: "Humidity", unit: "%" },
  { key: "pressure", label: "Pressure", unit: "hPa" },
  { key: "vibration", label: "Vibration", unit: "" },
  { key: "voltage", label: "Voltage", unit: "V" },
]

const metricColors: Record<string, string> = {
  temperature: "#32CD32",
  humidity: "#1E90FF",
  pressure: "#FFA500",
  vibration: "#FF69B4",
  voltage: "#FFFF00",
}

const TIME_WINDOW_MS = 20 * 60 * 1000

export default function SensorStats({ data }: { data: SensorReading[] }) {
  const [view, setView] = useState<"data" | "charts">("data")

  const now = Date.now()
  const start = now - TIME_WINDOW_MS

  const groupedByCity = useMemo(() => {
    const groups: Record<string, SensorReading[]> = {}
    data.forEach((reading) => {
      const ts = new Date(reading.timestamp).getTime()
      if (ts < start || ts > now) return

      if (!groups[reading.city]) groups[reading.city] = []
      groups[reading.city].push(reading)
    })
    return groups
  }, [data])

  const cityStats = useMemo(() => {
    return Object.entries(groupedByCity).map(([city, readings]) => {
      const avgTemp = readings.reduce((sum, r) => sum + r.temperature, 0) / readings.length
      const avgHumidity = readings.reduce((sum, r) => sum + r.humidity, 0) / readings.length
      const avgPressure = readings.reduce((sum, r) => sum + r.pressure, 0) / readings.length
      const uniqueSensors = new Set(readings.map((r) => r.sensorId))
      const latestTimestamp = new Date(
        Math.max(...readings.map((r) => new Date(r.timestamp).getTime()))
      ).toLocaleTimeString()

      return {
        city,
        sensorCount: uniqueSensors.size,
        readingCount: readings.length,
        latestTimestamp,
        avgTemp,
        avgHumidity,
        avgPressure,
      }
    })
  }, [groupedByCity])

  const averagedByCity = useMemo(() => {
    const grouped: Record<string, Record<number, SensorReading[]>> = {}

    data.forEach((reading) => {
      const ts = new Date(reading.timestamp).getTime()
      if (ts < start || ts > now) return

      const city = reading.city
      const secondBucket = Math.floor(ts / 1000)

      if (!grouped[city]) grouped[city] = {}
      if (!grouped[city][secondBucket]) grouped[city][secondBucket] = []
      grouped[city][secondBucket].push(reading)
    })

    const citySeries: Record<string, any[]> = {}
    Object.entries(grouped).forEach(([city, buckets]) => {
      const series = Object.entries(buckets)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([timestampSec, readings]) => {
          const entry: any = {
            timestamp: new Date(parseInt(timestampSec) * 1000).toISOString(),
          }
          METRICS.forEach(({ key }) => {
            const sum = readings.reduce((acc, r) => acc + (r as any)[key], 0)
            entry[key] = sum / readings.length
          })
          return entry
        })
      citySeries[city] = series
    })

    return citySeries
  }, [data])

  const sortedCities = useMemo(() => {
    return Object.keys(averagedByCity).sort((a, b) => a.localeCompare(b))
  }, [averagedByCity])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl">All Sensors</h2>
        <div className="space-x-2">
          <Button
            variant={view === "data" ? "default" : "outline"}
            onClick={() => setView("data")}
          >
            <Table className="w-5 h-5" />
          </Button>
          <Button
            variant={view === "charts" ? "default" : "outline"}
            onClick={() => setView("charts")}
          >
            <BarChart3 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {view === "data" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cityStats.map((stat) => (
            <Card key={stat.city} className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-3xl">{stat.city}</CardTitle>
                <p className="text-xl text-gray-400">
                  {stat.sensorCount} sensors • {stat.readingCount} readings
                </p>
                <p className="text-md text-gray-400">Last update: {stat.latestTimestamp}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg">
                    <h3 className="text-2xl font-bold mb-2">Temp</h3>
                    <p className="text-3xl">{stat.avgTemp.toFixed(1)}°F</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg">
                    <h3 className="text-2xl font-bold mb-2">Humidity</h3>
                    <p className="text-3xl">{stat.avgHumidity.toFixed(1)}%</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg">
                    <h3 className="text-2xl font-bold mb-2">Pressure</h3>
                    <p className="text-3xl">{stat.avgPressure.toFixed(1)} hPa</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div>
          {sortedCities.map((city) => {
            const series = averagedByCity[city]
            return (
              <div key={city} className="mb-10">
                <h3 className="text-2xl font-bold mb-4">{city}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {METRICS.map(({ key, label, unit }) => (
                    <Card key={key} className="bg-gray-900 border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold">
                          {label} ({unit})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={series}>
                            <Line
                              type="monotone"
                              dataKey={key}
                              stroke={metricColors[key]}
                              strokeWidth={2}
                              dot={false}
                            />
                            <XAxis dataKey="timestamp" hide />
                            <YAxis domain={["auto", "auto"]} />
                            <Tooltip
                              contentStyle={{ backgroundColor: "#1f2937", border: "none" }}
                              labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                              formatter={(value: number) => [`${value.toFixed(2)} ${unit}`, label]}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
