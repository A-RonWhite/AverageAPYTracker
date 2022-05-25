// Sentry IO Error tracking
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

const { basisProjectedReturns } = require("./solanaFunctions");

Sentry.init({
  dsn: "https://c5957f50f0494809b8de74630dfcae59@o319326.ingest.sentry.io/6257087",

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 0.1,
});

const puppeteer = require("puppeteer-extra");
const admin = require("firebase-admin");

// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

// Add adblocker plugin to block all ads and trackers (saves bandwidth)
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

let basisAPY;
let franciumAPY;
let tulipAPY;
let error = false;

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(
      Buffer.from(process.env.GOOGLE_CONFIG_BASE64, "base64").toString("ascii")
    )
  ),
});

const db = admin.firestore();

const updateFirebase = (document, field) => {
  db.collection("APY15")
    .doc(document)
    .update(field)
    .then(() => {
      console.log("Successfully added field to the database");
    })
    .catch((e) => {
      console.log("There was an error: ", e);
    });
};

const webScraper = async (url, xPath, source) => {
  console.log(source, "starting scraping...");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // See if this fixes francium time out issue
    await page.setDefaultNavigationTimeout(0);

    await page.goto(url);
    await page.waitForTimeout(5000);

    const APYSelector = (await page.$x(xPath))[0];

    let text = await page.evaluate((el) => {
      try {
        return el.textContent;
      } catch (e) {
        console.log("Couldn't select textContent, error flag set");
        error = true;
      }
    }, APYSelector);

    console.log("Text print: ", text);

    // tulip data not loading yet
    if (text === "0.00 %" || undefined || null || error) {
      await page.waitForTimeout(2000);
      text = await page.evaluate((el) => {
        return el.textContent;
      }, APYSelector);

      console.log("Text variable was 0, undefined or null - new value: ", text);
    }

    /* if (source === "Solscan: ") {
      var text2 = text.replace(/,/g, "");
      calculateAPY(text2);
      updateFirebase("BASIS", { [new Date().getTime()]: basisAPY });
    } else {
      var text3 = text.replace(/[&\/\\#+()$~%]/g, "");
    } */

    if (source === "Francium: ") {
      franciumAPY = Math.round(text3);
      updateFirebase("Francium", { [new Date().getTime()]: franciumAPY });
      console.log("Francium: ", franciumAPY);
    }

    if (source === "Tulip: ") {
      tulipAPY = Math.round(text3);
      updateFirebase("Tulip", { [new Date().getTime()]: tulipAPY });
      console.log("Tulip: ", tulipAPY);
    }
  } catch (e) {
    Sentry.captureException(e);
    console.log("There was an error: ", e);
  } finally {
    await browser.close();
  }
};

webScraper(
  "https://francium.io/app/lend",
  '//*[contains(text(), "BASIS")]/parent::*/parent::*/td[2]',
  "Francium: "
);
webScraper(
  "https://tulip.garden/lend",
  '//*[contains(text(), "BASIS")]/parent::*/parent::*/parent::*//*[contains(text(), "%")]',
  "Tulip: "
);

basisAPY = basisProjectedReturns();
updateFirebase("BASIS", { [new Date().getTime()]: basisAPY });

//Run every 15 mins
setInterval(() => {
  webScraper(
    "https://francium.io/app/lend",
    '//*[contains(text(), "BASIS")]/parent::*/parent::*/td[2]',
    "Francium: "
  );
  webScraper(
    "https://tulip.garden/lend",
    '//*[contains(text(), "BASIS")]/parent::*/parent::*/parent::*//*[contains(text(), "%")]',
    "Tulip: "
  );

  basisAPY = basisProjectedReturns();
  updateFirebase("BASIS", { [new Date().getTime()]: basisAPY });
}, 15 * 60 * 1000);
