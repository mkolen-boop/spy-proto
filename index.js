const http = require("http");
const fs = require("fs");

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const applyMinimalAntiDetect = require("./src/antidetect");
const humanSession = require("./src/human");

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ---------------------- PROXY SETTINGS ---------------------- */

const proxyHost = "res.proxy-seller.com";
const proxyPort = "10000";
const proxyUser = "9186db7835813246";
const proxyPass = "ocOK6sF1";
const proxyFull = `http://${proxyHost}:${proxyPort}`;

/* -------------------------------------------------------------- */

(async () => {
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

  /* ---------------------- CHECK PROXY IP ---------------------- */
  await page.goto("https://api.ipify.org?format=json", {
    waitUntil: "networkidle2"
  });

  console.log("Your proxy IP:", await page.evaluate(() => document.body.innerText));

  await page.setViewport({
    width: 1600,
    height: 900,
    deviceScaleFactor: 1
  });

  await applyMinimalAntiDetect(page);

 /* ---------------------- LOAD PRODUCTION TEST PAGE ---------------------- */

const TEST_URL = "https://coffeadvisory.com/test.html";

console.log("LOADING URL:", TEST_URL);

await page.goto(TEST_URL, {
  waitUntil: "domcontentloaded"
});

  /* ---------------------- POPUNDER DETECTION ---------------------- */

  let popupPage = null;

  const listener = async target => {
    if (target.type() === "page") {
      try {
        const newPage = await target.page();
        if (newPage && newPage.url() !== "about:blank") {
          popupPage = newPage;
        }
      } catch (e) {}
    }
  };

  browser.on("targetcreated", listener);

  // Trigger popunder
  await delay(1200);
  await page.mouse.click(300, 250);

  for (let i = 0; i < 30; i++) {
    if (popupPage) break;
    await delay(400);
  }

  browser.off("targetcreated", listener);

  /* ---------------------- REDIRECT CHAIN ---------------------- */

  async function extractChainFromPage(targetPage) {
    try {
      const firstResponse = await targetPage.waitForResponse(() => true, {
        timeout: 12000
      });
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

  let finalUrl;
  let screenshotPage;
  let redirectChain = [];

  if (popupPage) {
    console.log("POPUNDER OPENED:", popupPage.url());

    await delay(1500);
    await humanSession(popupPage);

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
    console.log("NO POPUNDER — USING MAIN PAGE");

    await humanSession(page);

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
})();
