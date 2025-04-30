import { NextResponse } from "next/server"
import { CosmosClient } from "@azure/cosmos"
import { getCosmosConfig } from "@/lib/config"

// Initialize the Cosmos client
let client: CosmosClient | null = null
let database: any = null
let container: any = null

// Initialize the client only once
function getCosmosClient() {
  if (!client) {
    const config = getCosmosConfig()
    console.log("Initializing CosmosDB client with endpoint:", config.endpoint)

    if (!config.endpoint || !config.key) {
      throw new Error("CosmosDB endpoint or key is missing")
    }

    client = new CosmosClient({ endpoint: config.endpoint, key: config.key })
    database = client.database(config.databaseId)
    container = database.container(config.containerId)
  }
  return { client, database, container }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const timestampsParam = searchParams.get("timestamps") || "{}"

    console.log("Raw timestampsParam:", timestampsParam);

    // Parse the timestamps JSON
    let lastTimestamps: Record<string, string> = {}
    try {
      lastTimestamps = JSON.parse(timestampsParam);
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
    // Calculate one hour ago from now
    const mins = 10
    const allotedTimeWindow = new Date(Date.now() - mins * 60 * 1000).toISOString()

    const querySpec = {
      query: `
        SELECT * FROM c 
        WHERE c.timestamp > @earliestTimestamp 
          AND c.timestamp > @allotedTimeWindow
        ORDER BY c.timestamp DESC
      `,
      parameters: [
        { name: "@earliestTimestamp", value: earliestTimestamp },
        { name: "@allotedTimeWindow", value: allotedTimeWindow },
      ],
    }


    // Execute the query
    const { resources: results } = await container.items.query(querySpec).fetchAll()

    console.log(`Found ${results.length} results in batched query`)

    // Filter the results client-side to only include data newer than each sensor/city's last timestamp
    const filteredResults = results
      .filter((reading: any) => {
        const key = `${reading.sensorId}:${reading.city}`
        const lastTimestamp = lastTimestamps[key]

        // Include the reading if we don't have a timestamp for this combination
        // or if the reading is newer than the last timestamp
        return !lastTimestamp || reading.timestamp > lastTimestamp
      })
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) // Sort descending
      // .slice(0, 7500) // Keep only the first 500 readings
    ;

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
