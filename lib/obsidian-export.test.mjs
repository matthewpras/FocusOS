import test from "node:test"
import assert from "node:assert/strict"

const obsidianExport = await import("./obsidian-export.ts")

test("getObsidianStatus reports local export when vault path exists", () => {
  assert.deepEqual(obsidianExport.getObsidianStatus("/Users/matthew/Vault"), {
    mode: "local",
    enabled: true,
    writable: true,
    message: "Local Obsidian vault configured.",
  })
})

test("getObsidianStatus reports cloud-safe fallback when vault path is missing", () => {
  assert.deepEqual(obsidianExport.getObsidianStatus(null), {
    mode: "fallback",
    enabled: true,
    writable: false,
    message: "Local Obsidian vault not configured. Export returns markdown for manual save.",
  })
})

test("buildCaptureExport creates stable capture markdown and target path", () => {
  const exportItem = obsidianExport.buildCaptureExport(
    {
      id: "cap-1",
      text: "Call advisor\nAsk about schedule",
      created_at: "2026-07-05T14:30:00.000Z",
    },
    {
      vaultPath: "/Users/matthew/Vault",
      target: "Inbox",
      now: new Date("2026-07-05T15:00:00.000Z"),
    },
  )

  assert.equal(exportItem.relativePath, "Focus OS/Inbox/2026-07-05-captures.md")
  assert.equal(exportItem.filePath, "/Users/matthew/Vault/Focus OS/Inbox/2026-07-05-captures.md")
  assert.match(exportItem.markdown, /## Capture - 2026-07-05 14:30 UTC/)
  assert.match(exportItem.markdown, /Call advisor\nAsk about schedule/)
})

test("buildCaptureExport includes Hermes-readable links and media", () => {
  const exportItem = obsidianExport.buildCaptureExport(
    {
      id: "cap-rich-1",
      text: "Need Hermes to inspect this TikTok and screenshot.",
      created_at: "2026-07-09T13:25:00.000Z",
      links: [
        {
          url: "https://www.tiktok.com/@focus/video/123",
          kind: "tiktok",
        },
        {
          url: "https://youtu.be/abc123",
          kind: "youtube",
        },
      ],
      media_items: [
        {
          name: "schedule.png",
          type: "image/png",
          size: 48231,
          data_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE=",
        },
      ],
      intake: {
        obsidian_target: "Hermes/Captures",
        agent_status: "queued",
      },
    },
    {
      vaultPath: null,
      target: "Inbox",
      now: new Date("2026-07-09T15:00:00.000Z"),
    },
  )

  assert.match(exportItem.markdown, /## Hermes Intake Packet/)
  assert.match(exportItem.markdown, /Agent status: queued/)
  assert.match(exportItem.markdown, /- \[tiktok\] https:\/\/www\.tiktok\.com\/@focus\/video\/123/)
  assert.match(exportItem.markdown, /- \[youtube\] https:\/\/youtu\.be\/abc123/)
  assert.match(exportItem.markdown, /### Media/)
  assert.match(exportItem.markdown, /- schedule\.png \(image\/png, 48231 bytes\)/)
  assert.match(exportItem.markdown, /!\[schedule\.png\]\(data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE=\)/)
})

test("buildCaptureExport sanitizes custom Obsidian target folders", () => {
  const exportItem = obsidianExport.buildCaptureExport(
    {
      id: "cap-2",
      text: "Revenue idea",
      created_at: "2026-07-05T14:30:00.000Z",
    },
    {
      vaultPath: null,
      target: "../Revenue//Ideas",
      now: new Date("2026-07-05T15:00:00.000Z"),
    },
  )

  assert.equal(exportItem.relativePath, "Focus OS/Revenue/Ideas/2026-07-05-captures.md")
  assert.equal(exportItem.filePath, null)
})
