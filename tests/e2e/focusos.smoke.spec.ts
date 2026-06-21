import { expect, test } from "@playwright/test"

test.describe("FocusOS shell", () => {
  test("renders command center without framework errors", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Schedule" })).toBeVisible()
    await expect(page.getByText("Type a command or search")).toBeVisible()
    await expect(page.locator("[data-nextjs-dialog], .vite-error-overlay")).toHaveCount(0)
  })

  test("keeps mobile command center usable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")

    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible()
    await expect(page).toHaveScreenshot("focusos-mobile-command-center.png", {
      fullPage: true,
    })
  })
})
