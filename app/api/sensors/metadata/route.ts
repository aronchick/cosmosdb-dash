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

export async function GET() {
  try {
    console.log("Fetching metadata (unique sensors and cities)")

    // Get the client and container
    const { container } = getCosmosClient()

    // Query for unique sensor IDs
    const sensorQuery = {
      query: "SELECT DISTINCT VALUE c.sensorId FROM c",
    }

    // Query for unique cities
    const cityQuery = {
      query: "SELECT DISTINCT VALUE c.city FROM c",
    }

    // Execute both queries in parallel
    const [sensorResults, cityResults] = await Promise.all([
      container.items.query(sensorQuery).fetchAll(),
      container.items.query(cityQuery).fetchAll(),
    ])

    console.log(
      `Found ${sensorResults.resources.length} unique sensors and ${cityResults.resources.length} unique cities`,
    )

    return NextResponse.json({
      sensors: sensorResults.resources,
      cities: cityResults.resources,
    })
  } catch (error: any) {
    console.error("Error fetching metadata from CosmosDB:", error)

    // Return more detailed error information
    return NextResponse.json(
      {
        error: "Failed to fetch metadata",
        message: error.message,
        details: error.toString(),
      },
      { status: 500 },
    )
  }
}
