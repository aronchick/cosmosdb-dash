// Function to fetch batched sensor data with timestamps for each sensor/city combination
export async function fetchBatchedSensorData(lastTimestamps: Record<string, string>) {
  try {
    console.log("Fetching batched sensor data...")

    // Convert the lastTimestamps object to a JSON string to pass as a query parameter
    const timestampsParam = encodeURIComponent(JSON.stringify(lastTimestamps))

    const payload = JSON.stringify({
      timestamps : lastTimestamps
    });

    const response = await fetch(`/api/sensors/batch`,
      { method : "POST", body : payload }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("API error details:", errorData)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || "Unknown error"}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching batched sensor data:", error)
    throw error
  }
}

// Function to fetch metadata (unique sensors and cities)
export async function fetchMetadata() {
  try {
    const response = await fetch("/api/sensors/metadata")

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("API error details for metadata:", errorData)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || "Unknown error"}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching metadata:", error)
    throw error
  }
}

// Function to clear all data from the database
export async function clearAllData() {
  try {
    const response = await fetch("/api/sensors/clear", {
      method: "DELETE",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("API error details for clearing data:", errorData)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || "Unknown error"}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error clearing data:", error)
    throw error
  }
}
