"use client"

import { useEffect, useState, useRef } from "react"
import { fetchBatchedSensorData, clearAllData, fetchMetadata } from "@/lib/data-service"
import SensorScatterChart from "@/components/sensor-scatter-chart"
import SensorStats from "@/components/sensor-stats"
import SensorThroughput from "@/components/sensor-throughput"
import SensorTableRaw from "@/components/sensor-table-raw"
import SensorTableStructured from "@/components/sensor-table-structured"
import CitySelector from "@/components/city-selector"
import CitySensors from "@/components/city-sensors"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle2, Trash2, Database } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export type SensorReading = {
  id: string
  sensorId: string
  timestamp: string
  city: string
  location: string
  lat: string
  long: string
  processingStage: string
  temperature: number
  humidity: number
  pressure: number
  vibration: number
  voltage: number
  status: string
  firmwareVersion: string
  model: string
  manufacturer: string
  anomalyFlag: boolean
  anomalyType: string | null
  rawDataString?: string // optional, since it may or may not be present
}


export default function Dashboard() {
  const isFetchingRef = useRef(false)
  const [sensorData, setSensorData] = useState<SensorReading[]>([])
  const lastTimestampsRef = useRef<Record<string, string>>({});
  const [lastTimestamps, setLastTimestamps] = useState<Record<string, string>>({})
  const [selectedCity, setSelectedCity] = useState<string>("All Cities")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected">("connected")
  const [totalSensorCount, setTotalSensorCount] = useState(0)
  const [dataRate, setDataRate] = useState(0)
  const [isClearing, setIsClearing] = useState(false)
  const [uniqueSensors, setUniqueSensors] = useState<string[]>([])
  const [uniqueCities, setUniqueCities] = useState<string[]>([])
  const [queryCount, setQueryCount] = useState(0)

  const dataRateRef = useRef(0)
  const batchQueryTimerRef = useRef<NodeJS.Timeout | null>(null)
  const metadataTimerRef = useRef<NodeJS.Timeout | null>(null)
  const readingsCountRef = useRef(0)

  // Function to fetch metadata (unique sensors and cities)
  const fetchMetadataInfo = async () => {
    try {
      console.log("Fetching metadata (sensors and cities)...")
      const { sensors, cities } = await fetchMetadata()

      console.log(`Found ${sensors.length} unique sensors and ${cities.length} unique cities`)

      setUniqueSensors(sensors)
      setUniqueCities(cities)
      setTotalSensorCount(sensors.length)
    } catch (err: any) {
      console.error("Error fetching metadata:", err)
      setError(`Failed to fetch metadata: ${err.message || "Unknown error"}`)
    }
  }

  function simpleHash(obj: Record<string, any>): string {
    const str = JSON.stringify(
      Object.keys(obj).sort().reduce((acc: any, key) => {
        acc[key] = obj[key]
        return acc
      }, {})
    )
    let hash = 5381
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i)
    }
    return (hash >>> 0).toString(16)
  } 

  // Function to fetch batched data for all sensors
  const fetchBatchedData = async () => {
    if (isFetchingRef.current) {
      console.log("Fetch in progress — skipping this cycle.")
      return
    }
  
    isFetchingRef.current = true
    try {
      setIsLoading(true)
      setQueryCount((prev) => prev + 1)
  
      console.log("Executing batched query for all sensors and cities...")
      const result = await fetchBatchedSensorData(lastTimestampsRef.current)
      console.log("Server returned result:", result)
  
      if (result.data && result.data.length > 0) {
        const newTimestamps: Record<string, string> = { ...lastTimestamps }
        const groupedResults: Record<string, SensorReading[]> = {}
  
        result.data.forEach((reading: SensorReading) => {
          const key = `${reading.sensorId}:${reading.city}`
          if (!groupedResults[key]) groupedResults[key] = []
          groupedResults[key].push(reading)
        })
  
        Object.entries(groupedResults).forEach(([key, readings]) => {
          readings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          newTimestamps[key] = readings[0].timestamp
        })
  
        setLastTimestamps(newTimestamps)
        lastTimestampsRef.current = newTimestamps
        readingsCountRef.current += result.data.length
  
        setSensorData((prevData) => {
          const seen = new Set<string>()
          const combined = [...prevData, ...result.data].filter((item) => {
            const hash = simpleHash(item)
            if (seen.has(hash)) return false
            seen.add(hash)
            return true
          })
          return combined
        })
      }
  
      setConnectionStatus("connected")
      setError(null)
    } catch (err: any) {
      console.error("Error fetching batched data:", err)
      setConnectionStatus("disconnected")
      setError(`Failed to fetch data: ${err.message || "Unknown error"}. Retrying...`)
      if (sensorData.length === 0) {
        generateMockData()
      }
    } finally {
      isFetchingRef.current = false
      setIsLoading(false)
    }
  }
  

  // Update data rate every second
  useEffect(() => {
    const updateDataRate = () => {
      dataRateRef.current = readingsCountRef.current
      setDataRate(dataRateRef.current)
      readingsCountRef.current = 0
    }

    const timer = setInterval(updateDataRate, 1000)
    return () => clearInterval(timer)
  }, [])

  // Function to handle clearing all data
  const handleClearData = async () => {
    try {
      setIsClearing(true)
      await clearAllData()

      // Reset the dashboard state
      setSensorData([])
      setLastTimestamps({})
      setTotalSensorCount(0)
      setDataRate(0)

      // Show success message
      setError("All data has been cleared successfully. Waiting for new data...")

      // Refresh metadata after a short delay
      setTimeout(fetchMetadataInfo, 2000)
    } catch (err: any) {
      console.error("Error clearing data:", err)
      setError(`Failed to clear data: ${err.message || "Unknown error"}`)
    } finally {
      setIsClearing(false)
    }
  }

  // Add this function to generate mock data if the real data fetch fails
  const generateMockData = () => {
    console.log("Generating mock data for demo purposes")
    const mockData: SensorReading[] = []
    const now = new Date()
    const cities = ["Amsterdam", "Berlin", "London", "New York", "Tokyo"]
    const sensorCount = 20

    // Generate mock sensors across different cities
    for (let i = 1; i <= sensorCount; i++) {
      const city = cities[Math.floor(Math.random() * cities.length)]

      // Generate multiple readings per sensor
      for (let j = 0; j < 5; j++) {
        mockData.push({
          id: `mock-${i}-${j}`,
          sensorId: `MOCK${i.toString().padStart(3, "0")}`,
          timestamp: new Date(now.getTime() - j * 60000 - Math.random() * 3600000).toISOString(),
          temperature: 65 + Math.random() * 10,
          humidity: 30 + Math.random() * 40,
          pressure: 10 + Math.random() * 5,
          city,
          type: "sensor_reading",
        })
      }
    }

    setSensorData(mockData)
    setTotalSensorCount(sensorCount)
    setUniqueSensors(Array.from({ length: sensorCount }, (_, i) => `MOCK${(i + 1).toString().padStart(3, "0")}`))
    setUniqueCities(cities)
  }

  // Initial setup and metadata refresh
  useEffect(() => {

    if (Object.keys(lastTimestampsRef.current).length === 0) {
      const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString();
      lastTimestampsRef.current["__default"] = thirtySecondsAgo;
      console.log("Initialized lastTimestampsRef with:", lastTimestampsRef.current);
    }

    // Initial metadata fetch
    fetchMetadataInfo()

    // Initial data fetch
    fetchBatchedData()

    // Set up batched query every 5 seconds
    batchQueryTimerRef.current = setInterval(fetchBatchedData, 1000)

    // Set up metadata refresh every minute
    metadataTimerRef.current = setInterval(fetchMetadataInfo, 60000)

    // Cleanup on unmount
    return () => {
      if (metadataTimerRef.current) {
        clearInterval(metadataTimerRef.current)
      }
      if (batchQueryTimerRef.current) {
        clearInterval(batchQueryTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gray-900 border-gray-800 flex-center">
          <CardContent className="p-4 flex items-center">
            {connectionStatus === "connected" ? (
              <CheckCircle2 className="h-8 w-8 text-green-500 mr-3" />
            ) : (
              <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
            )}
            <div>
              <h3 className="text-2xl font-bold">Status</h3>
              <p className={`text-xl ${connectionStatus === "connected" ? "text-green-500" : "text-red-500"}`}>
                {connectionStatus === "connected" ? "Connected" : "Disconnected"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800 flex-center">
          <CardContent className="p-4">
            <h3 className="text-2xl font-bold">Data Rate</h3>
            <p className="text-xl">{dataRate.toFixed(0)} readings/sec</p>
            <p className="text-sm text-gray-400">Queries: {queryCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800 flex-center">
          <CardContent className="p-4 flex items-center">
            <Database className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <h3 className="text-2xl font-bold">Sensors</h3>
              <p className="text-xl">
                {totalSensorCount.toLocaleString()} sensors • {uniqueCities.length} cities
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800 flex-center space-between">
          <CardContent className="p-4 flex items-center justify-between">
            <h3 className="text-2xl font-bold">Actions</h3>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="lg" className="bg-red-600 hover:bg-red-700" disabled={isClearing}>
                  <Trash2 className="mr-2 h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-gray-900 border-gray-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl">Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="text-lg text-gray-300">
                    This action will permanently delete all sensor data from the database. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="text-lg">Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-lg" onClick={handleClearData}>
                    Yes, Delete All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="bg-red-900 border-red-800 mb-6">
          <AlertCircle className="h-6 w-6" />
          <AlertTitle className="text-2xl">Connection Error</AlertTitle>
          <AlertDescription className="text-xl">{error}</AlertDescription>
        </Alert>
      )}

      {/* City Selector */}
      <CitySelector
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
        availableCities={["All Cities", ...uniqueCities]}
      />

      {/* Main Dashboard Content */}
      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-14 text-xl">
          <TabsTrigger value="stats">All Sensors</TabsTrigger>
          <TabsTrigger value="rawdata">Raw Data</TabsTrigger>
          <TabsTrigger value="schematised">Schematised Data</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="throughput">Throughput</TabsTrigger>
          {/* <TabsTrigger value="sensors">Sensors</TabsTrigger> */}
        </TabsList>

        <TabsContent value="charts" className="mt-6">
          <SensorScatterChart
            data={sensorData.filter((reading) => selectedCity === "All Cities" || reading.city === selectedCity)}
          />
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <SensorStats
            data={sensorData.filter((reading) => selectedCity === "All Cities" || reading.city === selectedCity)}
          />
        </TabsContent>

        <TabsContent value="throughput" className="mt-6">
          <SensorThroughput
            data={sensorData.filter((reading) => selectedCity === "All Cities" || reading.city === selectedCity)}
          />
        </TabsContent>
        
        {/* <TabsContent value="sensors" className="mt-6">
          <CitySensors
            data={sensorData.filter((reading) => selectedCity === "All Cities" || reading.city === selectedCity)}
          />
        </TabsContent> */}

        <TabsContent value="rawdata" className="mt-6">
          <SensorTableRaw
            data={sensorData.filter((reading) => selectedCity === "All Cities" || reading.city === selectedCity)}
          />
        </TabsContent>

        <TabsContent value="schematised" className="mt-6">
          <SensorTableStructured
            data={sensorData.filter((reading) => selectedCity === "All Cities" || reading.city === selectedCity)}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
