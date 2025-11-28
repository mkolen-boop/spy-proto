module.exports = async function humanSession(page) {
  // Random helper
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  // Safe wrapper: do nothing if page already closed (prevents crashes)
  const safe = async (fn) => {
    try { await fn(); } catch {}
  };

  /* ------------------ RANDOM MOUSE MOVEMENT ------------------ */
  async function humanMouseMove() {
    const steps = rand(20, 60);
    for (let i = 0; i < steps; i++) {
      const x = rand(50, 1500);
      const y = rand(50, 850);
      await safe(() => page.mouse.move(x, y, { steps: rand(3, 12) }));
      await page.waitForTimeout(rand(10, 40));
    }
  }

  /* ------------------ RANDOM SCROLLING ------------------ */
  async function humanScroll() {
    const scrollSteps = rand(3, 8);
    for (let i = 0; i < scrollSteps; i++) {
      await safe(() =>
        page.evaluate((y) => window.scrollBy(0, y), rand(100, 400))
      );
      await page.waitForTimeout(rand(400, 1200));
    }
    // Small upward movement sometimes
    if (Math.random() < 0.3) {
      await safe(() =>
        page.evaluate((y) => window.scrollBy(0, -y), rand(50, 200))
      );
    }
  }

  /* ------------------ HOVER REGIONS ------------------ */
  async function humanHover() {
    const zones = [
      [rand(100, 500), rand(100, 400)],
      [rand(700, 1400), rand(200, 600)],
      [rand(200, 800), rand(500, 850)],
    ];

    for (const [x, y] of zones) {
      await safe(() => page.mouse.move(x, y, { steps: rand(4, 10) }));
      await page.waitForTimeout(rand(500, 1500));
    }
  }

  /* ------------------ RANDOM MICRO-IDLE ------------------ */
  async function humanIdle() {
    await page.waitForTimeout(rand(800, 2000));
  }

  /* ------------------ OCCASIONAL SMALL CLICK ------------------ */
  async function randomClick() {
    if (Math.random() < 0.3) {
      const x = rand(200, 1300);
      const y = rand(200, 800);
      await safe(() => page.mouse.click(x, y));
      await page.waitForTimeout(rand(500, 1500));
    }
  }

  /* ------------------ MAIN 30–45 SEC HUMAN SESSION ------------------ */
  const totalTime = rand(30_000, 45_000);
  const start = Date.now();

  while (Date.now() - start < totalTime) {
    const actionChoice = rand(1, 5);

    if (actionChoice === 1) await humanMouseMove();
    if (actionChoice === 2) await humanScroll();
    if (actionChoice === 3) await humanHover();
    if (actionChoice === 4) await randomClick();
    if (actionChoice === 5) await humanIdle();
  }

  console.log("Human session completed:", totalTime / 1000, "sec");
};

