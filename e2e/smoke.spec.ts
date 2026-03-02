import { test, expect } from '@playwright/test';

test.describe('Smoke E2E', () => {
  test('landing page deve carregar sem erros', async ({ page }) => {
    await page.goto('/');
    
    // Aguarda network idle
    await page.waitForLoadState('networkidle');
    
    // Verifica que não há texto de erro fatal no body
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toMatch(/(Error|Unhandled|Unexpected)/i);
    
    // Verifica presença de elemento estável (nav)
    await expect(page.locator('nav').first()).toBeVisible();
  });

  test('página de performance deve carregar sem erros', async ({ page }) => {
    await page.goto('/performance');
    
    // Aguarda network idle ou timeout
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    
    // Pode redirecionar para login se não estiver autenticado
    // O importante é que não crash
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toMatch(/(Error|Unhandled|Unexpected)/i);
  });
});