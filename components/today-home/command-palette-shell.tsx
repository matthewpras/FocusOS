"use client"

import { Inbox, Plus, Search, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type CommandPaletteShellProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onQuickCapture: () => void
  onRunHermes: () => void
  onOpenInbox: () => void
}

const commands = [
  { label: "Quick capture", icon: Plus, action: "capture" },
  { label: "Run Hermes", icon: Sparkles, action: "hermes" },
  { label: "Open Inbox", icon: Inbox, action: "inbox" },
] as const

export function CommandPaletteShell({
  open,
  onOpenChange,
  onQuickCapture,
  onRunHermes,
  onOpenInbox,
}: CommandPaletteShellProps) {
  function run(action: (typeof commands)[number]["action"]) {
    if (action === "capture") onQuickCapture()
    if (action === "hermes") onRunHermes()
    if (action === "inbox") onOpenInbox()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-3 top-auto w-[calc(100%-1.5rem)] max-w-none translate-x-0 translate-y-0 gap-0 rounded-lg border border-white/12 bg-[var(--today-sidebar)] p-0 text-white shadow-none sm:left-auto sm:right-5 sm:w-[25rem]"
      >
        <DialogHeader className="border-b border-white/10 px-3 py-3">
          <DialogTitle className="sr-only">Command palette</DialogTitle>
          <div className="flex items-center gap-2 rounded-md bg-white/8 px-3 py-2 text-sm text-white/70">
            <Search className="size-4" />
            <span>Type a command or search</span>
          </div>
        </DialogHeader>
        <div className="p-2">
          {commands.map((command) => {
            const Icon = command.icon

            return (
              <Button
                key={command.action}
                type="button"
                variant="ghost"
                className="h-11 w-full justify-start gap-3 text-white/82 hover:bg-white/10 hover:text-white focus-visible:ring-white/45"
                onClick={() => run(command.action)}
              >
                <span className="grid size-7 place-items-center rounded-md bg-white/8">
                  <Icon className="size-4" />
                </span>
                {command.label}
              </Button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
