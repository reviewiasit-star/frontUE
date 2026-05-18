


import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import process from 'node:process';

const BASE_URL = process.env.SELENIUM_BASE_URL || 'http://192.168.100.25:5173';
const USER = process.env.SELENIUM_USER || 'admin';
const PASS = process.env.SELENIUM_PASS || '4321';
const ACTION_DELAY_MS = Number(process.env.SELENIUM_ACTION_DELAY_MS || 1200);
const FAST_DELAY_MS = Number(process.env.SELENIUM_FAST_DELAY_MS || 200);
const HEADLESS = process.env.SELENIUM_HEADLESS === 'true';
const now = new Date();
const RUN_SUFFIX = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

function options() {
  const opts = new chrome.Options();
  if (HEADLESS) opts.addArguments('--headless=new');
  opts.addArguments('--window-size=1366,900');
  opts.addArguments('--disable-gpu');
  opts.addArguments('--no-sandbox');
  return opts;
}

async function sleep(driver, ms = ACTION_DELAY_MS) {
  await driver.sleep(ms);
}

async function findFirstVisible(driver, locators, timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    for (const locator of locators) {
      const elements = await driver.findElements(locator);
      for (const el of elements) {
        if (await el.isDisplayed()) return el;
      }
    }
    await driver.sleep(150);
  }
  throw new Error('No se encontro elemento visible para los selectores proporcionados');
}

async function clickFirst(driver, locators, timeout = 10000, delay = ACTION_DELAY_MS) {
  const el = await findFirstVisible(driver, locators, timeout);
  await driver.wait(until.elementIsEnabled(el), timeout).catch(async () => {
    await driver.executeScript('arguments[0].click();', el);
  });
  await el.click();
  if (delay > 0) await sleep(driver, delay);
}

async function typeFirst(driver, locators, value, timeout = 10000, delay = ACTION_DELAY_MS) {
  const input = await findFirstVisible(driver, locators, timeout);
  await input.click();
  await input.sendKeys(Key.CONTROL, 'a');
  await input.sendKeys(Key.DELETE);
  await input.sendKeys(String(value));
  if (delay > 0) await sleep(driver, delay);
}

async function selectFirstNonEmpty(driver, locators, timeout = 10000, delay = ACTION_DELAY_MS) {
  const select = await findFirstVisible(driver, locators, timeout);
  const options = await select.findElements(By.css('option'));
  for (const option of options) {
    const value = (await option.getAttribute('value')) || '';
    if (value.trim() !== '') {
      await option.click();
      if (delay > 0) await sleep(driver, delay);
      return value;
    }
  }
  return null;
}

async function login(driver) {
  await driver.get(`${BASE_URL}/login`);
  await driver.wait(until.elementLocated(By.css('body')), 10000);
  await typeFirst(driver, [By.name('usuario'), By.css('input[type="text"]')], USER);
  await typeFirst(driver, [By.name('password'), By.css('input[type="password"]')], PASS);
  await clickFirst(driver, [By.css('button[type="submit"]')], 10000, ACTION_DELAY_MS);
  await driver.wait(async () => !(await driver.getCurrentUrl()).includes('/login'), 15000);
  await sleep(driver);
}

async function createUsuario(driver) {
  await driver.get(`${BASE_URL}/usuarios`);
  await driver.wait(until.elementLocated(By.css('body')), 10000);
  await clickFirst(driver, [By.xpath("//button[contains(.,'Agregar Usuario')]")], 10000, ACTION_DELAY_MS);
  await typeFirst(driver, [By.css("input[name='usuario']")], `user${RUN_SUFFIX}`);
  await typeFirst(driver, [By.css("input[name='password']")], '1234');
  await typeFirst(driver, [By.css("input[name='nombre']")], `Usuario Selenium ${RUN_SUFFIX}`);
  await typeFirst(driver, [By.css("input[name='correo']")], `user${RUN_SUFFIX}@mail.com`);
  const rolSelect = await findFirstVisible(driver, [By.css("select[name='rol_id']")], 8000);
  const rolOptions = await rolSelect.findElements(By.css('option'));
  let selected = false;
  for (const opt of rolOptions) {
    const txt = (await opt.getText()).toLowerCase();
    if (txt.includes('cajero') || txt.includes('director')) {
      await opt.click();
      selected = true;
      break;
    }
  }
  if (!selected) await selectFirstNonEmpty(driver, [By.css("select[name='rol_id']")], 6000, 0);
  await sleep(driver);
  await clickFirst(driver, [By.xpath("//div[contains(@class,'modal-content')]//button[contains(.,'Guardar')]")], 10000, ACTION_DELAY_MS);
}

async function createEstudianteFast(driver) {
  await driver.get(`${BASE_URL}/estudiantes`);
  await driver.wait(until.elementLocated(By.css('body')), 10000);
  await clickFirst(driver, [By.xpath("//button[contains(.,'Nuevo Estudiante')]")], 10000, FAST_DELAY_MS);
  await clickFirst(driver, [By.xpath("//button[contains(.,'Llenar Datos Aleatorios')]")], 10000, FAST_DELAY_MS);
  await clickFirst(driver, [By.xpath("//button[contains(.,'Siguiente')]")], 10000, FAST_DELAY_MS);
  await clickFirst(driver, [By.xpath("//button[contains(.,'Siguiente')]")], 10000, FAST_DELAY_MS);
  await clickFirst(driver, [By.xpath("//button[contains(.,'Finalizar')]")], 10000, FAST_DELAY_MS);
  await sleep(driver, FAST_DELAY_MS);
}

async function createInscripcion(driver) {
  const firstCiCell = await findFirstVisible(driver, [
    By.css('table tbody tr td:nth-child(5)')
  ], 10000);
  const ciToSearch = (await firstCiCell.getText()).trim();

  await driver.navigate().refresh();
  await sleep(driver, ACTION_DELAY_MS);
  await clickFirst(driver, [By.xpath("//button[contains(.,'Nueva inscripción')]"), By.xpath("//button[contains(.,'Nueva inscripcion')]")], 10000, ACTION_DELAY_MS);
  await typeFirst(driver, [
    By.css("input[placeholder*='Escriba nombre o CI del estudiante']"),
    By.css(".modal input.form-control")
  ], ciToSearch, 10000, ACTION_DELAY_MS);
  await clickFirst(driver, [
    By.css('.position-absolute.w-100 .p-2.border-bottom'),
    By.xpath("//div[contains(@class,'position-absolute')]//div[contains(@class,'p-2')]")
  ], 10000, ACTION_DELAY_MS);
  await findFirstVisible(driver, [By.css("select[name='nivel_id']")], 10000);
  await selectFirstNonEmpty(driver, [By.css("select[name='nivel_id']")], 10000, ACTION_DELAY_MS);
  await selectFirstNonEmpty(driver, [By.css("select[name='curso_id']")], 10000, ACTION_DELAY_MS);
  const becaValue = await selectFirstNonEmpty(driver, [By.css("select[name='id_beca']")], 7000, ACTION_DELAY_MS).catch(() => null);
  if (becaValue) {
    await clickFirst(driver, [By.xpath("//button[contains(.,'Seleccionar todos')]")], 7000, ACTION_DELAY_MS).catch(() => null);
  }
  await clickFirst(driver, [By.xpath("//button[contains(.,'Registrar nueva inscripción')]"), By.xpath("//button[contains(.,'Registrar nueva inscripcion')]")], 10000, ACTION_DELAY_MS);
}

async function run() {
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options()).build();
  try {
    console.log(`Iniciando flujo Admin en ${BASE_URL}`);
    await login(driver);
    console.log('OK login');
    await createUsuario(driver);
    console.log('OK usuario creado');
    await createEstudianteFast(driver);
    console.log('OK estudiante creado');
    await createInscripcion(driver);
    console.log('OK nueva inscripcion creada');
    console.log('Flujo Selenium Admin completado');
  } finally {
    await driver.quit();
  }
}

run().catch((error) => {
  console.error('Fallo selenium_admin');
  console.error(error);
  process.exit(1);
});
