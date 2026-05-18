import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import edge from 'selenium-webdriver/edge.js';
import process from 'node:process';

const BASE_URL = process.env.SELENIUM_BASE_URL || 'http://192.168.100.25:5173';
const LOGIN_URL = `${BASE_URL}/login`;
const USER = process.env.SELENIUM_USER || 'director';
const PASS = process.env.SELENIUM_PASS || '1234';
const HEADLESS = process.env.SELENIUM_HEADLESS === 'true';
const BROWSER = (process.env.SELENIUM_BROWSER || 'chrome').toLowerCase();
const ACTION_DELAY_MS = Number(process.env.SELENIUM_ACTION_DELAY_MS || 2000);
const now = new Date();
const RUN_SUFFIX = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

function withCommonArgs(options) {
  if (HEADLESS) options.addArguments('--headless=new');
  options.addArguments('--window-size=1366,900');
  options.addArguments('--disable-gpu');
  options.addArguments('--no-sandbox');
  return options;
}

async function buildDriver() {
  if (BROWSER === 'edge') {
    return new Builder()
      .forBrowser('MicrosoftEdge')
      .setEdgeOptions(withCommonArgs(new edge.Options()))
      .build();
  }

  return new Builder()
    .forBrowser('chrome')
    .setChromeOptions(withCommonArgs(new chrome.Options()))
    .build();
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
    await driver.sleep(200);
  }
  throw new Error('No se encontro elemento visible para los selectores proporcionados');
}

async function pause(driver, ms = ACTION_DELAY_MS) {
  await driver.sleep(ms);
}

async function clickFirstVisible(driver, locators, timeout = 10000) {
  const el = await findFirstVisible(driver, locators, timeout);
  await driver.wait(until.elementIsVisible(el), timeout);
  await driver.wait(until.elementIsEnabled(el), timeout);
  await el.click();
  await pause(driver);
  return el;
}

async function clickIfVisible(driver, locators, timeout = 4000) {
  const el = await findFirstVisible(driver, locators, timeout).catch(() => null);
  if (!el) return false;
  await el.click();
  await pause(driver);
  return true;
}

async function setFirstVisibleInput(driver, locators, value, timeout = 10000) {
  const input = await findFirstVisible(driver, locators, timeout);
  await driver.wait(until.elementIsVisible(input), timeout);
  await input.click();
  await input.sendKeys(Key.CONTROL, 'a');
  await input.sendKeys(Key.DELETE);
  await input.sendKeys(String(value));
  await pause(driver);
  return input;
}

async function goTo(driver, path) {
  await driver.get(`${BASE_URL}${path}`);
  await driver.wait(until.elementLocated(By.css('body')), 10000);
  await driver.wait(async () => {
    const ready = await driver.executeScript('return document.readyState');
    return ready === 'complete';
  }, 10000);
  await pause(driver);
}

async function login(driver) {
  await goTo(driver, '/login');

  const userInput = await findFirstVisible(driver, [
    By.name('usuario'),
    By.name('username'),
    By.name('email'),
    By.id('usuario'),
    By.id('username'),
    By.css('input[type="text"]'),
    By.css('input[type="email"]')
  ]);

  const passInput = await findFirstVisible(driver, [
    By.name('password'),
    By.id('password'),
    By.css('input[type="password"]')
  ]);

  await userInput.clear();
  await userInput.sendKeys(USER);
  await pause(driver);
  await passInput.clear();
  await passInput.sendKeys(PASS);
  await pause(driver);

  const submitButton = await findFirstVisible(driver, [
    By.css('button[type="submit"]'),
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'iniciar')]"),
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'ingresar')]"),
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'login')]")
  ], 5000).catch(() => null);

  if (submitButton) {
    await submitButton.click();
  } else {
    await passInput.sendKeys(Key.ENTER);
  }

  await driver.wait(async () => {
    const url = await driver.getCurrentUrl();
    return !url.includes('/login');
  }, 15000);
  await pause(driver);
}

async function assertPageHasContent(driver, path) {
  await goTo(driver, path);
  const bodyText = await driver.findElement(By.css('body')).getText();
  if (!bodyText || bodyText.trim().length < 5) {
    throw new Error(`La pagina ${path} no muestra contenido suficiente`);
  }
}

async function createBeca(driver) {
  await goTo(driver, '/becas');
  await clickFirstVisible(driver, [
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚ','abcdefghijklmnopqrstuvwxyzáéíóú'),'nueva beca')]"),
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚ','abcdefghijklmnopqrstuvwxyzáéíóú'),'beca') and contains(@class,'btn-primary')]"),
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'crear')]"),
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'nuevo')]")
  ]);
  await setFirstVisibleInput(driver, [
    By.name('descripcion'),
    By.id('descripcion'),
    By.css('input[placeholder*=\"Descrip\"]'),
    By.css('input[type=\"text\"]')
  ], `Beca Selenium ${RUN_SUFFIX}`);
  await setFirstVisibleInput(driver, [
    By.name('descuento'),
    By.name('porcentaje'),
    By.id('descuento'),
    By.css('input[type=\"number\"]')
  ], '10');
  await clickFirstVisible(driver, [
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'guardar')]"),
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'registrar')]"),
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'crear')]")
  ]);
}

async function createAcademiaItem(driver, sectionName, itemName, extraValue = null) {
  await clickFirstVisible(driver, [
    By.xpath(`//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚ','abcdefghijklmnopqrstuvwxyzáéíóú'),'${sectionName}')]`),
    By.xpath(`//a[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚ','abcdefghijklmnopqrstuvwxyzáéíóú'),'${sectionName}')]`)
  ], 6000).catch(() => null);

  await clickFirstVisible(driver, [
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'crear')]"),
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'nuevo')]"),
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'agregar')]")
  ]);

  await setFirstVisibleInput(driver, [
    By.name('nombre'),
    By.name('descripcion'),
    By.id('nombre'),
    By.css('input[placeholder*=\"Nombre\"]'),
    By.css('input[type=\"text\"]')
  ], itemName);

  if (extraValue !== null) {
    await setFirstVisibleInput(driver, [
      By.name('precio'),
      By.name('monto'),
      By.name('costo'),
      By.name('importe'),
      By.id('precio'),
      By.css('input[type=\"number\"]')
    ], String(extraValue), 5000).catch(() => null);
  }

  await clickFirstVisible(driver, [
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'guardar')]"),
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'registrar')]"),
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'crear')]")
  ]);
}

async function createAcademiaData(driver) {
  const bloqueName = `Bloque Selenium ${RUN_SUFFIX}`;
  const nivelName = `Nivel Selenium ${RUN_SUFFIX}`;
  const cursoName = `Curso Selenium ${RUN_SUFFIX}`;

  await goTo(driver, '/academia');
  await clickFirstVisible(driver, [
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚ','abcdefghijklmnopqrstuvwxyzáéíóú'),'nuevo bloque')]")
  ]);
  await setFirstVisibleInput(driver, [
    By.css("input[placeholder*='BLOQUE INICIAL']"),
    By.css("input[placeholder*='BLOQUE PRIMARIA']"),
    By.css(".modal input[type='text']")
  ], bloqueName);
  await clickFirstVisible(driver, [
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'crear')]")
  ]);

  const bloqueCard = await findFirstVisible(driver, [
    By.xpath(`//h5[contains(normalize-space(.),"${bloqueName}")]/ancestor::div[contains(@class,'card')][1]`),
    By.xpath(`//*[contains(normalize-space(.),"${bloqueName}")]/ancestor::div[contains(@class,'card')][1]`),
    By.xpath("(//div[contains(@class,'card') and .//h5][1]")
  ], 12000);
  await bloqueCard.click();
  await pause(driver);

  await clickFirstVisible(driver, [
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚ','abcdefghijklmnopqrstuvwxyzáéíóú'),'nuevo nivel')]")
  ]);
  await setFirstVisibleInput(driver, [
    By.css("input[placeholder*='Primer Nivel']"),
    By.css(".card input[type='text']")
  ], nivelName);
  await setFirstVisibleInput(driver, [
    By.css("input[placeholder='0.00']"),
    By.css(".card input[type='number']")
  ], '150');
  await setFirstVisibleInput(driver, [
    By.css("input[placeholder*='Descripción del nivel']"),
    By.css(".card input[type='text']")
  ], `Descripcion nivel ${RUN_SUFFIX}`);
  await clickFirstVisible(driver, [
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'crear')]")
  ]);

  await clickIfVisible(driver, [
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'cursos')]")
  ], 5000);
  await clickIfVisible(driver, [
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚ','abcdefghijklmnopqrstuvwxyzáéíóú'),'nuevo curso')]")
  ], 5000);
  await setFirstVisibleInput(driver, [
    By.css("input[placeholder*='Matemáticas Básicas']"),
    By.css("input[placeholder*='Matematicas Basicas']"),
    By.css(".card input[type='text']")
  ], cursoName);
  const nivelSelect = await findFirstVisible(driver, [
    By.css('select.form-select')
  ], 5000).catch(() => null);
  if (nivelSelect) {
    const options = await nivelSelect.findElements(By.css('option'));
    for (const option of options) {
      const value = await option.getAttribute('value');
      if (value && value.trim() !== '') {
        await option.click();
        break;
      }
    }
    await pause(driver);
  }
  await clickIfVisible(driver, [
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'crear')]")
  ], 5000);
}

async function createServicio(driver, name, price) {
  await setFirstVisibleInput(driver, [
    By.name('descripcion'),
    By.css("input[placeholder*='Almuerzo']"),
    By.css("input[placeholder*='Tutoría']"),
    By.css("input[placeholder*='Tutoria']"),
    By.css('input[type=\"text\"]')
  ], name);
  await clickFirstVisible(driver, [
    By.css("form button.btn.btn-success"),
    By.xpath("//form//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'crear')]"),
    By.xpath("//form//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'actualizar')]")
  ]);
  await clickIfVisible(driver, [
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚ','abcdefghijklmnopqrstuvwxyzáéíóú'),'sí, confirmar')]"),
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚ','abcdefghijklmnopqrstuvwxyzáéíóú'),'si, confirmar')]"),
    By.css(".modal.show .btn.btn-success")
  ], 7000);
}

async function createServiciosData(driver) {
  await goTo(driver, '/servicios');
  await createServicio(driver, `Apoyo escolar ${RUN_SUFFIX}`, 100);
  await createServicio(driver, `Transporte escolar ${RUN_SUFFIX}`, 120);
}

async function logout(driver) {
  await clickFirstVisible(driver, [
    By.xpath("//a[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚ','abcdefghijklmnopqrstuvwxyzáéíóú'),'cerrar sesión')]"),
    By.xpath("//a[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚ','abcdefghijklmnopqrstuvwxyzáéíóú'),'cerrar sesion')]"),
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚ','abcdefghijklmnopqrstuvwxyzáéíóú'),'cerrar sesión')]"),
    By.xpath("//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚ','abcdefghijklmnopqrstuvwxyzáéíóú'),'cerrar sesion')]"),
    By.xpath("//span[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚ','abcdefghijklmnopqrstuvwxyzáéíóú'),'cerrar sesión')]")
  ], 8000);
  await driver.wait(async () => {
    const url = await driver.getCurrentUrl();
    return url.includes('/login');
  }, 10000);
  await pause(driver);
}

async function run() {
  const driver = await buildDriver();
  try {
    console.log(`Iniciando prueba Director en ${BASE_URL} (${BROWSER})`);
    await login(driver);
    await assertPageHasContent(driver, '/');
    console.log('OK /');
    await createBeca(driver);
    console.log('OK beca creada');
    await createAcademiaData(driver);
    console.log('OK academia creada');
    await createServiciosData(driver);
    console.log('OK servicios creados');
    await assertPageHasContent(driver, '/ingresos-academicos');
    console.log('OK /ingresos-academicos');
    await logout(driver);
    console.log('OK cierre de sesion');
    console.log('Flujo Selenium Director completado');
  } finally {
    await driver.quit();
  }
}

run().catch((error) => {
  console.error('Fallo selenium_director');
  console.error(error);
  process.exit(1);
});
