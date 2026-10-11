import { test, expect } from '@playwright/test';

test.describe('Results Screen & Game History', () => {
    test('Results screen opens with R key and displays charts, timeline, standings, and statistics tabs', async ({ page }) => {
        const mockBoardId = '36fa22db-04d6-435c-ba62-167057786c25';
        const mockPlayer1Id = 'fa0c1ce7-41e7-4756-99d8-3adae6343af8';
        const mockPlayer2Id = '7b95dd5e-3891-45f8-8bb8-b0a6e29aa450';

        // Mock Session API
        await page.route(`**/api/Sessions/test-session-results`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'test-session-results',
                    description: 'Test Session',
                    boardId: mockBoardId,
                    startTime: '2026-10-11T12:00:00Z',
                    endTime: null,
                    playerIds: [mockPlayer1Id, mockPlayer2Id]
                })
            });
        });

        // Mock Players API
        await page.route(`**/api/Sessions/test-session-results/players`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: mockPlayer1Id, name: 'Alice' },
                    { id: mockPlayer2Id, name: 'Bob' }
                ])
            });
        });

        await page.route(`**/api/Players/${mockPlayer1Id}`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: mockPlayer1Id, name: 'Alice' })
            });
        });

        await page.route(`**/api/Players/${mockPlayer2Id}`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: mockPlayer2Id, name: 'Bob' })
            });
        });

        // Mock GameState API
        await page.route(`**/api/GameBoards/${mockBoardId}/gamestate`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    players: {
                        [mockPlayer1Id]: { money: 75000, boardPosition: 8, skipNextTurn: false },
                        [mockPlayer2Id]: { money: 62000, boardPosition: 14, skipNextTurn: false }
                    },
                    routes: [
                        { cityPair: { city1: 2, city2: 6 }, numTracks: 2 } // Montreal - Toronto
                    ],
                    properties: [
                        { city: 2, owner_PID: mockPlayer1Id }
                    ],
                    isGameOver: false,
                    currentPlayerId: mockPlayer1Id,
                    turnPhase: 0,
                    validActions: [6], // Roll
                    dice1: 4,
                    dice2: 3,
                    pendingTrade: null
                })
            });
        });

        // Mock Game History Endpoint
        const sampleHistory = [
            {
                turn: 1,
                currentPlayerId: mockPlayer1Id,
                dice1: 5,
                dice2: 2,
                players: {
                    [mockPlayer1Id]: { money: 67000, boardPosition: 7 }
                },
                properties: [
                    { city: 'Montreal', owner_PID: mockPlayer1Id }
                ]
            },
            {
                turn: 2,
                currentPlayerId: mockPlayer2Id,
                dice1: 3,
                dice2: 4,
                players: {
                    [mockPlayer2Id]: { money: 82000, boardPosition: 7 }
                },
                routes: [
                    {
                        cityPair: { city1: 'Montreal', city2: 'Toronto' },
                        numTracks: 1
                    }
                ]
            },
            {
                turn: 3,
                currentPlayerId: mockPlayer1Id,
                dice1: 6,
                dice2: 2,
                players: {
                    [mockPlayer1Id]: { money: 75000, boardPosition: 15, skipNextTurn: true }
                },
                routes: [
                    {
                        cityPair: { city1: 'Montreal', city2: 'Toronto' },
                        numTracks: 2
                    }
                ],
                isGameOver: false
            }
        ];

        let lastHistoryUrl = '';
        await page.route(`**/api/GameBoards/${mockBoardId}/game-history*`, async (route) => {
            lastHistoryUrl = route.request().url();
            const url = new URL(lastHistoryUrl);
            const startParam = url.searchParams.get('start') || url.searchParams.get('startTurn');
            const endParam = url.searchParams.get('end') || url.searchParams.get('endTurn');

            let result = sampleHistory;
            if (startParam !== null) {
                const s = parseInt(startParam, 10);
                result = result.filter(h => h.turn >= s);
            }
            if (endParam !== null) {
                const e = parseInt(endParam, 10);
                result = result.filter(h => h.turn <= e);
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(result)
            });
        });

        // Setup session storage player ID
        await page.addInitScript(({ sId, pId }) => {
            sessionStorage.setItem(`ls_pid_${sId}`, pId);
        }, { sId: 'test-session-results', pId: mockPlayer1Id });

        // Navigate to session
        await page.goto('/session/test-session-results');

        // Verify game board loaded
        await expect(page.locator('#results-screen-backdrop')).not.toBeVisible();

        // 1. Press 'R' key to open results screen
        await page.keyboard.press('r');
        await expect(page.locator('#results-screen-backdrop')).toBeVisible();
        await expect(page.locator('#results-screen-backdrop h1')).toBeVisible();

        // 2. Verify raw tab is removed
        await expect(page.locator('#tab-raw-data')).not.toBeVisible();

        // 3. Default Tab (Statistics) verification
        await expect(page.locator('#statistics-table')).toBeVisible();
        await expect(page.locator('#stat-row-cpr-subsidy')).toBeVisible();
        await expect(page.locator('#stat-row-track')).toBeVisible();
        await expect(page.locator('#stat-row-properties-acquired')).toBeVisible();
        await expect(page.locator('#stat-row-properties-acquired')).toContainText('Properties Acquired');

        // 4. Charts Tab verification
        await page.click('#tab-analytics');
        await expect(page.getByRole('heading', { name: 'Money' })).toBeVisible();
        await expect(page.locator('svg polyline').first()).toBeVisible();

        // 5. Replay Tab verification
        await page.click('#tab-timeline');
        await expect(page.locator('#timeline-turn-1')).toBeVisible();
        await expect(page.locator('aside[aria-label="Players Information"]')).toBeVisible();
        await expect(page.locator('#replay-scrubber')).toBeVisible();
        await expect(page.locator('#replay-btn-play')).toBeVisible();

        // Test stepping forward to Turn 2
        await page.click('#replay-btn-next');
        await expect(page.locator('#timeline-turn-2')).toBeVisible();

        // Test jumping to last turn (Turn 3)
        await page.click('#replay-btn-last');
        await expect(page.locator('#timeline-turn-3')).toBeVisible();

        // Test stepping back to Turn 2
        await page.click('#replay-btn-prev');
        await expect(page.locator('#timeline-turn-2')).toBeVisible();

        // 6. Standings Tab verification
        await page.click('#tab-standings');
        const modal = page.locator('#results-screen-backdrop');
        await expect(modal.getByText('Alice')).toBeVisible();
        await expect(modal.getByText('Bob')).toBeVisible();

        // 7. Press 'R' key again to toggle close
        await page.keyboard.press('r');
        await expect(page.locator('#results-screen-backdrop')).not.toBeVisible();

        // 8. Press 'R' to reopen and test close button and caching between invocations
        let historyRefetchCount = 0;
        await page.route(`**/api/GameBoards/${mockBoardId}/game-history*`, async (route) => {
            historyRefetchCount++;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(sampleHistory)
            });
        });

        await page.keyboard.press('r');
        await expect(page.locator('#results-screen-backdrop')).toBeVisible();
        // Values and precomputed information are immediately visible without loading spinner
        await expect(page.locator('#statistics-table')).toBeVisible();
        await expect(page.locator('#stat-row-properties-acquired')).toBeVisible();
        // Cached data was used; no network refetch occurred
        expect(historyRefetchCount).toBe(0);

        await page.click('#results-close-button');
        await expect(page.locator('#results-screen-backdrop')).not.toBeVisible();
    });

    test('GameOverScreen has View Game Results button that opens ResultsScreen', async ({ page }) => {
        const mockBoardId = '36fa22db-04d6-435c-ba62-167057786c25';
        const mockPlayer1Id = 'fa0c1ce7-41e7-4756-99d8-3adae6343af8';

        await page.route(`**/api/Sessions/test-game-over-session`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'test-game-over-session',
                    description: 'Game Over Session',
                    boardId: mockBoardId,
                    startTime: '2026-10-11T12:00:00Z',
                    endTime: '2026-10-11T12:30:00Z',
                    playerIds: [mockPlayer1Id]
                })
            });
        });

        await page.route(`**/api/Sessions/test-game-over-session/players`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{ id: mockPlayer1Id, name: 'Champion' }])
            });
        });

        await page.route(`**/api/Players/${mockPlayer1Id}`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: mockPlayer1Id, name: 'Champion' })
            });
        });

        await page.route(`**/api/GameBoards/${mockBoardId}/gamestate`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    players: { [mockPlayer1Id]: { money: 120000, boardPosition: 20, skipNextTurn: false } },
                    routes: [],
                    properties: [],
                    isGameOver: true,
                    currentPlayerId: mockPlayer1Id,
                    turnPhase: 3,
                    validActions: [],
                    dice1: 6,
                    dice2: 6,
                    pendingTrade: null
                })
            });
        });

        await page.route(`**/api/GameBoards/${mockBoardId}/game-history*`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { turn: 1, dice1: 6, dice2: 6, isGameOver: true }
                ])
            });
        });

        await page.addInitScript(({ sId, pId }) => {
            sessionStorage.setItem(`ls_pid_${sId}`, pId);
        }, { sId: 'test-game-over-session', pId: mockPlayer1Id });

        await page.goto('/session/test-game-over-session');

        // Wait for GameOverScreen to appear (either immediately or after animation timeout)
        // In session page, game over animation is 10s or we can wait for game-over-view-results-button
        const viewResultsBtn = page.locator('#game-over-view-results-button');
        await expect(viewResultsBtn).toBeVisible({ timeout: 15000 });

        // Click to view results screen
        await viewResultsBtn.click();
        await expect(page.locator('#results-screen-backdrop')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
    });
});
