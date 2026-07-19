"use client"

import { useEffect, useState } from "react"
import { CaptureComposer } from "@/components/capture-composer"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { RichCaptureInput } from "@/types"

export function CaptureModal({
  onSave,
}: {
  onSave: (input: RichCaptureInput) => Promise<void> | void
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function openCapture() {
      setOpen(true)
    }
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("open-capture", openCapture)
    window.addEventListener("focusos:open-capture", openCapture)
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("open-capture", openCapture)
      window.removeEventListener("focusos:open-capture", openCapture)
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="border-[var(--today-line)] bg-[var(--today-sidebar)]/95 text-[var(--today-ink)] backdrop-blur-xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Hermes capture</DialogTitle>
        </DialogHeader>
        <CaptureComposer
          autoFocus
          compact
          submitLabel="Queue"
          onSave={onSave}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
