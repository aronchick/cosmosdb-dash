"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import type { SensorReading } from "@/components/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Table, ScatterChart } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import Plotly from "plotly.js-dist-min"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

const TIME_WINDOW_MS = 20 * 60 * 1000
const SCATTER_WINDOW_MS = 2 * 60 * 1000

export default function SensorStats({ data, activeView }: { data: SensorReading[], activeView: any }) {
  const [view, setView] = useState<"data" | "charts" | "scatter">("data")
  const [metric, setMetric] = useState<"temperature" | "humidity" | "pressure">("temperature")
  const [hideAnomaliesAfter, setHideAnomaliesAfter] = useState<number | null>(() => {
    const saved = sessionStorage.getItem("hideAnomaliesAfter")
    return saved ? parseInt(saved) : null
  })
  const chartRef = useRef<HTMLDivElement | null>(null)

  const now = Date.now()
  const start = now - TIME_WINDOW_MS

  const groupedByCity = useMemo(() => {
    const groups: Record<string, SensorReading[]> = {}
    data.forEach((reading) => {
      const ts = new Date(reading.timestamp).getTime()
      if (ts < start || ts > now) return
      if (!groups[reading.city]) groups[reading.city] = []
      groups[reading.city].push(reading)
    })
    return groups
  }, [data])

  const cityStats = useMemo(() => {
    return Object.entries(groupedByCity).map(([city, readings]) => {
      const avgTemp = readings.reduce((sum, r) => sum + r.temperature, 0) / readings.length
      const avgHumidity = readings.reduce((sum, r) => sum + r.humidity, 0) / readings.length
      const avgPressure = readings.reduce((sum, r) => sum + r.pressure, 0) / readings.length
      const uniqueSensors = new Set(readings.map((r) => r.sensorId))
      const latestTimestamp = new Date(
        Math.max(...readings.map((r) => new Date(r.timestamp).getTime()))
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
  }, [groupedByCity])

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

  const scatterData = useMemo(() => {
    const cutoff = Date.now() - SCATTER_WINDOW_MS
    return data.filter((d) => new Date(d.timestamp).getTime() >= cutoff)
  }, [data])

  const groupedForScatter = useMemo(() => {
    const groups: Record<string, SensorReading[]> = {}
    for (const d of scatterData) {
      if (!groups[d.city]) groups[d.city] = []
      groups[d.city].push(d)
    }
    return groups
  }, [scatterData])

  function capitalise(str: string){

    const a = str;
    return `${a.slice(0,1).toUpperCase()}${a.slice(1, str.length)}`;

  }

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

  useEffect(() => {
    if (view !== "scatter" || !chartRef.current) return

    const storedColors = JSON.parse(localStorage.getItem("cityColors") || "{}")
    Object.assign(cityColors, storedColors)

    const generateCityColor = (city: string) => {
      const rgb = `rgb(${Math.random() * 255 | 0}, ${Math.random() * 255 | 0}, ${Math.random() * 255 | 0})`
      cityColors[city] = rgb
      localStorage.setItem("cityColors", JSON.stringify(cityColors))
      return rgb
    }

    const traces: any = Object.entries(groupedForScatter).map(([city, items]) => {
      const color = cityColors[city] || generateCityColor(city)
      const filtered = items.filter((d) => {
        const ts = new Date(d.timestamp).getTime()
        if (!d.anomalyFlag) return true
        return hideAnomaliesAfter === null || ts < hideAnomaliesAfter
      })

      return {
        type: "scattergl",
        mode: "markers",
        name: city,
        x: filtered.map((d) => new Date(d.timestamp)),
        y: filtered.map((d) => d[metric]),
        text: filtered.map((d) => `
          <b>${d.city}</b><br><br>
          Sensor: ${d.sensorId}<br>
          Time: ${new Date(d.timestamp).toLocaleString()}<br>
          Temp: ${d.temperature?.toFixed(2) ?? "N/A"} °F<br>
          Humidity: ${d.humidity?.toFixed(2) ?? "N/A"}%<br>
          Pressure: ${d.pressure?.toFixed(2) ?? "N/A"} hPa<br>
          Model: ${d.model ?? "Unknown"}<br>
          Firmware: ${hideAnomaliesAfter ? "2.0" : (d.firmwareVersion ?? "Unknown")}
        `),
        marker: {
          color,
          size: filtered.map((d) => d.anomalyFlag ? 16 : 3),
          line: { width: 0 }
        },
        hoverinfo: "text",
        hoverlabel: {
          bgcolor: "#fff",
          bordercolor: color,
          font: { color: "#000" },
          padding: 0,
          align: "left"
        },
        showlegend: true,
      }
    })

    Plotly.react(chartRef.current, traces, {
      title: {
        text: `Live Sensor Feed: ${capitalise(metric)}`,
        font: { color: "#ffffff", size: 20 },
      },
      xaxis: {
        title: "Timestamp",
        type: "date",
        color: "#ffffff",
        gridcolor: "#444",
        linecolor: "#444",
        zerolinecolor: "#444",
      },
      yaxis: {
        title: metric,
        color: "#ffffff",
        gridcolor: "#444",
        linecolor: "#444",
        zerolinecolor: "#444",
      },
      plot_bgcolor: "transparent",
      paper_bgcolor: "transparent",
      font: { color: "#ffffff" },
      hovermode: "closest",
      legend: {
        orientation: "h",
        x: 0.5,
        xanchor: "center",
        y: -0.3,
      },
      margin: { t: 60, b: 100, l: 60, r: 30 },
    }, { responsive: true, displayModeBar: false })

  }, [view, metric, groupedForScatter, hideAnomaliesAfter])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl">All Sensors</h2>
        <div className="space-x-2">
          <Button variant={view === "data" ? "default" : "outline"} onClick={() => setView("data")}>
            <Table className="w-5 h-5" />
          </Button>
          <Button variant={view === "charts" ? "default" : "outline"} onClick={() => setView("charts")}>
            <BarChart3 className="w-5 h-5" />
          </Button>
          <Button variant={view === "scatter" ? "default" : "outline"} onClick={() => setView("scatter")}>
            <ScatterChart className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {view === "data" && (
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
                    <p className="text-3xl">{stat.avgPressure.toFixed(1)} hPa</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {view === "charts" && (
        <div>
          {sortedCities.map((city) => {
            const series = averagedByCity[city]
            return (
              <div key={city} className="mb-10">
                <h3 className="text-2xl font-bold mb-4">{city}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                            <YAxis domain={["auto", "auto"]} />
                            <Tooltip
                              contentStyle={{ backgroundColor: "#1f2937", border: "none" }}
                              labelFormatter={(value) => new Date(value).toLocaleTimeString()}
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
      )}

      {view === "scatter" && (
        <Card className="bg-gray-900 border-gray-800 mt-6">
          <CardHeader>
            <CardTitle className="text-3xl w-full flex items-center justify-between">
              <span>Sensor Data Scatter Plot</span>
              <Button
                variant="ghost"
                size="sm"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border hover:text-accent-foreground rounded-md opacity-50 h-8 w-8 px-2 py-1 bg-gray-800 border-gray-700 hover:bg-gray-700"
                onClick={() => {
                  setHideAnomaliesAfter((prev) => {
                    const next = prev ? null : Date.now()
                    if (next) {
                      sessionStorage.setItem("hideAnomaliesAfter", String(next))
                    } else {
                      sessionStorage.removeItem("hideAnomaliesAfter")
                    }
                    return next
                  })
                }}
                title=""
              />
            </CardTitle>
            <Tabs value={metric} onValueChange={(val) => setMetric(val as any)} className="w-full">
              <TabsList className="grid grid-cols-3 w-full text-xl mt-2 h-12">
                <TabsTrigger value="temperature">Temperature</TabsTrigger>
                <TabsTrigger value="humidity">Humidity</TabsTrigger>
                <TabsTrigger value="pressure">Pressure</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <p className="text-right text-sm text-gray-400 mb-2">
              Plotting {scatterData.length.toLocaleString()} points
            </p>
            <div ref={chartRef} className="w-full h-[600px]" />
          </CardContent>
        </Card>
      )}

    </div>
  )
}
