// @ts-check
const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
