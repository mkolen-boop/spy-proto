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

/* ---------------------- PROXY SETTINGS ---------------------- */

const proxyHost = "res.proxy-seller.com";
const proxyPort = "10000";
const proxyUser = "b59fa84f0a279aec";
const proxyPass = "c1CTdj2G";

const proxyFull = `http://${proxyHost}:${proxyPort}`;

/* -------------------------------------------------------------- */

// Local test server
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

  /* ---------------------- LAUNCH BROWSER ---------------------- */

  const browser = await puppeteer.launch({
    headless: false,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      `--proxy-server=${proxyFull}`,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--window-size=1600,900"
    ]
  });

  const page = await browser.newPage();

  await page.authenticate({
    username: proxyUser,
    password: proxyPass
  });

  // Check IP from proxy
  await page.goto("https://api.ipify.org?format=json", { waitUntil: "networkidle2" });
  const ipCheck = await page.evaluate(() => document.body.innerText);
  console.log("Your proxy IP:", ipCheck);

  await page.setViewport({
    width: 1600,
    height: 900,
    deviceScaleFactor: 1
  });

  await applyMinimalAntiDetect(page);
  await humanizePage(page);

  /* ---------------------- POPUNDER DETECTION ---------------------- */

  let targetPromise = new Promise(resolve => {
    browser.on("targetcreated", async target => {
      if (target.type() === "page" && target.url() !== "about:blank") {
        const newPage = await target.page();
        resolve(newPage);
      }
    });
  });

  await page.goto("http://localhost:3000/test.html", {
    waitUntil: "domcontentloaded"
  });

  await delay(3000);
  await page.mouse.click(100, 100);

  let popupPage = await Promise.race([
    targetPromise,
    delay(8000).then(() => null)
  ]);

  /* ---------------------- REDIRECT CHAIN LOGIC ---------------------- */

  let finalUrl;
  let screenshotPage;
  let redirectChain = [];

  async function extractChainFromPage(targetPage) {
    try {
      const firstResponse = await targetPage.waitForResponse(() => true, { timeout: 10000 });
      const req = firstResponse.request();
      const chain = req.redirectChain();

      return chain.map((step, index) => ({
        index,
        url: step.url(),
        method: step.method(),
        headers: step.headers()
      }));
    } catch (error) {
      console.log("Redirect chain extraction error:", error.message);
      return [];
    }
  }

  if (popupPage) {
    await delay(1500);

    redirectChain = await extractChainFromPage(popupPage);

    redirectChain.push({
      index: redirectChain.length,
      url: popupPage.url(),
      method: "GET",
      headers: {}
    });

    finalUrl = popupPage.url();
    screenshotPage = popupPage;

  } else {
    redirectChain = await extractChainFromPage(page);

    redirectChain.push({
      index: redirectChain.length,
      url: page.url(),
      method: "GET",
      headers: {}
    });

    finalUrl = page.url();
    screenshotPage = page;
  }

  /* ---------------------- SAVE OUTPUT ---------------------- */

  fs.mkdirSync("output", { recursive: true });

  await screenshotPage.screenshot({
    path: "output/screen.png",
    fullPage: true
  });

  fs.writeFileSync(
    "output/result.json",
    JSON.stringify(
      {
        finalUrl,
        timestamp: new Date().toISOString(),
        redirectChain
      },
      null,
      2
    )
  );

  console.log("DONE. Final URL:", finalUrl);

  await browser.close();
  server.close();
});
