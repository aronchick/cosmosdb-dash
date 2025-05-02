"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import Plotly from "plotly.js-dist-min"
import type { SensorReading } from "@/components/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const TWO_MINUTES_MS = 2 * 60 * 1000
const MIN_BUCKET_AGE_MS = 7 * 1000
const MBS_VARIANCE = 1

function parseTimestampToMs(timestamp: string): number {
  const hasTimezone = timestamp.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(timestamp)
  return new Date(hasTimezone ? timestamp : `${timestamp}Z`).getTime()
}

export default function SensorThroughput({ data, activeView }: { data: SensorReading[], activeView: any }) {
  if (activeView !== "throughput") return null

  const [divisionToggleTime, setDivisionToggleTime] = useState<number | null>(null)
  const chartRef = useRef<HTMLDivElement | null>(null)

  const now = Date.now()
  const windowStart = now - TWO_MINUTES_MS
  const windowEnd = now - MIN_BUCKET_AGE_MS

  const filteredReadings = useMemo(() => {
    return data.filter((reading) => {
      const ts = parseTimestampToMs(reading.timestamp)
      return ts >= windowStart && ts <= windowEnd
    })
  }, [data])

  const groupedByCity = useMemo(() => {
    const groups: Record<string, SensorReading[]> = {}
    for (const reading of filteredReadings) {
      if (!groups[reading.city]) {
        groups[reading.city] = []
      }
      groups[reading.city].push(reading)
    }
    return groups
  }, [filteredReadings])

  const generateFakeThroughput = (
    readings: SensorReading[],
    divideAfter?: number
  ) => {
    const buckets: Record<string, SensorReading[]> = {}

    for (const entry of readings) {
      const timeMs = parseTimestampToMs(entry.timestamp)
      const bucketTime = Math.floor(timeMs / 1000)
      const key = bucketTime.toString()
      if (!buckets[key]) {
        buckets[key] = []
      }
      buckets[key].push(entry)
    }

    const timestamps = Object.keys(buckets)
      .map(Number)
      .filter((ts) => ts * 1000 <= windowEnd)
      .sort((a, b) => a - b)

    return timestamps.map((ts) => {
      const base = 100 + (Math.random() * MBS_VARIANCE - Math.random() * MBS_VARIANCE)
      const divided = divideAfter && ts >= divideAfter
      return {
        timestamp: ts,
        kbps: divided ? (base * 1024) / 2 : base * 1024,
      }
    })
  }

  const handleToggleDivision = () => {
    const now = Math.floor(Date.now() / 1000)
    setDivisionToggleTime((prev) => (prev ? null : now))
  }

  const getCityMultiplier = (city: string) => {
    const hash = [...city].reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const seed = (hash % 100) / 100
    return 0.95 + seed * 0.1
  }

  const isDivisionActive = divisionToggleTime !== null

  const throughputSeries = useMemo(() => {
    return generateFakeThroughput(filteredReadings, divisionToggleTime)
  }, [filteredReadings, divisionToggleTime])

  const adjustedMb = useMemo(() => {
    const totalKb = throughputSeries.reduce((sum, p) => sum + p.kbps, 0)
    return isDivisionActive ? totalKb / 1024 / 60 : totalKb / 1024
  }, [throughputSeries, isDivisionActive])

  const totalMbForWindow = (windowMs: number) => {
    const cutoff = Date.now() - windowMs
    const points = throughputSeries.filter((p) => p.timestamp * 1000 >= cutoff)
    const totalKb = points.reduce((sum, p) => sum + p.kbps, 0)
    return totalKb / 1024
  }

  useEffect(() => {
    if (!chartRef.current) return

    const trace = {
      type: "scattergl",
      mode: "lines",
      name: "MB/s",
      x: throughputSeries.map((p) => new Date(p.timestamp * 1000)),
      y: throughputSeries.map((p) => (p.kbps / 1024) + 10),
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
          text: "City Throughput (MB/s)",
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
          title: "MB/s",
          showgrid: true,
          gridcolor: "#333",
          color: "#ffffff",
          range: [20, 120],
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
  }, [throughputSeries])

  return (
    <div>
      <h2 className="text-3xl mb-6">
        Sensor Throughput
        <br />
        <span className="text-2xl font-bold">
          ({adjustedMb.toFixed(2)} MB Generated)
        </span>
      </h2>

      <Card className="bg-gray-900 border-gray-800 mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">City Throughput (Last 2 minutes)</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleDivision}
            className="opacity-50 h-8 w-8 px-2 py-1 bg-gray-800 border-gray-700 hover:bg-gray-700"
            title="Toggle divide-by-60 mode"
          />
        </CardHeader>
        <CardContent>
          <div ref={chartRef} className="w-full h-[500px]" />
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl">City MB/s Averages</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left table-auto">
            <thead>
              <tr className="text-gray-300 text-lg border-b border-gray-700">
                <th className="p-2">City</th>
                <th className="p-2">Avg MB/s (30s)</th>
                <th className="p-2">Avg MB/s (60s)</th>
                <th className="p-2">Avg MB/s (5min)</th>
                <th className="p-2">Avg MB/s (30min)</th>
                <th className="p-2">Total MB (30min)</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedByCity).sort((a, b) => a.localeCompare(b)).map((city) => {
                const multiplier = getCityMultiplier(city)

                const avg30s = (totalMbForWindow(30_000) / 30) * multiplier
                const avg60s = (totalMbForWindow(60_000) / 60) * multiplier
                const avg5min = (totalMbForWindow(5 * 60_000) / (5 * 60)) * multiplier
                const avg30min = (totalMbForWindow(30 * 60_000) / (30 * 60)) * multiplier
                const totalMb30min = (totalMbForWindow(30 * 60_000)) * multiplier

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
