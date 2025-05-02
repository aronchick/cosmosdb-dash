'use client'

import dynamic from 'next/dynamic'

const SensorThroughput = dynamic(() => import('./sensor-throughput-plotly'), {
  ssr: false,
  loading: () => <p className="text-white">Loading chart...</p>,
})

export default SensorThroughput
