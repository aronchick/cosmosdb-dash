"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import Plotly from "plotly.js-dist-min"
import type { SensorReading } from "@/components/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const TWO_MINUTES_MS = 2 * 60 * 1000
const MIN_BUCKET_AGE_MS = 7 * 1000 // 7 seconds buffer to avoid plotting incomplete buckets

export default function SensorThroughput({ data, activeView }: { data: SensorReading[], activeView: any }) {

  if(activeView !== "throughput") {
    return
  }
  
  const [divisionToggleTime, setDivisionToggleTime] = useState<number | null>(null)
  const chartRef = useRef<HTMLDivElement | null>(null)

  const now = Date.now()
  const windowStart = now - TWO_MINUTES_MS
  const windowEnd = now - MIN_BUCKET_AGE_MS

  const filteredReadings = useMemo(() => {
    return data.filter((reading) => {
      const ts = Date.parse(reading.timestamp)
      return ts >= windowStart && ts <= windowEnd
    })
  }, [data])

  const groupedByCity = useMemo(() => {
    const groups: Record<string, SensorReading[]> = {}
    for (const reading of filteredReadings) {
      if (!groups[reading.city]) groups[reading.city] = []
      groups[reading.city].push(reading)
    }
    return groups
  }, [filteredReadings])

  const calculateByteSize = (reading: SensorReading) => {
    return new Blob([JSON.stringify(reading)]).size
  }

  const generateThroughput = (
    readings: SensorReading[],
    divideAfter?: number
  ) => {
    const buckets: Record<string, SensorReading[]> = {}

    readings.forEach((entry) => {
      const timeMs = Date.parse(entry.timestamp)
      const bucketTime = Math.floor(timeMs / 1000)
      const key = bucketTime.toString()
      if (!buckets[key]) buckets[key] = []
      buckets[key].push(entry)
    })

    const timestamps = Object.keys(buckets)
      .map(Number)
      .filter((ts) => ts * 1000 <= windowEnd)
      .sort((a, b) => a - b)

    return timestamps.map((ts) => {
      const bucket = buckets[ts.toString()]
      const kbps =
        bucket.reduce((sum, r) => sum + calculateByteSize(r), 0) / 1024
      const divided = divideAfter && ts >= divideAfter
      return {
        timestamp: ts,
        kbps: divided ? kbps / 60 : kbps,
      }
    })
  }

  const handleToggleDivision = () => {
    const now = Math.floor(Date.now() / 1000)
    setDivisionToggleTime((prev) => (prev ? null : now))
  }

  const isDivisionActive = !!divisionToggleTime

  const totalKb = useMemo(() => {
    return filteredReadings.reduce(
      (sum, r) => sum + calculateByteSize(r) / 1024,
      0
    )
  }, [filteredReadings])

  const adjustedMb = isDivisionActive
    ? totalKb / 1000 / 60
    : totalKb / 1000

  const calculateAverageKbps = (readings: SensorReading[], windowMs: number) => {
    const cutoff = Date.now() - windowMs
    const selected = readings.filter((r) => {
      const ts = Date.parse(r.timestamp)
      return ts >= cutoff && ts <= Date.now()
    })
    const totalKb = selected.reduce((sum, r) => sum + calculateByteSize(r) / 1024, 0)
    return windowMs > 0 ? totalKb / (windowMs / 1000) : 0
  }

  useEffect(() => {
    if (!chartRef.current) return

    const throughputSeries = generateThroughput(filteredReadings, divisionToggleTime)

    const trace = {
      type: "scattergl",
      mode: "lines",
      name: "Total KB/s",
      x: throughputSeries.map((p) => new Date(p.timestamp * 1000)),
      y: throughputSeries.map((p) => p.kbps),
      line: {
        width: 2,
        shape: "spline",
        smoothing: 0.1,
        color: "#4FD1C5",
      },
    }

    Plotly.react(
      chartRef.current,
      [trace],
      {
        title: {
          text: "City Throughput (KB/s)",
          font: { color: "#ffffff", size: 20 },
        },
        xaxis: {
          title: "Time",
          type: "date",
          range: [new Date(windowStart), new Date(windowEnd)],
          showgrid: false,
          tickformat: "%H:%M:%S",
          color: "#ffffff",
        },
        yaxis: {
          title: "KB/s",
          showgrid: true,
          gridcolor: "#333",
          color: "#ffffff",
        },
        plot_bgcolor: "transparent",
        paper_bgcolor: "transparent",
        font: { color: "#ffffff" },
        margin: { t: 40, b: 40, l: 50, r: 30 },
        hovermode: "closest",
        legend: {
          orientation: "h",
          x: 0.5,
          xanchor: "center",
          y: -0.2,
          font: { size: 12, color: "#ffffff" },
        },
      },
      { responsive: true, displayModeBar: false }
    )
  }, [filteredReadings, divisionToggleTime])

  return (
    <div>
      <h2
        className="text-3xl mb-6"
        onClick={handleToggleDivision}
        title="Click to toggle divide-by-60 mode"
      >
        Sensor Throughput
        <br />
        <span className="text-2xl font-bold">
          ({adjustedMb.toFixed(2)} MB Generated)
        </span>
      </h2>

      <Card className="bg-gray-900 border-gray-800 mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">City Throughput (Last 2 minutes)</CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={chartRef} className="w-full h-[500px]" />
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl">City KB/s Averages</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left table-auto">
            <thead>
              <tr className="text-gray-300 text-lg border-b border-gray-700">
                <th className="p-2">City</th>
                <th className="p-2">Avg KB/s (30s)</th>
                <th className="p-2">Avg KB/s (60s)</th>
                <th className="p-2">Avg KB/s (5min)</th>
                <th className="p-2">Avg KB/s (30min)</th>
                <th className="p-2">Total MB (30min)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedByCity).map(([city, readings]) => {
                const avg30s = calculateAverageKbps(readings, 30_000)
                const avg60s = calculateAverageKbps(readings, 60_000)
                const avg5min = calculateAverageKbps(readings, 5 * 60_000)
                const avg30min = calculateAverageKbps(readings, 30 * 60_000)

                const totalMb30min = (() => {
                  const cutoff = Date.now() - 30 * 60_000
                  const selected = readings.filter((r) => {
                    const ts = Date.parse(r.timestamp)
                    return ts >= cutoff && ts <= Date.now()
                  })
                  const totalKb = selected.reduce((sum, r) => sum + calculateByteSize(r) / 1024, 0)
                  return totalKb / 1000
                })()

                return (
                  <tr key={city} className="border-b border-gray-800">
                    <td className="p-2 font-bold">{city}</td>
                    <td className="p-2">{avg30s.toFixed(2)}</td>
                    <td className="p-2">{avg60s.toFixed(2)}</td>
                    <td className="p-2">{avg5min.toFixed(2)}</td>
                    <td className="p-2">{avg30min.toFixed(2)}</td>
                    <td className="p-2">{totalMb30min.toFixed(2)} MB</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
