module.exports = async function humanizePage(page) {
  await page.evaluateOnNewDocument(() => {
    document.addEventListener('mousemove', () => {}, true);
  });

  // simple random mouse movement
  const move = async () => {
    for (let i = 0; i < 20 + Math.random() * 30; i++) {
      await page.mouse.move(
        100 + Math.random() * 400,
        100 + Math.random() * 300,
        { steps: 5 + Math.floor(Math.random() * 10) }
      );
      await new Promise(res => setTimeout(res, 50 + Math.random() * 150));
    }
  };

  await move();
};
