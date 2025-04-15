import fs from 'fs';
import yaml from 'yaml';
import path from 'path';

// Define the configuration interface
export interface CosmosConfig {
  cosmos: {
    endpoint: string;
    key: string;
    database_name: string;
    container_name: string;
    partition_key: string;
    connection?: {
      mode: string;
      max_retry_attempts: number;
      max_retry_wait_time_in_seconds: number;
      connection_timeout: number;
      enable_endpoint_discovery: boolean;
    };
    performance?: {
      enable_endpoint_discovery: boolean;
      bulk_execution: boolean;
      preferred_regions: string[];
    };
  };
  cities: Array<{
    name: string;
    latitude: number;
    longitude: number;
  }>;
  performance?: {
    throughput: number;
    autoscale: boolean;
    batch_size: number;
    max_parallel_operations: number;
    disable_indexing_during_bulk: boolean;
  };
  logging?: {
    level: string;
    log_request_units: boolean;
    log_latency: boolean;
  };
}

// Default configuration values
const defaultConfig: CosmosConfig = {
  cosmos: {
    endpoint: process.env.COSMOS_ENDPOINT || '',
    key: process.env.COSMOS_KEY || '',
    database_name: process.env.COSMOS_DATABASE_ID || 'SensorDatabase',
    container_name: process.env.COSMOS_CONTAINER_ID || 'SensorReadings',
    partition_key: '/city',
  },
  cities: [],
};

// Load configuration from YAML file
export function loadConfig(): CosmosConfig {
  try {
    // First try to load from config.yaml
    const configPath = path.resolve(process.cwd(), 'config.yaml');
    
    if (fs.existsSync(configPath)) {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      const config = yaml.parse(fileContents) as CosmosConfig;
      
      // Fallback to environment variables if values are empty
      config.cosmos.endpoint = config.cosmos.endpoint || process.env.COSMOS_ENDPOINT || '';
      config.cosmos.key = config.cosmos.key || process.env.COSMOS_KEY || '';
      config.cosmos.database_name = config.cosmos.database_name || process.env.COSMOS_DATABASE_ID || 'SensorDatabase';
      config.cosmos.container_name = config.cosmos.container_name || process.env.COSMOS_CONTAINER_ID || 'SensorReadings';
      
      return config;
    }
    
    // If no config file, use environment variables
    return defaultConfig;
  } catch (error) {
    console.error('Error loading configuration:', error);
    return defaultConfig;
  }
}

// Get the Cosmos DB configuration
export function getCosmosConfig() {
  const config = loadConfig();
  return {
    endpoint: config.cosmos.endpoint,
    key: config.cosmos.key,
    databaseId: config.cosmos.database_name,
    containerId: config.cosmos.container_name,
    partitionKey: config.cosmos.partition_key,
  };
}

// Export singleton instance
export const config = loadConfig();