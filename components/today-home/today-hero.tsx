"use client"

import Image from "next/image"
import { Inbox, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AssistantFreshness, FocusPressure } from "@/lib/today-home"
import { formatFocusMinutes } from "@/lib/today-home"

type TodayHeroProps = {
  dateLabel: string
  inboxCount: number
  taskCount: number
  pressure: FocusPressure
  assistantFreshness: AssistantFreshness
  assistantRunning: boolean
  onOpenInbox: () => void
  onRunHermes: () => void
}

function freshnessClass(state: AssistantFreshness["state"]) {
  if (state === "healthy") {
    return "border-emerald-300/35 bg-emerald-300/14 text-emerald-50"
  }
  if (state === "failed") {
    return "border-red-300/40 bg-red-400/18 text-red-50"
  }
  if (state === "stale") {
    return "border-amber-200/45 bg-amber-300/16 text-amber-50"
  }
  return "border-slate-200/35 bg-white/10 text-slate-50"
}

export function TodayHero({
  dateLabel,
  inboxCount,
  taskCount,
  pressure,
  assistantFreshness,
  assistantRunning,
  onOpenInbox,
  onRunHermes,
}: TodayHeroProps) {
  return (
    <section className="relative isolate overflow-hidden rounded-[16px] bg-[#070817] px-4 py-4 text-white shadow-[0_22px_60px_rgba(24,19,78,0.26)] sm:px-5 sm:py-5 lg:px-6">
      <Image
        src="/today-earth-aurora.png"
        alt=""
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 86rem"
        className="absolute inset-0 -z-30 size-full object-cover object-[58%_50%]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(5,6,22,0.95)_0%,rgba(8,9,31,0.78)_43%,rgba(9,10,32,0.36)_74%,rgba(6,7,21,0.48)_100%)]"
      />
      <div aria-hidden="true" className="today-hero-ambient absolute inset-0 -z-10" />
      <div aria-hidden="true" className="today-hero-stars absolute inset-0 -z-10" />

      <div className="relative flex min-h-[20rem] flex-col justify-between gap-8 sm:min-h-[21rem]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/78">
              {dateLabel}
            </p>
            <h1 className="mt-3 max-w-[11ch] text-[3rem] font-semibold leading-[0.92] tracking-normal text-white sm:text-[4.4rem]">
              Today
            </h1>
            <p className="mt-4 max-w-[33rem] text-sm leading-6 text-slate-100/84 sm:text-[0.95rem]">
              Good evening, Matthew. Keep today clean, visible, and moving.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:max-w-[28rem] sm:justify-end">
            <span className="rounded-full border border-cyan-200/30 bg-cyan-200/12 px-3 py-1.5 text-xs font-semibold text-cyan-50 shadow-[0_0_28px_rgba(85,206,255,0.14)]">
              {pressure.score}/100 · {formatFocusMinutes(pressure.availableFocusMinutes)} open
            </span>
            <span
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold shadow-[0_0_24px_rgba(255,255,255,0.08)] ${freshnessClass(
                assistantFreshness.state,
              )}`}
              title={assistantFreshness.detail}
            >
              {assistantFreshness.label}
            </span>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="grid gap-2 sm:grid-cols-2 lg:max-w-[31rem]">
            <div className="rounded-[14px] border border-white/14 bg-black/22 px-3 py-3 backdrop-blur-md">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-200/70">
                Visible Actions
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">{taskCount}</p>
              <p className="mt-1 text-xs text-slate-200/72">tasks ready for today</p>
            </div>
            <div className="rounded-[14px] border border-white/14 bg-black/22 px-3 py-3 backdrop-blur-md">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-200/70">
                Capture Load
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">{inboxCount}</p>
              <p className="mt-1 text-xs text-slate-200/72">items waiting in inbox</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 border-white/18 bg-white/10 px-3 text-white hover:bg-white/18 hover:text-white"
              onClick={onOpenInbox}
            >
              <Inbox className="size-4" />
              Inbox
            </Button>
            <Button
              type="button"
              className="h-10 bg-cyan-200 px-3 text-slate-950 hover:bg-cyan-100"
              onClick={onRunHermes}
              disabled={assistantRunning}
            >
              {assistantRunning ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Run Hermes
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
