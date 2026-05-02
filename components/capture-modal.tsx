"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

export function CaptureModal({ onSave }: { onSave: (text: string) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")

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
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("open-capture", openCapture)
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  function save() {
    if (!text.trim()) return
    onSave(text)
    setText("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="border-white/[0.1] bg-[#101010]/95 text-white backdrop-blur-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quick capture</DialogTitle>
        </DialogHeader>
        <Textarea
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              save()
            }
          }}
          placeholder="Drop thought here..."
          className="min-h-36 resize-none border-white/[0.08] bg-white/[0.05]"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
