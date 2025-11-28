const http = require("http");
const fs = require("fs");

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const applyMinimalAntiDetect = require("./src/antidetect");
const humanizePage = require("./src/human");

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Simple local static server
const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/test.html") {
    const html = fs.readFileSync("./test.html", "utf-8");
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(3000, async () => {
  console.log("HTTP server on http://localhost:3000");
  console.log("STARTING RUN...");

  const browser = await puppeteer.launch({
    headless: false,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--window-size=1600,900",
    ],
  });

  const page = await browser.newPage();

  await page.setViewport({
    width: 1600,
    height: 900,
    deviceScaleFactor: 1,
  });

  await applyMinimalAntiDetect(page);
  await humanizePage(page);

  // Capture popunder
  let targetPromise = new Promise(resolve => {
    browser.on("targetcreated", async target => {
      if (target.type() === "page" && target.url() !== "about:blank") {
        const newPage = await target.page();
        resolve(newPage);
      }
    });
  });

  await page.goto("http://localhost:3000/test.html", {
    waitUntil: "domcontentloaded",
  });

  await delay(3000);
  await page.mouse.click(100, 100);

  let popupPage = await Promise.race([
    targetPromise,
    delay(8000).then(() => null),
  ]);

  let finalUrl;
  let screenshotPage;
  let redirectChain = [];

  if (popupPage) {
    await delay(1500);

    const mainRequest = popupPage.mainFrame().request();
    const chain = mainRequest.redirectChain();
    const startTime = Date.now();

    redirectChain = chain.map((req, i) => ({
      index: i,
      url: req.url(),
      method: req.method(),
      headers: req.headers(),
      timestamp: new Date(startTime + i * 50).toISOString(),
    }));

    redirectChain.push({
      index: redirectChain.length,
      url: popupPage.url(),
      method: "GET",
      headers: {},
      timestamp: new Date(Date.now()).toISOString(),
    });

    finalUrl = popupPage.url();
    screenshotPage = popupPage;
  } else {
    const mainRequest = page.mainFrame().request();
    const chain = mainRequest.redirectChain();
    const startTime = Date.now();

    redirectChain = chain.map((req, i) => ({
      index: i,
      url: req.url(),
      method: req.method(),
      headers: req.headers(),
      timestamp: new Date(startTime + i * 50).toISOString(),
    }));

    redirectChain.push({
      index: redirectChain.length,
      url: page.url(),
      method: "GET",
      headers: {},
      timestamp: new Date(Date.now()).toISOString(),
    });

    finalUrl = page.url();
    screenshotPage = page;
  }

  fs.mkdirSync("output", { recursive: true });

  // Screenshot final lander
  await screenshotPage.screenshot({
    path: "output/screen.png",
    fullPage: true,
  });

  // Save FULL flow report
  fs.writeFileSync(
    "output/result.json",
    JSON.stringify(
      {
        finalUrl,
        timestamp: new Date().toISOString(),
        redirectChain,
      },
      null,
      2
    )
  );

  console.log("DONE. Final URL:", finalUrl);

  await browser.close();
  server.close();
});

  await browser.close();
  server.close();
});
