"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import Plotly from "plotly.js-dist-min"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { SensorReading } from "@/components/dashboard"

const TIME_WINDOW_MS = 5 * 60 * 1000

export default function SensorScatterChart({ data }: { data: SensorReading[] }) {
  const [metric, setMetric] = useState<"temperature" | "humidity" | "pressure">("temperature")
  const chartRef = useRef<HTMLDivElement | null>(null)

  const cityColors: Record<string, string> = {
    Amsterdam: "#FFFF00",
    Beijing: "#00FF00",
    Berlin: "#36A2EB",
    London: "#FFCE56",
    Cairo: "#FF0000",
    "New York": "#4BC0C0",
    Tokyo: "#9966FF",
    Paris: "#FF9F40",
    Sydney: "#32CD32",
    Dubai: "#FF5733",
    "San Francisco": "#8A2BE2",
    Singapore: "#00FFFF",
    Default: "#FF00FF",
  }

  let storedColors: any = localStorage.getItem("cityColors")

  if (storedColors) {
    storedColors = JSON.parse(storedColors)
  } else {
    storedColors = {}
  }

  Object.keys(storedColors).forEach((colorKey) => {
    if (!cityColors[colorKey]) {
      cityColors[colorKey] = storedColors[colorKey]
    }
  })

  function generateCityColor(city: string) {
    const rgb = `rgb(${Math.random() * 255 | 0}, ${Math.random() * 255 | 0}, ${Math.random() * 255 | 0})`
    cityColors[city] = rgb
    localStorage.setItem("cityColors", JSON.stringify(cityColors))
    return rgb
  }

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case "temperature":
        return "Temperature (°F)"
      case "humidity":
        return "Humidity (%)"
      case "pressure":
        return "Pressure (hPa)"
      default:
        return metric
    }
  }

  const filteredData = useMemo(() => {
    const now = Date.now()
    const cutoff = now - TIME_WINDOW_MS
    return data.filter((d) => new Date(d.timestamp).getTime() >= cutoff)
  }, [data])

  const groupedByCity = useMemo(() => {
    const groups: Record<string, SensorReading[]> = {}
    for (const d of filteredData) {
      if (!groups[d.city]) groups[d.city] = []
      groups[d.city].push(d)
    }
    return groups
  }, [filteredData])

  useEffect(() => {
    const traces: any = Object.entries(groupedByCity).map(([city, items]) => {
      const markerColor = cityColors[city] || generateCityColor(city)

      return {
        type: "scattergl",
        mode: "markers",
        name: city,
        x: items.map((d) => new Date(d.timestamp)),
        y: items.map((d) => d[metric]),
        text: items.map((d) => {
          const temp = typeof d.temperature === "number" ? `${d.temperature.toFixed(2)} °F` : "N/A"
          const hum = typeof d.humidity === "number" ? `${d.humidity.toFixed(2)}%` : "N/A"
          const press = typeof d.pressure === "number" ? `${d.pressure.toFixed(2)} hPa` : "N/A"
          const model = d.model || "Unknown"
          const firmwareVersion = d.firmwareVersion || "Unknown"

          return `
            <b>${d.city}</b><br>
            Sensor: ${d.sensorId}<br>
            Time: ${new Date(d.timestamp).toLocaleString()}<br>
            Temp: ${temp}<br>
            Humidity: ${hum}<br>
            Pressure: ${press}<br>
            Model: ${model}<br>
            Firmware: ${firmwareVersion}
          `
        }),
        hoverinfo: "text",
        marker: {
          color: markerColor,
          size: items.map((d) => d.anomalyFlag ? 8 : 3),
          line: { width: 0 }
        },
        hoverlabel: {
          bgcolor: "#000000",
          bordercolor: markerColor,
          font: { color: "#ffffff" },
          padding: 20,
          align: "left"
        },
        showlegend: true
      }
    })

    const layout: Partial<Plotly.Layout> = {
      title: {
        text: `Live Sensor Feed: ${getMetricLabel(metric)}`,
        font: { color: "#ffffff", size: 20 }
      },
      xaxis: {
        title: "Timestamp",
        type: "date",
        titlefont: { color: "#ffffff" },
        tickfont: { color: "#ffffff" },
        gridcolor: "rgb(68,68,68)",
        linecolor: "rgb(68,68,68)",
        zerolinecolor: "rgb(68,68,68)"
      },
      yaxis: {
        title: getMetricLabel(metric),
        titlefont: { color: "#ffffff" },
        tickfont: { color: "#ffffff" },
        gridcolor: "rgb(68,68,68)",
        linecolor: "rgb(68,68,68)",
        zerolinecolor: "rgb(68,68,68)"
      },
      font: { color: "#ffffff" },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      hovermode: "closest",
      legend: {
        orientation: "h",
        x: 0.5,
        xanchor: "center",
        y: -0.3,
        font: { color: "#ffffff" }
      },
      margin: { t: 60, b: 100, l: 60, r: 30 }
    }

    Plotly.react(chartRef.current!, traces, layout, {
      responsive: true,
      displayModeBar: false
    })
  }, [metric, groupedByCity])

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
        <p className="text-right text-sm text-gray-400 mb-2">
          Plotting {filteredData.length.toLocaleString()} points
        </p>
        <div ref={chartRef} className="w-full h-[600px]" />
      </CardContent>
    </Card>
  )
}
