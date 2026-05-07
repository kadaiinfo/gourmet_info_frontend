import { useCallback, useMemo, useState } from "react"
import type { Cafe } from "../../../lib/dataClient"
import { isOpenNow } from "../../../utils/openingHoursParser"
import { matchesGenre, type GenreId } from "../../../utils/genreFilter"

export const useFilters = (allCafes: Cafe[]) => {
  const [filterOpenNow, setFilterOpenNow] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState<GenreId[]>([])

  const filteredCafes = useMemo(() => {
    let result = allCafes
    if (filterOpenNow) {
      result = result.filter(cafe => isOpenNow(cafe.opening_hours) === true)
    }
    if (selectedGenre.length > 0) {
      result = result.filter(cafe =>
        selectedGenre.some(genreId => matchesGenre(cafe.categories, genreId))
      )
    }
    return result
  }, [allCafes, filterOpenNow, selectedGenre])

  const toggleOpenNow = useCallback(() => {
    setFilterOpenNow(prev => !prev)
  }, [])

  const toggleGenre = useCallback((genreId: GenreId) => {
    setSelectedGenre(prev =>
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    )
  }, [])

  return {
    filterOpenNow,
    selectedGenre,
    filteredCafes,
    toggleOpenNow,
    toggleGenre,
  }
}
