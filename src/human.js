module.exports = async function humanSession(page) {
  // Random small delay
  const rand = (min, max) => Math.random() * (max - min) + min;

  // Move mouse like a human
  async function humanMouseMove() {
    const steps = Math.floor(rand(20, 50));
    for (let i = 0; i < steps; i++) {
      await page.mouse.move(
        rand(0, 1600),
        rand(0, 900),
        { steps: 1 }
      );
      await page.waitForTimeout(rand(20, 80));
    }
  }

  // Scroll like human
  async function humanScroll() {
    const scrolls = Math.floor(rand(2, 6));
    for (let i = 0; i < scrolls; i++) {
      await page.evaluate(y => window.scrollBy(0, y), rand(150, 600));
      await page.waitForTimeout(rand(500, 1500));
    }

    // Scroll back up sometimes
    if (Math.random() > 0.5) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(rand(400, 900));
    }
  }

  // Random idle time (human thinking)
  async function idle() {
    await page.waitForTimeout(rand(800, 2500));
  }

  // Hover around page
  async function humanHover() {
    const x = rand(200, 1400);
    const y = rand(100, 700);
    await page.mouse.move(x, y);
    await page.waitForTimeout(rand(200, 600));
  }

  // Random clicks (like accidental)
  async function humanClicks() {
    if (Math.random() > 0.7) {
      await page.mouse.click(rand(200, 1400), rand(150, 800));
      await idle();
    }
  }

  // COMBINED SESSION
  await humanMouseMove();
  await idle();
  await humanHover();
  await humanScroll();
  await idle();
  await humanMouseMove();
  await humanClicks();
  await idle();
};
