"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import Plotly from "plotly.js-dist-min"
import type { SensorReading } from "@/components/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const TWO_MINUTES_MS = 2 * 60 * 1000

export default function SensorThroughput({ data }: { data: SensorReading[] }) {
  const [divisionToggleTime, setDivisionToggleTime] = useState<number | null>(null)
  const chartRef = useRef<HTMLDivElement | null>(null)

  const groupedData = useMemo(() => {
    const now = Date.now()
    const cutoff = now - TWO_MINUTES_MS

    const grouped: Record<string, SensorReading[]> = {}

    data.forEach((reading) => {
      const timestamp = new Date(reading.timestamp).getTime()
      if (timestamp < cutoff || timestamp > now) return

      const city = reading.city
      if (!grouped[city]) grouped[city] = []
      grouped[city].push(reading)
    })

    return grouped
  }, [data])

  const calculateByteSize = (reading: SensorReading) => {
    return new Blob([JSON.stringify(reading)]).size
  }

  const generateThroughput = (readings: SensorReading[], divideAfter?: number) => {
    const buckets: Record<string, SensorReading[]> = {}

    readings.forEach((entry) => {
      const time = new Date(entry.timestamp)
      const timeKey = Math.floor(time.getTime() / 1000).toString()
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
    return Object.values(groupedData)
      .flat()
      .reduce((sum, reading) => sum + calculateByteSize(reading) / 1024, 0)
  }, [groupedData])

  const handleToggleDivision = () => {
    const now = Math.floor(Date.now() / 1000)
    setDivisionToggleTime(prev => (prev ? null : now))
  }

  const isDivisionActive = !!divisionToggleTime
  const adjustedMb = isDivisionActive ? (totalKb / 1000) / 60 : totalKb / 1000

  useEffect(() => {
    if (!chartRef.current) return

    const now = Date.now()
    const twoMinutesAgo = now - TWO_MINUTES_MS

    const allSeries = Object.entries(groupedData).map(([city, readings]) => {
      const points = generateThroughput(readings, divisionToggleTime)
        .filter(point => {
          const ts = parseInt(point.timestamp) * 1000
          return ts >= twoMinutesAgo && ts <= now
        })

      return {
        type: "scattergl",
        mode: "lines",
        name: city,
        x: points.map(p => new Date(parseInt(p.timestamp) * 1000)),
        y: points.map(p => p.kbps),
        line: {
          width: 2,
          shape: "spline",
          smoothing: 1.3
        },
      }
    })

    Plotly.react(chartRef.current, allSeries, {
      title: {
        text: "City Throughput (KB/s)",
        font: { color: "#ffffff", size: 20 },
      },
      xaxis: {
        title: "Time",
        type: "date",
        range: [new Date(twoMinutesAgo), new Date(now)],
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
    }, { responsive: true, displayModeBar: false })
  }, [groupedData, divisionToggleTime])

  return (
    <div>
      <h2
        className="text-3xl mb-6 cursor-pointer hover:text-blue-400"
        onClick={handleToggleDivision}
        title="Click to toggle divide-by-60 mode"
      >
        Sensor Throughput
        <br />
        <span className="text-2xl font-bold ml-2">
          ({adjustedMb.toFixed(2)} MB Generated)
        </span>
      </h2>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl">City Throughput (Last 2 minutes)</CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={chartRef} className="w-full h-[500px]" />
        </CardContent>
      </Card>
    </div>
  )
}
