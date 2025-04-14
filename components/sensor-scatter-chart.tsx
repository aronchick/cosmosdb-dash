"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import type { SensorReading } from "@/components/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Legend,
} from "recharts"

// Define the time window in milliseconds (e.g., 30 minutes)
const TIME_WINDOW_MS = 30 * 60 * 1000

export default function SensorScatterChart({ data }: { data: SensorReading[] }) {
  const [metric, setMetric] = useState<"temperature" | "humidity" | "pressure">("temperature")
  const [timeWindow, setTimeWindow] = useState<[number, number]>([Date.now() - TIME_WINDOW_MS, Date.now()])
  const animationFrameRef = useRef<number | null>(null)

  // Format data for scatter chart
  const chartData = useMemo(() => {
    return data.map((reading) => ({
      timestamp: new Date(reading.timestamp).getTime(), // Convert to timestamp for X-axis
      temperature: reading.temperature,
      humidity: reading.humidity,
      pressure: reading.pressure,
      sensorId: reading.sensorId,
      city: reading.city,
      formattedTime: new Date(reading.timestamp).toLocaleTimeString(),
      formattedDate: new Date(reading.timestamp).toLocaleDateString(),
    }))
  }, [data])

  // Filter data to only show points within the current time window
  const visibleData = useMemo(() => {
    const [startTime, endTime] = timeWindow
    return chartData.filter((point) => point.timestamp >= startTime && point.timestamp <= endTime)
  }, [chartData, timeWindow])

  // Update the time window to slide as time passes
  useEffect(() => {
    // Function to update the time window
    const updateTimeWindow = () => {
      const now = Date.now()
      setTimeWindow([now - TIME_WINDOW_MS, now])
      animationFrameRef.current = requestAnimationFrame(updateTimeWindow)
    }

    // Start the animation
    animationFrameRef.current = requestAnimationFrame(updateTimeWindow)

    // Clean up on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Get unit and label based on metric
  const getMetricInfo = (metric: string) => {
    switch (metric) {
      case "temperature":
        return { unit: "°F", label: "Temperature", range: [50, 90] }
      case "humidity":
        return { unit: "%", label: "Humidity", range: [0, 100] }
      case "pressure":
        return { unit: "hPa", label: "Pressure", range: [8, 16] }
      default:
        return { unit: "", label: "", range: [0, 100] }
    }
  }

  const { unit, label, range } = getMetricInfo(metric)

  // Custom tooltip component with enhanced information
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-gray-800 p-4 border border-gray-700 rounded-md shadow-lg text-white">
          <p className="text-lg font-bold mb-2">{`Sensor: ${data.sensorId}`}</p>
          <p className="text-md mb-1">{`City: ${data.city}`}</p>
          <p className="text-md mb-1">{`Date: ${data.formattedDate}`}</p>
          <p className="text-md mb-1">{`Time: ${data.formattedTime}`}</p>
          <p className="text-md mb-1 font-semibold text-xl">{`${label}: ${data[metric].toFixed(2)} ${unit}`}</p>
        </div>
      )
    }
    return null
  }

  // Generate a distinct color for each city - using a more vibrant color palette
  const cityColors: Record<string, string> = {
    Amsterdam: "#FF6384", // Bright pink
    Berlin: "#36A2EB", // Bright blue
    London: "#FFCE56", // Bright yellow
    "New York": "#4BC0C0", // Teal
    Tokyo: "#9966FF", // Purple
    Paris: "#FF9F40", // Orange
    Sydney: "#32CD32", // Lime green
    Dubai: "#FF5733", // Bright orange-red
    "San Francisco": "#8A2BE2", // Blue violet
    Singapore: "#00FFFF", // Cyan
    Default: "#FF00FF", // Magenta
  }

  // Group data by city for multiple scatter series
  const cityData = useMemo(() => {
    const cities = Array.from(new Set(data.map((reading) => reading.city)))
    return cities.map((city) => ({
      city,
      data: visibleData.filter((item) => item.city === city),
    }))
  }, [visibleData, data])

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-3xl">Sensor Data Scatter Plot</CardTitle>
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
        <div className="h-[600px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="timestamp"
                name="Time"
                type="number"
                domain={timeWindow}
                tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()}
                stroke="#fff"
                tick={{ fill: "#fff", fontSize: 16 }}
                label={{
                  value: "Time",
                  position: "insideBottomRight",
                  offset: -10,
                  fill: "#fff",
                  fontSize: 18,
                }}
              />
              <YAxis
                dataKey={metric}
                name={label}
                domain={range}
                stroke="#fff"
                tick={{ fill: "#fff", fontSize: 16 }}
                label={{
                  value: `${label} (${unit})`,
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#fff", fontSize: 18, textAnchor: "middle" },
                }}
              />
              <ZAxis range={[60, 60]} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
              <Legend formatter={(value) => <span style={{ color: "#fff", fontSize: "16px" }}>{value}</span>} />

              {cityData.map(({ city, data }) => (
                <Scatter
                  key={city}
                  name={city}
                  data={data}
                  fill={cityColors[city] || cityColors.Default}
                  shape="circle"
                  legendType="circle"
                  isAnimationActive={false} // Disable built-in animations for smoother sliding
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
