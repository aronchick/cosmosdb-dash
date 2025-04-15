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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get("city") || null
    const sensorId = searchParams.get("sensorId") || null
    const sinceTimestamp = searchParams.get("since") || new Date(0).toISOString()

    console.log(`Fetching data for city: ${city}, sensor: ${sensorId}, since: ${sinceTimestamp}`)

    // Get the client and container
    const { container } = getCosmosClient()

    // Build the query based on parameters
    let queryText = "SELECT * FROM c WHERE c.timestamp > @timestamp"
    const parameters: { name: string; value: string }[] = [
      {
        name: "@timestamp",
        value: sinceTimestamp,
      },
    ]

    // Add city filter if specified
    if (city) {
      queryText += " AND c.city = @city"
      parameters.push({
        name: "@city",
        value: city,
      })
    }

    // Add sensor filter if specified
    if (sensorId) {
      queryText += " AND c.sensorId = @sensorId"
      parameters.push({
        name: "@sensorId",
        value: sensorId,
      })
    }

    // Add order and limit
    queryText += " ORDER BY c.timestamp ASC OFFSET 0 LIMIT 500"

    const querySpec = {
      query: queryText,
      parameters,
    }

    // Execute the query
    const { resources: results } = await container.items.query(querySpec).fetchAll()

    console.log(`Found ${results.length} results`)

    return NextResponse.json({
      data: results,
    })
  } catch (error: any) {
    console.error("Error fetching data from CosmosDB:", error)

    // Return more detailed error information
    return NextResponse.json(
      {
        error: "Failed to fetch sensor data",
        message: error.message,
        details: error.toString(),
      },
      { status: 500 },
    )
  }
}
