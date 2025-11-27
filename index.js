const puppeteer = require("puppeteer");
const fs = require("fs");

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log("STARTING RUN...");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  const fileUrl = "file://" + __dirname + "/test.html";

  let requests = [];
  page.on("request", req => {
    requests.push(req.url());
  });

  await page.goto(fileUrl, { waitUntil: "domcontentloaded" });

  await delay(5000);

  await page.mouse.click(200, 300);

  await delay(6000);

  const finalUrl = page.url();
  const html = await page.content();

  fs.mkdirSync("output", { recursive: true });
  fs.writeFileSync("output/result.json", JSON.stringify({
    finalUrl,
    requests: requests.slice(0, 200),
    html
  }, null, 2));

  await page.screenshot({ path: "output/screen.png", fullPage: true });

  await browser.close();

  console.log("DONE. Final URL:", finalUrl);
})();
