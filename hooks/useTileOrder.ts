"use client"

import { useEffect, useState } from "react"

const DEFAULT_TILE_ORDER = ["tasks", "habits", "capture"]
const KEY = "focus-os.tile-order"

export function useTileOrder() {
  const [order, setOrder] = useState(DEFAULT_TILE_ORDER)

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY)
    if (saved) setOrder(JSON.parse(saved))
  }, [])

  function updateOrder(nextOrder: string[]) {
    setOrder(nextOrder)
    window.localStorage.setItem(KEY, JSON.stringify(nextOrder))
  }

  return { order, setOrder: updateOrder, defaultOrder: DEFAULT_TILE_ORDER }
}
