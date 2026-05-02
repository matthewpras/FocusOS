"use client"

import Link from "next/link"
import { Inbox } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Capture } from "@/types"

export function CaptureInboxWidget({ captures }: { captures: Capture[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div className="text-4xl font-semibold text-white">{captures.length}</div>
        <Inbox className="size-7 text-white/30" />
      </div>
      <div className="space-y-2">
        {captures.slice(0, 3).map((capture) => (
          <p
            key={capture.id}
            className="truncate rounded-md bg-black/20 px-3 py-2 text-sm text-white/60"
          >
            {capture.text}
          </p>
        ))}
        {!captures.length ? (
          <p className="rounded-md border border-dashed border-white/[0.1] p-4 text-sm text-white/45">
            Inbox empty.
          </p>
        ) : null}
      </div>
      <Link href="/capture" className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>
        Review inbox
      </Link>
    </div>
  )
}
