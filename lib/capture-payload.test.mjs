import test from "node:test"
import assert from "node:assert/strict"

const capturePayload = await import("./capture-payload.ts")

test("extractCaptureLinks classifies TikTok, YouTube, and general URLs", () => {
  assert.deepEqual(
    capturePayload.extractCaptureLinks([
      "Watch https://www.tiktok.com/@focus/video/123",
      "Also https://youtu.be/abc123",
      "Reference https://example.com/path.",
    ]),
    [
      { url: "https://www.tiktok.com/@focus/video/123", kind: "tiktok" },
      { url: "https://youtu.be/abc123", kind: "youtube" },
      { url: "https://example.com/path", kind: "link" },
    ],
  )
})

test("buildCaptureText keeps notes readable and appends explicit links", () => {
  assert.equal(
    capturePayload.buildCaptureText({
      note: "Hermes should turn this into an Obsidian note.",
      links: [
        { url: "https://youtube.com/watch?v=abc123", kind: "youtube" },
      ],
    }),
    "Hermes should turn this into an Obsidian note.\n\nLinks:\n- https://youtube.com/watch?v=abc123",
  )
})
