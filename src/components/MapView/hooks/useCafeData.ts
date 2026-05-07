import { useEffect, useState } from "react"
import { getCafeData, type Cafe } from "../../../lib/dataClient"

export const useCafeData = () => {
  const [allCafes, setAllCafes] = useState<Cafe[]>([])
  const [cafeDataLoaded, setCafeDataLoaded] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCafeData()
        setAllCafes(data)
        setCafeDataLoaded(true)
      } catch (error) {
        console.error("Failed to load cafe data:", error)
        setCafeDataLoaded(false)
      }
    }
    load()
  }, [])

  return { allCafes, cafeDataLoaded }
}
