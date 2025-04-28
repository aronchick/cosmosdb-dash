"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import Plotly from "plotly.js-dist-min"
import type { SensorReading } from "@/components/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const FIVE_MIN_MS = 5 * 60 * 1000

export default function SensorThroughput({ data }: { data: SensorReading[] }) {
  const [divisionToggleTime, setDivisionToggleTime] = useState<number | null>(null)
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({})

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

  const calculateByteSize = (reading: any) => {
    return new Blob([JSON.stringify(reading)]).size
  }

  function formatUnixTime(unixTime: number) {
    const date = new Date(unixTime * 1000)
    const hours = date.getHours()
    const minutes = "0" + date.getMinutes()
    const seconds = "0" + date.getSeconds()
    return hours + ":" + minutes.substr(-2) + ":" + seconds.substr(-2)
  }

  function generateAltThroughput(readings: any[], divideAfter?: any) {
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
    return Object.entries(groupedData)
      .flatMap(([city, sensors]) =>
        Object.values(sensors).flatMap((readings) =>
          generateAltThroughput(readings, divisionToggleTime)
        )
      )
      .reduce((sum, point) => sum + point.kbps, 0) * 5 * 60
  }, [groupedData, divisionToggleTime])

  const handleToggleDivision = () => {
    const now = Math.floor(Date.now() / 1000)
    setDivisionToggleTime((prev) => (prev ? null : now))
  }

  const isDivisionActive = !!divisionToggleTime
  const adjustedMb = isDivisionActive ? (totalKb / 1000) / 60 : totalKb / 1000

  useEffect(() => {
    Object.entries(groupedData).forEach(([city, sensors]) => {
      Object.entries(sensors).forEach(([sensorId, readings]) => {
        const series = generateAltThroughput(readings, divisionToggleTime)

        const countTrace: any = {
          type: "scattergl",
          mode: "lines",
          name: "Count/sec",
          x: series.map((point) => new Date(parseInt(point.timestamp) * 1000)),
          y: series.map((point) => point.count),
          line: { color: "#4FD1C5" },
        }

        const kbpsTrace: any = {
          type: "scattergl",
          mode: "lines",
          name: "KB/sec",
          x: series.map((point) => new Date(parseInt(point.timestamp) * 1000)),
          y: series.map((point) => point.kbps),
          line: { color: "#FBBF24" },
        }

        const layout: Partial<Plotly.Layout> = {
          margin: { t: 0, b: 20, l: 30, r: 10 },
          xaxis: { showgrid: false, zeroline: false, tickformat: "%H:%M:%S" },
          yaxis: { showgrid: false, zeroline: false },
          showlegend: false,
          height: 100,
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
        }

        if (chartRefs.current[`${sensorId}-count`]) {
          Plotly.react(chartRefs.current[`${sensorId}-count`]!, [countTrace], layout, { displayModeBar: false })
        }
        if (chartRefs.current[`${sensorId}-kbps`]) {
          Plotly.react(chartRefs.current[`${sensorId}-kbps`]!, [kbpsTrace], layout, { displayModeBar: false })
        }
      })
    })
  }, [groupedData, divisionToggleTime])

  return (
    <div>
      <h2
        className="text-3xl mb-4 cursor-pointer hover:text-blue-400"
        onClick={handleToggleDivision}
        title="Click to toggle divide-by-60 mode"
      >
        Sensor Throughput
        <br />
        <span className="text-2xl font-bold ml-2">
          ({adjustedMb.toFixed(2)} MB Generated)
        </span>
      </h2>

      {Object.entries(groupedData).map(([city, sensors]) => {
        const totalKbps = Object.values(sensors)
          .flatMap((readings) => generateAltThroughput(readings, divisionToggleTime))
          .reduce((sum, point) => sum + point.kbps, 0)

        return (
          <div key={city} className="mb-10">
            <h3 className="text-2xl font-bold mb-4">{city}
              <br />
              <span className="text-white-600 text-lg font-normal">
                ({totalKbps.toFixed(2)} KB/s)
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Object.entries(sensors).map(([sensorId, readings]) => {
                return (
                  <Card key={sensorId} className="bg-gray-900 border-gray-800 pb-5">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold">{sensorId}</CardTitle>
                      <p className="text-sm text-gray-400">
                        Last update: {new Date(
                          Math.max(...readings.map((r) => new Date(r.timestamp).getTime()))
                        ).toLocaleTimeString()}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-24">
                          <div ref={(el) => (chartRefs.current[`${sensorId}-count`] = el)} className="w-full h-full" />
                          <p className="text-center text-sm text-gray-400 mt-1">Items/sec</p>
                        </div>
                        <div className="h-24">
                          <div ref={(el) => (chartRefs.current[`${sensorId}-kbps`] = el)} className="w-full h-full" />
                          <p className="text-center text-sm text-gray-400 mt-1">KB/sec</p>
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
