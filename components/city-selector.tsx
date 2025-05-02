"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function CitySelector({
  selectedCity,
  onCityChange,
  availableCities = ["All Cities", "Amsterdam", "Berlin", "London", "New York", "Tokyo"],
}: {
  selectedCity: string
  onCityChange: (city: string) => void
  availableCities?: string[]
}) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-4 justify-center">
          {availableCities.map((city) => (
            <Button
              key={city}
              variant={selectedCity === city ? "default" : "outline"}
              className={`text-sm py-6 px-8 ${
                selectedCity === city ? "bg-primary hover:bg-primary/90" : "bg-gray-800 hover:bg-gray-700"
              }`}
              onClick={() => onCityChange(city)}
            >
              {city}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
