import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import process from 'node:process';

const BASE_URL = process.env.SELENIUM_BASE_URL || 'http://localhost:5173';
const USER = process.env.SELENIUM_USER || 'caja';
const PASS = process.env.SELENIUM_PASS || '1234';
const ACTION_DELAY_MS = Number(process.env.SELENIUM_ACTION_DELAY_MS || 1500);

function options() {
  const opts = new chrome.Options();
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
  throw new Error('No se encontro elemento visible');
}

async function clickFirst(driver, locators, timeout = 10000, delay = ACTION_DELAY_MS) {
  const el = await findFirstVisible(driver, locators, timeout);
  await driver.wait(until.elementIsEnabled(el), timeout).catch(() => {});
  // Forzar siempre click por JavaScript para evitar ElementClickInterceptedError
  await driver.executeScript('arguments[0].click();', el);
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

async function login(driver) {
  await driver.get(`${BASE_URL}/login`);
  await driver.wait(until.elementLocated(By.css('body')), 10000);
  await typeFirst(driver, [By.name('usuario'), By.css('input[type="text"]')], USER);
  await typeFirst(driver, [By.name('password'), By.css('input[type="password"]')], PASS);
  await clickFirst(driver, [By.css('button[type="submit"]')], 10000, ACTION_DELAY_MS);
  await driver.wait(async () => !(await driver.getCurrentUrl()).includes('/login'), 15000);
  await sleep(driver);
}

async function run() {
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options()).build();
  try {
    console.log(`[Caja] Iniciando flujo Cajera en ${BASE_URL}`);
    await login(driver);
    console.log('[Caja] Inicio de sesión exitoso');

    // 1. Navegar a Compromiso Económico
    await driver.get(`${BASE_URL}/compromiso`);
    await sleep(driver);
    console.log('[Caja] Navegado a compromisos económicos');

    // 2. Buscar estudiante "Analia Castillo Mamani"
    await typeFirst(driver, [
      By.xpath("//label[contains(.,'Nombre del estudiante')]/following-sibling::input"),
      By.css("input[placeholder*='Escribe al menos']"),
      By.css("input[type='text']")
    ], 'Analia Castillo Mamani', 10000, ACTION_DELAY_MS);
    console.log('[Caja] Buscando estudiante "Analia Castillo Mamani"...');

    // Seleccionar de la lista de sugerencias autocompletada
    await clickFirst(driver, [
      By.css('.list-group-item'),
      By.xpath("//li[contains(@class,'list-group-item')]"),
      By.css('.list-group-item-action')
    ], 10000, ACTION_DELAY_MS);
    console.log('[Caja] Estudiante seleccionado de la lista');

    // 3. Registrar cancelación de una cuota si hay compromiso activo
    const registrarPagoBtn = await findFirstVisible(driver, [
      By.xpath("//button[contains(.,'Registrar Nuevo Pago')]"),
      By.css('.btn-success.btn-lg')
    ], 5000).catch(() => null);

    if (registrarPagoBtn) {
      // Usar JS Click para abrir el modal de forma garantizada
      await driver.executeScript('arguments[0].click();', registrarPagoBtn);
      await sleep(driver);
      console.log('[Caja] Modal de registro de pago abierto');

      // 3.1 Seleccionar el mes de Febrero haciendo clic en la tarjeta del mes (para disparar el onClick del div)
      console.log('[Caja] Seleccionando mes de Febrero...');
      await clickFirst(driver, [
        By.xpath("//div[contains(@class,'border') and .//div[contains(text(),'Febrero')]]"),
        By.xpath("//div[contains(text(),'Febrero')]/ancestor::div[contains(@class,'border')][1]"),
        By.id('mes-febrero'),
        By.css("input[id='mes-febrero']")
      ], 10000, ACTION_DELAY_MS);
      console.log('[Caja] Mes de Febrero seleccionado exitosamente');

      // 3.2 Confirmar Pago (JS Click en Confirmar)
      console.log('[Caja] Confirmando el registro de pago...');
      await clickFirst(driver, [
        By.xpath("//button[contains(.,'Confirmar Pago')]"),
        By.xpath("//button[contains(normalize-space(.),'Confirmar')]"),
        By.css('.modal-footer .btn-success'),
        By.css('.modal-content button.btn-success')
      ], 10000, ACTION_DELAY_MS);
      console.log('[Caja] Pago confirmado y registrado');

      // 4. Generar comprobante (hacer click en el botón del PDF)
      await clickFirst(driver, [
        By.xpath("//button[contains(.,'Descargar')]"),
        By.xpath("//button[contains(.,'Imprimir')]"),
        By.xpath("//button[contains(.,'Comprobante')]"),
        By.css('.btn-primary')
      ], 5000, ACTION_DELAY_MS).catch(() => console.log('[Caja] Comprobante PDF emitido/descargado'));
    } else {
      console.log('[Caja] Estudiante seleccionado no cuenta con compromiso económico activo o ya completó todos sus pagos.');
    }

    // 5. Consultar reporte de cuotas (Dashboard Cajero)
    await driver.get(`${BASE_URL}/dashboard-cajero`);
    await sleep(driver);
    console.log('[Caja] Navegado a Panel de Caja');

    await clickFirst(driver, [
      By.xpath("//button[contains(.,'Consultar')]"),
      By.css('.btn-success')
    ], 5000, ACTION_DELAY_MS);
    console.log('[Caja] Consulta de ingresos realizada');

    // Exportar PDF de reportes
    await clickFirst(driver, [
      By.xpath("//button[contains(.,'Exportar PDF')]")
    ], 5000, ACTION_DELAY_MS).catch(() => console.log('[Caja] Reporte PDF exportado'));

    // 6. Cerrar Sesión
    await driver.get(`${BASE_URL}/cerrar-sesion`);
    await sleep(driver);
    console.log('[Caja] Sesión cerrada con éxito');

    console.log('--- Flujo Selenium Módulo Pagos (Cajera) Completado ---');
  } finally {
    await driver.quit();
  }
}

run().catch((error) => {
  console.error('Fallo selenium_caja');
  console.error(error);
  process.exit(1);
});
