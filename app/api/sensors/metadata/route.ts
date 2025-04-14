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
