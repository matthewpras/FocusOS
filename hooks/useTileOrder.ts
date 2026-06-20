"use client"

import { useEffect, useState } from "react"

const DEFAULT_TILE_ORDER = ["tasks", "calendar", "habits", "capture"]
const KEY = "focus-os.tile-order"

export function useTileOrder() {
  const [order, setOrder] = useState(DEFAULT_TILE_ORDER)

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY)
    if (!saved) return

    try {
      const parsed = JSON.parse(saved)
      if (!Array.isArray(parsed)) {
        window.localStorage.removeItem(KEY)
        return
      }

      const nextOrder = parsed.filter(
        (item): item is string =>
          typeof item === "string" && DEFAULT_TILE_ORDER.includes(item),
      )

      const merged = [
        ...nextOrder,
        ...DEFAULT_TILE_ORDER.filter((item) => !nextOrder.includes(item)),
      ]

      setOrder(merged)
    } catch {
      window.localStorage.removeItem(KEY)
    }
  }, [])

  function updateOrder(nextOrder: string[]) {
    setOrder(nextOrder)
    window.localStorage.setItem(KEY, JSON.stringify(nextOrder))
  }

  return { order, setOrder: updateOrder, defaultOrder: DEFAULT_TILE_ORDER }
}
