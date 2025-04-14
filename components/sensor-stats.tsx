"use client"

import { useMemo } from "react"
import type { SensorReading } from "@/components/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SensorStats({ data }: { data: SensorReading[] }) {
  // Calculate statistics by city
  const cityStats = useMemo(() => {
    if (data.length === 0) return []

    // Group by city
    const cityGroups: Record<string, SensorReading[]> = {}
    data.forEach((reading) => {
      if (!cityGroups[reading.city]) {
        cityGroups[reading.city] = []
      }
      cityGroups[reading.city].push(reading)
    })

    // Calculate stats for each city
    return Object.entries(cityGroups).map(([city, readings]) => {
      // Calculate average values
      const avgTemp = readings.reduce((sum, r) => sum + r.temperature, 0) / readings.length
      const avgHumidity = readings.reduce((sum, r) => sum + r.humidity, 0) / readings.length
      const avgPressure = readings.reduce((sum, r) => sum + r.pressure, 0) / readings.length

      // Count unique sensors
      const uniqueSensors = new Set(readings.map((r) => r.sensorId))

      // Get latest reading time
      const latestTimestamp = new Date(
        Math.max(...readings.map((r) => new Date(r.timestamp).getTime())),
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
  }, [data])

  if (cityStats.length === 0) {
    return <div className="text-2xl text-center">No data available</div>
  }

  return (
    <div>
      <h2 className="text-3xl mb-4">Statistics by City</h2>
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
                  <p className="text-3xl">{stat.avgPressure.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
