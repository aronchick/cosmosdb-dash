"use client"

import { useState, useMemo } from "react"
import type { SensorReading } from "@/components/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart } from "recharts"

export default function SensorChart({ data }: { data: SensorReading[] }) {
  const [metric, setMetric] = useState<"temperature" | "humidity" | "pressure">("temperature")

  // For thousands of sensors, we need to be selective about which ones to display
  // Let's show the top 10 sensors with the most recent data
  const topSensors = useMemo(() => {
    const sensorMap = new Map<string, Date>()

    // Find the most recent timestamp for each sensor
    data.forEach((reading) => {
      const timestamp = new Date(reading.timestamp)
      const existingTimestamp = sensorMap.get(reading.sensorId)

      if (!existingTimestamp || timestamp > existingTimestamp) {
        sensorMap.set(reading.sensorId, timestamp)
      }
    })

    // Sort sensors by recency and take the top 10
    return Array.from(sensorMap.entries())
      .sort((a, b) => b[1].getTime() - a[1].getTime())
      .slice(0, 10)
      .map(([sensorId]) => sensorId)
  }, [data])

  // Format data for charts - only include the top sensors
  const chartData = useMemo(() => {
    return data
      .filter((reading) => topSensors.includes(reading.sensorId))
      .map((reading) => ({
        timestamp: new Date(reading.timestamp).toLocaleTimeString(),
        temperature: reading.temperature,
        humidity: reading.humidity,
        pressure: reading.pressure,
        sensorId: reading.sensorId,
      }))
  }, [data, topSensors])

  // Generate a color for each sensor
  const sensorColors: Record<string, string> = {}
  const colorPalette = [
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
    "#4BC0C0",
    "#9966FF",
    "#FF9F40",
    "#FF8A80",
    "#82B1FF",
    "#B39DDB",
    "#CCFF90",
    "#FFFF8D",
    "#EA80FC",
  ]

  topSensors.forEach((sensorId, index) => {
    sensorColors[sensorId] = colorPalette[index % colorPalette.length]
  })

  // Get unit and label based on metric
  const getMetricInfo = (metric: string) => {
    switch (metric) {
      case "temperature":
        return { unit: "°F", label: "Temperature" }
      case "humidity":
        return { unit: "%", label: "Humidity" }
      case "pressure":
        return { unit: "hPa", label: "Pressure" }
      default:
        return { unit: "", label: "" }
    }
  }

  const { unit, label } = getMetricInfo(metric)

  // Format the tooltip value
  const formatTooltipValue = (value: number) => {
    return `${value.toFixed(2)} ${unit}`
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-3xl">Real-Time Sensor Data (Top 10 Sensors)</CardTitle>
        <Tabs
          value={metric}
          onValueChange={(value) => setMetric(value as "temperature" | "humidity" | "pressure")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 h-14 text-xl">
            <TabsTrigger value="temperature">Temperature</TabsTrigger>
            <TabsTrigger value="humidity">Humidity</TabsTrigger>
            <TabsTrigger value="pressure">Pressure</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="timestamp"
                stroke="#fff"
                tick={{ fill: "#fff", fontSize: 16 }}
                tickMargin={10}
                type="category"
                allowDuplicatedCategory={false}
              />
              <YAxis
                stroke="#fff"
                tick={{ fill: "#fff", fontSize: 16 }}
                tickMargin={10}
                label={{
                  value: `${label} (${unit})`,
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#fff", fontSize: 18, textAnchor: "middle" },
                }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#222", border: "none", fontSize: 16 }}
                labelStyle={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}
                formatter={(value: number) => [formatTooltipValue(value), label]}
              />
              {topSensors.map((sensorId) => {
                const sensorData = chartData.filter((item) => item.sensorId === sensorId)

                // Only render if we have data for this sensor
                if (sensorData.length === 0) return null

                return (
                  <Line
                    key={sensorId}
                    type="monotone"
                    dataKey={metric}
                    data={sensorData}
                    name={`Sensor ${sensorId}`}
                    stroke={sensorColors[sensorId]}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 8 }}
                    isAnimationActive={false}
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
