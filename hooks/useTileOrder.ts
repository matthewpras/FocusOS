"use client"

import { useEffect, useState } from "react"

const DEFAULT_TILE_ORDER = ["tasks", "calendar", "habits", "capture"]
const KEY = "focus-os.tile-order"

export function useTileOrder() {
  const [order, setOrder] = useState(DEFAULT_TILE_ORDER)

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY)
    if (!saved) return

    const parsed = JSON.parse(saved) as string[]
    const merged = [
      ...parsed.filter((item) => DEFAULT_TILE_ORDER.includes(item)),
      ...DEFAULT_TILE_ORDER.filter((item) => !parsed.includes(item)),
    ]
    setOrder(merged)
  }, [])

  function updateOrder(nextOrder: string[]) {
    setOrder(nextOrder)
    window.localStorage.setItem(KEY, JSON.stringify(nextOrder))
  }

  return { order, setOrder: updateOrder, defaultOrder: DEFAULT_TILE_ORDER }
}
