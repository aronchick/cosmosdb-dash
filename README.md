# Cosmos DB Dashboard

A real-time dashboard for visualizing sensor data from Azure Cosmos DB.

## Features

- Real-time sensor data visualization
- Multi-city data comparison
- Interactive charts and tables
- Responsive design

## Prerequisites

- Node.js 18.0 or later (with npm or pnpm)
- Azure Cosmos DB account
- Git

## Getting Started

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/cosmosdb-dash.git
   cd cosmosdb-dash
   ```

2. **Install dependencies**

   ```bash
   # Option 1: Using npm (with legacy peer deps to resolve conflicts)
   npm run install:clean
   
   # Option 2: Using pnpm (recommended, faster)
   pnpm install
   ```

3. **Set up configuration**

   You can configure the application using either a YAML configuration file or environment variables:

   **Option 1: Using config.yaml (recommended for complete configuration)**

   ```bash
   # Copy the example configuration file
   cp config.yaml.example config.yaml
   
   # Edit the file to add your Azure Cosmos DB credentials and settings
   nano config.yaml  # or use your preferred editor
   ```

   **Option 2: Using environment variables (quickest setup)**

   Create a `.env.local` file in the root directory:

   ```bash
   # Create .env.local file
   cat > .env.local << EOL
   COSMOS_ENDPOINT=your_cosmos_db_endpoint
   COSMOS_KEY=your_cosmos_db_key
   COSMOS_DATABASE_ID=SensorDatabase
   COSMOS_CONTAINER_ID=SensorReadings
   EOL
   ```

4. **Start the development server**

   ```bash
   npm run dev
   # or
   pnpm dev
   ```

5. **Access the dashboard**

   Open [http://localhost:3000](http://localhost:3000) in your browser.

   > Note: The dashboard will automatically attempt to connect to your Cosmos DB. If the connection fails, the dashboard will display mock data for demonstration purposes.

### Production Build

To create an optimized production build:

```bash
npm run build
# or
pnpm build
```

Then start the production server:

```bash
npm start
# or
pnpm start
```

## Docker Deployment

You can run the application in Docker using either a local build or Docker Compose.

### Quick Start with Docker Compose

1. **Set up environment variables**

   Create a `.env.production` file with your Cosmos DB credentials:

   ```bash
   cat > .env.production << EOL
   COSMOS_ENDPOINT=your_cosmos_db_endpoint
   COSMOS_KEY=your_cosmos_db_key
   COSMOS_DATABASE_ID=SensorDatabase
   COSMOS_CONTAINER_ID=SensorReadings
   EOL
   ```

2. **Start with Docker Compose**

   ```bash
   docker-compose up
   ```

   This will build and start the container, with the dashboard available at [http://localhost:3000](http://localhost:3000).

### Manual Docker Build and Run

1. **Build the image locally**

   ```bash
   docker build -t cosmosdb-dash .
   ```

2. **Run the container**

   **Option 1: Using environment variables**

   ```bash
   docker run -p 3000:3000 \
     -e COSMOS_ENDPOINT=your_cosmos_db_endpoint \
     -e COSMOS_KEY=your_cosmos_db_key \
     -e COSMOS_DATABASE_ID=SensorDatabase \
     -e COSMOS_CONTAINER_ID=SensorReadings \
     cosmosdb-dash
   ```

   **Option 2: Using mounted config file**

   ```bash
   # Ensure you've created and configured your config.yaml file first
   docker run -p 3000:3000 \
     -v $(pwd)/config.yaml:/app/config.yaml \
     cosmosdb-dash
   ```

### Publishing a Multi-Platform Image (Advanced)

The project includes a build script for creating and publishing multi-architecture Docker images:

```bash
# Make the script executable
chmod +x build.sh

# Set required environment variables
export REPOSITORY_NAME=your-github-username
export IMAGE_NAME=cosmosdb-dashboard
export GITHUB_TOKEN=your_github_token
export GITHUB_USER=your_github_username

# Run the build script
./build.sh
```

This will build and push the image to GitHub Container Registry (ghcr.io).

## Configuration

The application can be configured using either a YAML configuration file or environment variables.

### Configuration File (config.yaml)

The configuration file supports more detailed settings than environment variables. Sample settings:

```yaml
cosmos:
  endpoint: "your_cosmos_endpoint"
  key: "your_cosmos_key"
  database_name: "SensorDatabase"
  container_name: "SensorReadings"
  partition_key: "/city"
  
  connection:
    mode: "Gateway"
    max_retry_attempts: 9
    connection_timeout: 60
```

See `config.yaml.example` for a complete example.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `COSMOS_ENDPOINT` | Your Azure Cosmos DB endpoint URL | (Required) |
| `COSMOS_KEY` | Your Azure Cosmos DB access key | (Required) |
| `COSMOS_DATABASE_ID` | The Cosmos DB database ID | `SensorDatabase` |
| `COSMOS_CONTAINER_ID` | The Cosmos DB container ID | `SensorReadings` |

## Development Tools

- Next.js 15.3.0 
- React 19.1.0
- TypeScript 5.8.3
- Tailwind CSS 3.3.5
- Recharts 2.15.2
- @azure/cosmos 4.3.0
- Flox

## License

MIT