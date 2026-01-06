import { test, expect } from '@playwright/test';
import path from 'path';

test('Generate README Images', async ({ browser }) => {
    // Create contexts
    const hostContext = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    const playerContext = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });

    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    // 1. Landing Page
    await hostPage.goto('/');

    // Fill name
    const nameInput = hostPage.locator('input#name');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Host Player');

    // Click away to ensure no focus ring if possible
    await hostPage.click('body');

    // Take Landing Page screenshot
    await hostPage.screenshot({ path: 'README_imgs/landing.png' });
    console.log('Saved README_imgs/landing.png');

    // 2. Create Session & Lobby
    const createBtn = hostPage.locator('text=Create New Session');

    // Ensure button is enabled and visible
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toBeEnabled();

    await createBtn.click();

    // Wait for lobby to load with increased timeout
    await expect(hostPage).toHaveURL(/\/session\/.+/, { timeout: 10000 });

    const sessionIdLocator = hostPage.locator('span.font-mono').first();
    await expect(sessionIdLocator).toBeVisible();
    const sessionId = await sessionIdLocator.innerText();
    console.log(`Session ID: ${sessionId}`);

    // Join with Player 2
    await playerPage.goto('/');
    await playerPage.fill('input#name', 'Player 2');

    const sessionInput = playerPage.locator('input[placeholder="Session ID"]');
    await sessionInput.fill(sessionId);

    const joinBtn = playerPage.locator('text=Join Session');
    await expect(joinBtn).toBeEnabled();
    await joinBtn.click();

    // Wait for Player 2 to join and appear in Host's lobby
    await expect(playerPage).toHaveURL(/\/session\/.+/);
    await expect(hostPage.locator('text=Player 2')).toBeVisible();

    // Take Lobby screenshot
    await hostPage.screenshot({ path: 'README_imgs/lobby.png' });
    console.log('Saved README_imgs/lobby.png');

    // 3. Start Game
    const startBtn = hostPage.locator('button:has-text("Start Game")');
    await expect(startBtn).toBeEnabled();
    await startBtn.click();

    // Wait for game to start (gameState check)
    // Using a more robust check: Wait for the game board SVG to appear
    await expect(hostPage.locator('svg')).first().toBeVisible({ timeout: 20000 });

    // Wait a bit for the board animation/rendering to settle
    await hostPage.waitForTimeout(3000);

    // Take Game In Progress screenshot
    await hostPage.screenshot({ path: 'README_imgs/game_in_progress.png' });
    console.log('Saved README_imgs/game_in_progress.png');
});
