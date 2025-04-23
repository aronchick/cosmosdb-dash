'use client'

import dynamic from 'next/dynamic'

const SensorScatterChart = dynamic(() => import('./sensor-scatter-chart-plotly'), {
  ssr: false,
  loading: () => <p className="text-white">Loading chart...</p>,
})

export default SensorScatterChart
