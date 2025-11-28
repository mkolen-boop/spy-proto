module.exports = async function humanSession(page) {
  
  // Cross-version sleep function
  const sleep = async (ms) => {
    if (page.waitForTimeout) {
      return page.waitForTimeout(ms);
    }
    return new Promise(res => setTimeout(res, ms));
  };

  const rand = (min, max) => Math.random() * (max - min) + min;

  async function humanMouseMove() {
    const steps = Math.floor(rand(20, 40));
    for (let i = 0; i < steps; i++) {
      await page.mouse.move(rand(0, 1600), rand(0, 900));
      await sleep(rand(25, 90));
    }
  }

  async function humanScroll() {
    const scrolls = Math.floor(rand(2, 5));
    for (let i = 0; i < scrolls; i++) {
      await page.evaluate(y => window.scrollBy(0, y), rand(200, 500));
      await sleep(rand(300, 900));
    }

    // sometimes scroll to top
    if (Math.random() > 0.6) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(rand(300, 700));
    }
  }

  async function idle() {
    await sleep(rand(500, 2000));
  }

  async function humanHover() {
    await page.mouse.move(rand(200, 1400), rand(100, 700));
    await sleep(rand(150, 600));
  }

  async function humanClicks() {
    if (Math.random() > 0.7) {
      await page.mouse.click(rand(200, 1400), rand(150, 700));
      await idle();
    }
  }

  // Combined natural session
  await humanMouseMove();
  await idle();
  await humanScroll();
  await humanHover();
  await idle();
  await humanMouseMove();
  await humanClicks();
  await idle();
};
