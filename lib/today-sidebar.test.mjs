import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

test("Today sidebar only navigates to Today until matching Today-native views exist", () => {
  const source = readFileSync("components/today-home/dark-today-sidebar.tsx", "utf8")

  assert.match(source, /label: "Today", icon: Home, href: "\/"/)
  assert.doesNotMatch(source, /href: "\/capture"/)
  assert.doesNotMatch(source, /href: "\/calendar"/)
  assert.doesNotMatch(source, /href: "\/operations"/)
})
