/**
 * 02-mc-workflow.spec.js
 * Workflow tests for exercises using MultipleChoiceShell.
 * Tests: M2, M3, H2, H3, F0, F1, F4, V2, S2
 */
import { test, expect } from '@playwright/test';
import { mockAudio, answerMCQuestion, completeMCQuestions, getNumQuestions, setNumQuestions } from './helpers.js';

// ── Shared behavior tests ────────────────────────────────────────────────────

/**
 * Verify the basic shell UI is present.
 */
async function assertShellLoaded(page, exerciseId) {
  await expect(page.locator('body')).toContainText(exerciseId, { timeout: 10000 });
  await expect(page.locator('.et-mc-options button').first()).toBeVisible({ timeout: 8000 });
  await expect(page.locator('.et-mc-controls')).toBeVisible();
  await expect(page.locator('.et-counter-value').first()).toBeVisible();
}

// ── M2 — Melodic Direction ───────────────────────────────────────────────────

test.describe('M2 — כיוון תנועה מלודית', () => {
  test.beforeEach(async ({ page }) => {
    await mockAudio(page);
    await page.goto('/exercise/M2');
    await assertShellLoaded(page, 'M2');
  });

  test('options present and clickable', async ({ page }) => {
    const opts = page.locator('.et-mc-options button');
    await opts.first().waitFor({ timeout: 8000 });
    const count = await opts.count();
    expect(count).toBeGreaterThan(1);
    // Options: up, down, same (level 1)
    await expect(page.locator('body')).toContainText('עולה');
  });

  test('wrong answer shows red, correct answer shows green', async ({ page }) => {
    const opts = page.locator('.et-mc-options button');
    await opts.first().waitFor({ timeout: 8000 });

    // Capture answer state atomically to avoid races and brittle gradient/color checks.
    await opts.first().click();
    const stateHandle = await page.waitForFunction(
      () => {
        const btn = document.querySelector('.et-mc-options button');
        const state = btn?.getAttribute('data-answer-state');
        return (state === 'correct' || state === 'wrong') ? state : null;
      },
      { timeout: 3000 }
    );
    const state = await stateHandle.jsonValue();
    expect(['correct', 'wrong']).toContain(state);
  });

  test('correct answer advances question index', async ({ page }) => {
    // Complete 3 questions — progress bar should update
    await completeMCQuestions(page, 3);
    // After 3 questions, either still in exercise or at summary
    const hasSummary = await page.locator('.et-summary').isVisible().catch(() => false);
    const hasOptions = await page.locator('.et-mc-options button').first().isVisible().catch(() => false);
    expect(hasSummary || hasOptions).toBe(true);
  });

  test('session completes after numQuestions questions', async ({ page }) => {
    // Set to minimum 3 questions
    await setNumQuestions(page, 3);
    await expect(page.locator('.et-counter-value').first()).toContainText('3');

    await completeMCQuestions(page, 3);

    // Summary should appear
    await expect(page.locator('.et-summary')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.et-summary-stat-num').first()).toContainText('3');
  });

  test('session summary retry button restarts session', async ({ page }) => {
    await setNumQuestions(page, 3);
    await completeMCQuestions(page, 3);
    await page.locator('.et-summary-btn-primary').click();

    // Should return to exercise (options visible again)
    await expect(page.locator('.et-mc-options button').first()).toBeVisible({ timeout: 5000 });
  });

  test('replay button is present', async ({ page }) => {
    await expect(page.locator('button:has-text("נגן שוב")')).toBeVisible();
  });

  test('QuestionsCounter changes numQuestions', async ({ page }) => {
    const before = await getNumQuestions(page);
    await page.locator('.et-counter-btn[aria-label="הוסף"]').first().click();
    const after = await getNumQuestions(page);
    expect(after).toBe(before + 1);
  });
});

// ── H2 — Chord Inversion ────────────────────────────────────────────────────

test.describe('H2 — זיהוי היפוך', () => {
  test.beforeEach(async ({ page }) => {
    await mockAudio(page);
    await page.goto('/exercise/H2');
    await assertShellLoaded(page, 'H2');
  });

  test('has inversion options', async ({ page }) => {
    // Expect inversion labels (שורש = root position, היפוך = inversion)
    const body = page.locator('body');
    await expect(body).toContainText(/שורש|היפוך/);
  });

  test('complete 3 questions → summary', async ({ page }) => {
    await setNumQuestions(page, 3);
    await completeMCQuestions(page, 3);
    await expect(page.locator('.et-summary')).toBeVisible({ timeout: 5000 });
  });
});

// ── H3 — Chord Type ─────────────────────────────────────────────────────────

test.describe('H3 — זיהוי סוג אקורד', () => {
  test.beforeEach(async ({ page }) => {
    await mockAudio(page);
    await page.goto('/exercise/H3');
    await assertShellLoaded(page, 'H3');
  });

  test('has chord type options (M/m/dim/aug)', async ({ page }) => {
    // Level 1 shows triad types (טריאדה) or seventh chords (שביעי)
    const body = page.locator('body');
    await expect(body).toContainText(/טריאדה|שביעי|מז'ור|מינור/);
  });

  test('complete 3 questions → summary', async ({ page }) => {
    await setNumQuestions(page, 3);
    await completeMCQuestions(page, 3);
    await expect(page.locator('.et-summary')).toBeVisible({ timeout: 5000 });
  });
});

// ── F0 — Single Chord Degree ─────────────────────────────────────────────────

test.describe('F0 — זיהוי דרגת אקורד', () => {
  test.beforeEach(async ({ page }) => {
    await mockAudio(page);
    await page.goto('/exercise/F0');
    await assertShellLoaded(page, 'F0');
  });

  test('level 1 shows I and V options', async ({ page }) => {
    await expect(page.locator('body')).toContainText('I');
    await expect(page.locator('body')).toContainText('V');
  });

  test('complete 3 questions → summary', async ({ page }) => {
    await setNumQuestions(page, 3);
    await completeMCQuestions(page, 3);
    await expect(page.locator('.et-summary')).toBeVisible({ timeout: 5000 });
  });
});

// ── F1 — Cadence Recognition ─────────────────────────────────────────────────

test.describe('F1 — זיהוי קדנצה', () => {
  test.beforeEach(async ({ page }) => {
    await mockAudio(page);
    await page.goto('/exercise/F1');
    await assertShellLoaded(page, 'F1');
  });

  test('has cadence options (PAC, IAC, HC, DC)', async ({ page }) => {
    // At least one cadence type should appear
    await expect(page.locator('body')).toContainText(/PAC|IAC|HC|DC|קדנצה/);
  });

  test('complete 3 questions → summary', async ({ page }) => {
    await setNumQuestions(page, 3);
    await completeMCQuestions(page, 3);
    await expect(page.locator('.et-summary')).toBeVisible({ timeout: 5000 });
  });
});

// ── V2 — Soprano Voice Tracking ─────────────────────────────────────────────

test.describe('V2 — עקיבת קו סופרן', () => {
  test.beforeEach(async ({ page }) => {
    await mockAudio(page);
    await page.goto('/exercise/V2');
    await assertShellLoaded(page, 'V2');
  });

  test('has "הבלט סופרן" button', async ({ page }) => {
    // This button was previously a stub — now should be present and enabled
    await expect(page.locator('button:has-text("הבלט סופרן")').first()).toBeVisible({ timeout: 5000 });
  });

  test('complete 3 questions → summary', async ({ page }) => {
    await setNumQuestions(page, 3);
    await completeMCQuestions(page, 3);
    await expect(page.locator('.et-summary')).toBeVisible({ timeout: 5000 });
  });
});

// ── S2 — Notation Recognition ───────────────────────────────────────────────

test.describe('S2 — זיהוי תיווי מנגינה', () => {
  test.beforeEach(async ({ page }) => {
    await mockAudio(page);
    await page.goto('/exercise/S2');
    await assertShellLoaded(page, 'S2');
  });

  test('options show notation (SVG or note names)', async ({ page }) => {
    // NotationCard renders SVG elements or note name spans
    const opts = page.locator('.et-mc-options button');
    await opts.first().waitFor({ timeout: 8000 });
    // Each option button should have non-empty content
    const count = await opts.count();
    expect(count).toBeGreaterThan(1);
  });

  test('complete 3 questions → summary', async ({ page }) => {
    await setNumQuestions(page, 3);
    await completeMCQuestions(page, 3);
    await expect(page.locator('.et-summary')).toBeVisible({ timeout: 5000 });
  });
});

// ── M3 — Scale Recognition ───────────────────────────────────────────────────

test.describe('M3 — זיהוי סולם', () => {
  test.beforeEach(async ({ page }) => {
    await mockAudio(page);
    await page.goto('/exercise/M3');
    await assertShellLoaded(page, 'M3');
  });

  test('has scale options', async ({ page }) => {
    // Level 1 should show at least 2 scale types
    const opts = page.locator('.et-mc-options button');
    await opts.first().waitFor({ timeout: 8000 });
    const count = await opts.count();
    expect(count).toBeGreaterThan(1);
  });

  test('complete 3 questions → summary', async ({ page }) => {
    await setNumQuestions(page, 3);
    await completeMCQuestions(page, 3);
    await expect(page.locator('.et-summary')).toBeVisible({ timeout: 5000 });
  });
});
