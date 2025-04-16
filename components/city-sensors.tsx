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
  { key: "temperature", label: "Temp", unit: "°F" },
  { key: "humidity", label: "Humidity", unit: "%" },
  { key: "pressure", label: "Pressure", unit: "hPa" },
  { key: "vibration", label: "Vibration", unit: "" },
  { key: "voltage", label: "Voltage", unit: "V" },
];

const metricColors: Record<string, string> = {
    temperature: "#32CD32", // Green
    humidity: "#1E90FF",    // Blue
    pressure: "#FFA500",    // Orange
    vibration: "#FF69B4",   // Pink
    voltage: "#FFFF00",     // Yellow
};

const TIME_WINDOW_MS = 20 * 60 * 1000 // 20 minutes

export default function CitySensors({ data }: { data: SensorReading[] }) {
  const groupedByCity = useMemo(() => {
    const now = Date.now()
    const windowStart = now - TIME_WINDOW_MS

    const grouped: Record<string, Record<string, SensorReading[]>> = {}
    data.forEach((reading) => {
      const timestamp = new Date(reading.timestamp).getTime()
      if (timestamp < windowStart) return

      const city = reading.city
      const sensor = reading.sensorId
      if (!grouped[city]) grouped[city] = {}
      if (!grouped[city][sensor]) grouped[city][sensor] = []
      grouped[city][sensor].push(reading)
    })

    return grouped
  }, [data])

  return (
    <div>
      <h2 className="text-3xl mb-4">Sensor Readings Per City</h2>
      {Object.entries(groupedByCity).map(([city, sensors]) => (
        <div key={city} className="mb-10">
          <h3 className="text-2xl font-bold mb-4">{city}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Object.entries(sensors).map(([sensorId, readings]) => {
              const latestTimestamp = new Date(
                Math.max(...readings.map((r) => new Date(r.timestamp).getTime()))
              ).toLocaleTimeString()

              return (
                <Card key={sensorId} className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">{sensorId}</CardTitle>
                    <p className="text-sm text-gray-400">Last update: {latestTimestamp}</p>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    {METRICS.map((metric) => (
                      <div key={metric.key} className="p-2 bg-gray-800 rounded-lg">
                        <p className="text-md text-center text-gray-300 mb-1">
                          {metric.label} ({metric.unit})
                        </p>
                        <div className="h-16">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={readings}>
                              <Line
                                type="monotone"
                                dataKey={metric.key}
                                stroke={metricColors[metric.key] || "#4FD1C5"}
                                dot={false}
                                strokeWidth={2}
                              />
                              <XAxis dataKey="timestamp" hide />
                              <YAxis hide domain={["auto", "auto"]} />
                              <Tooltip
                                contentStyle={{ backgroundColor: "#1f2937", border: "none" }}
                                labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
