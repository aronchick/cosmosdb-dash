import type React from "react"
import { Suspense } from "react"
import Dashboard from "@/components/dashboard"
import { Loader2 } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-4xl md:text-6xl font-bold mb-6 text-center">
        High-Scale Data Processing with Azure Cosmos DB
      </h1>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-[80vh]">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <span className="ml-4 text-3xl">Loading Dashboard...</span>
          </div>
        }
      >
        <ErrorBoundary>
          <Dashboard />
        </ErrorBoundary>
      </Suspense>
    </main>
  )
}

// Simple error boundary component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}
