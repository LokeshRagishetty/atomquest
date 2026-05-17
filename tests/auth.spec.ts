import { test, expect } from "@playwright/test";

const employeeEmail = process.env.PLAYWRIGHT_EMPLOYEE_EMAIL;
const employeePassword = process.env.PLAYWRIGHT_EMPLOYEE_PASSWORD;

test.skip(!employeeEmail || !employeePassword, "Set PLAYWRIGHT_EMPLOYEE_EMAIL and PLAYWRIGHT_EMPLOYEE_PASSWORD.");

test("employee login loads the dashboard", async ({ page }) => {
  await page.goto("/login?role=employee");
  await expect(page.getByRole("heading", { name: "Employee Login" })).toBeVisible();

  await page.fill('input[type="email"]', employeeEmail ?? "");
  await page.fill('input[type="password"]', employeePassword ?? "");

  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/employee\/dashboard/);
  await expect(page.getByRole("heading", { name: /My goals and quarterly progress/i })).toBeVisible();
});
