"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CaptureFAB() {
  function openCapture() {
    window.dispatchEvent(new Event("open-capture"))
  }

  return (
    <Button
      aria-label="Quick capture"
      size="icon"
      className="fixed bottom-20 right-5 z-40 size-14 rounded-lg bg-white text-black shadow-2xl shadow-[var(--accent-blue)]/25 hover:bg-white/90 lg:bottom-6"
      onClick={openCapture}
      onContextMenu={(event) => {
        event.preventDefault()
        openCapture()
      }}
    >
      <Plus className="size-6" />
    </Button>
  )
}
