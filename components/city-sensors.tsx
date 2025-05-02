"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

interface SensorReading {
  sensorId: string
  city: string
  timestamp: string
  temperature: number
  humidity: number
  pressure: number
  vibration: number
  voltage: number
}

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

const TIME_WINDOW_MS = 20 * 60 * 1000 // 20 minutes

export default function CitySensors({ data }: { data: SensorReading[] }) {
  const now = Date.now()
  const start = now - TIME_WINDOW_MS

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
      <h2 className="text-3xl mb-6">Average Sensor Metrics Per City</h2>
      {sortedCities.map((city) => {
        const series = averagedByCity[city]

        return (
          <div key={city} className="mb-10">
            <h3 className="text-2xl font-bold mb-4">{city}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
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
                        <YAxis domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#1f2937", border: "none" }}
                          labelFormatter={(value) =>
                            new Date(value).toLocaleTimeString()
                          }
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
  )
}
