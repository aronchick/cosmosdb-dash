import { NextResponse } from "next/server"
import { CosmosClient } from "@azure/cosmos"

// CosmosDB connection configuration
const endpoint = process.env.COSMOS_ENDPOINT || ""
const key = process.env.COSMOS_KEY || ""
const databaseId = process.env.COSMOS_DATABASE_ID || "SensorDatabase"
const containerId = process.env.COSMOS_CONTAINER_ID || "SensorReadings"

// Initialize the Cosmos client
let client: CosmosClient | null = null
let database: any = null
let container: any = null

// Initialize the client only once
function getCosmosClient() {
  if (!client) {
    console.log("Initializing CosmosDB client with endpoint:", endpoint)

    if (!endpoint || !key) {
      throw new Error("CosmosDB endpoint or key is missing")
    }

    client = new CosmosClient({ endpoint, key })
    database = client.database(databaseId)
    container = database.container(containerId)
  }
  return { client, database, container }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const timestampsParam = searchParams.get("timestamps") || "{}"

    // Parse the timestamps JSON
    let lastTimestamps: Record<string, string> = {}
    try {
      lastTimestamps = JSON.parse(decodeURIComponent(timestampsParam))
    } catch (e) {
      console.error("Error parsing timestamps:", e)
    }

    console.log(`Fetching batched data with ${Object.keys(lastTimestamps).length} timestamp entries`)

    // Get the client and container
    const { container } = getCosmosClient()

    // Find the earliest timestamp across all combinations
    // This allows us to make a single query that covers all sensors/cities
    let earliestTimestamp = new Date().toISOString()

    if (Object.keys(lastTimestamps).length > 0) {
      // Find the earliest timestamp
      earliestTimestamp = Object.values(lastTimestamps).reduce((earliest, current) => {
        return current < earliest ? current : earliest
      }, Object.values(lastTimestamps)[0])
    } else {
      // If no timestamps provided, use a timestamp from 24 hours ago
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      earliestTimestamp = yesterday.toISOString()
    }

    // Build a single query that gets all data since the earliest timestamp
    const querySpec = {
      query: "SELECT * FROM c WHERE c.timestamp > @timestamp ORDER BY c.timestamp ASC OFFSET 0 LIMIT 1000",
      parameters: [
        {
          name: "@timestamp",
          value: earliestTimestamp,
        },
      ],
    }

    // Execute the query
    const { resources: results } = await container.items.query(querySpec).fetchAll()

    console.log(`Found ${results.length} results in batched query`)

    // Filter the results client-side to only include data newer than each sensor/city's last timestamp
    const filteredResults = results.filter((reading: any) => {
      const key = `${reading.sensorId}:${reading.city}`
      const lastTimestamp = lastTimestamps[key]

      // Include the reading if we don't have a timestamp for this combination
      // or if the reading is newer than the last timestamp
      return !lastTimestamp || reading.timestamp > lastTimestamp
    })

    console.log(`Filtered to ${filteredResults.length} new readings`)

    return NextResponse.json({
      data: filteredResults,
    })
  } catch (error: any) {
    console.error("Error fetching batched data from CosmosDB:", error)

    // Return more detailed error information
    return NextResponse.json(
      {
        error: "Failed to fetch batched sensor data",
        message: error.message,
        details: error.toString(),
      },
      { status: 500 },
    )
  }
}
