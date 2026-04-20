import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import edge from 'selenium-webdriver/edge.js';
import process from 'node:process';

const BASE_URL = process.env.SELENIUM_BASE_URL || 'http://localhost:5173';
const HEADLESS = process.env.SELENIUM_HEADLESS !== 'false';
const BROWSER = (process.env.SELENIUM_BROWSER || 'chrome').toLowerCase();

function withCommonArgs(options) {
  if (HEADLESS) {
    options.addArguments('--headless=new');
  }

  options.addArguments('--window-size=1366,900');
  options.addArguments('--disable-gpu');
  options.addArguments('--no-sandbox');
  return options;
}

function buildChromeOptions() {
  const options = new chrome.Options();
  return withCommonArgs(options);
}

function buildEdgeOptions() {
  const options = new edge.Options();
  return withCommonArgs(options);
}

async function buildDriver() {
  if (BROWSER === 'edge') {
    return new Builder()
      .forBrowser('MicrosoftEdge')
      .setEdgeOptions(buildEdgeOptions())
      .build();
  }

  return new Builder()
    .forBrowser('chrome')
    .setChromeOptions(buildChromeOptions())
    .build();
}

async function runSmokeTest() {
  const driver = await buildDriver();

  try {
    console.log(`Abriendo ${BASE_URL} en ${BROWSER}`);
    await driver.get(BASE_URL);

    await driver.wait(until.elementLocated(By.css('body')), 10000);
    await driver.wait(async () => {
      const readyState = await driver.executeScript('return document.readyState');
      return readyState === 'complete';
    }, 10000);

    const title = await driver.getTitle();
    const bodyText = await driver.findElement(By.css('body')).getText();

    if (!bodyText || bodyText.trim().length < 5) {
      throw new Error('La pagina cargo, pero no tiene contenido visible suficiente.');
    }

    console.log('Smoke test OK');
    console.log(`Titulo detectado: ${title || '(sin titulo)'}`);
  } finally {
    await driver.quit();
  }
}

runSmokeTest().catch((error) => {
  console.error('Smoke test fallo');
  console.error(error);
  process.exit(1);
});
