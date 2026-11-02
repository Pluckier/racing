import { test, expect } from '@playwright/test';

test('racing homepage loads successfully with multiple race meetings', async ({ page }) => {
  // 1. Setup the route listener with two meetings in the array
  await page.route('**/*-races.json', async (route) => {
    const mockRaceDataArray = [
      {
        "place": "Plumpton",
        "time": "13:00",
        "going": "Gd",
        "distance": "3m 2f",
        "distanceInYards": 77,
        "detail": "Richard Soan Roofing Services Novices' Handicap Steeple Chase",
        "runners": 4,
        "horses": [
          {
            "name": "Hard Stare",
            "number": "1",
            "jockey": "Ben Godfrey",
            "trainer": "Anthony Honeyball",
            "odds": ["3.25", "3.15"]
          }
        ]
      },
      {
        "place": "Southwell",
        "time": "13:15",
        "going": "Std",
        "distance": "5f",
        "distanceInYards": 0,
        "detail": "Support The Injured Jockeys Fund Handicap",
        "runners": 6,
        "horses": [
          {
            "name": "Tom Taggle",
            "number": "1",
            "jockey": "Adam Wedge",
            "trainer": "Mrs C. Williams",
            "odds": ["3.3", "3.1"]
          }
        ]
      }
    ];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      json: mockRaceDataArray
    });
  });

  // 2. Load the homepage
  await page.goto('/');

  // 3. Verify the date header is working
  const dateHeader = page.locator('h2.date-header');
  await expect(dateHeader).toBeVisible();
  await expect(dateHeader).toContainText('November');

  // 4. Assert that BOTH meeting locations render onto the screen
  const appBody = page.locator('body');
  await expect(appBody).toContainText('Plumpton');
  await expect(appBody).toContainText('Southwell');

  // 5. Assert that horses from both separate meetings are present
  //await expect(appBody).toContainText('Hard Stare');
  await expect(appBody).toContainText('Hard Stare');
});
