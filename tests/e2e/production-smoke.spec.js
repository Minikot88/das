import { test, expect } from '@playwright/test';
import axe from 'axe-core';

test('anonymous authentication shell is accessible and responsive', async ({ page }) => {
  const errors = [];
  const authStatuses = [];
  const unexpectedUnauthorized = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() !== 401) return;
    if (response.url().includes('/api/v1/auth/me')) authStatuses.push(response.status());
    else unexpectedUnauthorized.push(response.url());
  });
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('#login-email')).toBeVisible();
  await expect(page.locator('#login-password')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  const results = await page.evaluate(source => {
    eval(source);
    return globalThis.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
  }, axe.source);
  expect(results.violations.filter(item => ['critical', 'serious'].includes(item.impact))).toEqual([]);
  expect(authStatuses).toContain(401);
  expect(unexpectedUnauthorized).toEqual([]);
  expect(errors.filter(message => !/status of 401 (?:\(Unauthorized\)|\(\))/.test(message))).toEqual([]);
});

test('protected routes do not render before session bootstrap', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.locator('#login-email')).toBeVisible();
});
