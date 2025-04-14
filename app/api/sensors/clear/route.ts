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

export async function DELETE() {
  try {
    console.log("Attempting to clear all data from the database")

    // Get the client and container
    const { container } = getCosmosClient()

    // In CosmosDB, we can't easily delete all items at once
    // We need to query for all items and delete them one by one
    // For safety, we'll limit this to a reasonable number of items

    // First, get all item IDs and partition keys
    const querySpec = {
      query: "SELECT c.id, c.city FROM c",
    }

    const { resources: items } = await container.items.query(querySpec).fetchAll()
    console.log(`Found ${items.length} items to delete`)

    // Delete each item
    let deletedCount = 0
    for (const item of items) {
      try {
        await container.item(item.id, item.city).delete()
        deletedCount++
      } catch (deleteError) {
        console.error(`Error deleting item ${item.id}:`, deleteError)
      }
    }

    console.log(`Successfully deleted ${deletedCount} items`)

    return NextResponse.json({
      success: true,
      message: `Successfully cleared ${deletedCount} items from the database`,
    })
  } catch (error: any) {
    console.error("Error clearing data from CosmosDB:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to clear data",
        message: error.message,
        details: error.toString(),
      },
      { status: 500 },
    )
  }
}
