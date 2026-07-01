import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import process from 'node:process';

const BASE_URL = process.env.SELENIUM_BASE_URL || 'http://localhost:5173';
const USER = process.env.SELENIUM_USER || 'admin';
const PASS = process.env.SELENIUM_PASS || '4321';
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
  // Forzar siempre click por JavaScript para evitar cualquier intercepción
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
    console.log(`[Agente] Iniciando flujo Admin y Agente Inteligente en ${BASE_URL}`);
    await login(driver);
    console.log('[Agente] Inicio de sesión exitoso');

    // 1. Navegar al módulo de documentos del agente
    await driver.get(`${BASE_URL}/documentos-agente`);
    await sleep(driver);
    console.log('[Agente] Navegado al módulo de documentos del agente');

    // Verificar que muestre contenido
    const pageBody = await driver.findElement(By.css('body')).getText();
    if (pageBody.toLowerCase().includes('documento') || pageBody.toLowerCase().includes('subir')) {
      console.log('[Agente] Página de documentos verificada exitosamente');
    }

    // 2. Acceder al panel del agente inteligente (hacer click en el botón flotante del robot)
    console.log('[Agente] Abriendo panel flotante del agente inteligente...');
    await clickFirst(driver, [
      By.css('.ai-floating-button'),
      By.xpath("//button[contains(@class,'ai-floating-button')]")
    ], 10000, ACTION_DELAY_MS);

    // 3. Realizar una consulta de prueba
    const queryText = 'Hola, ¿cuáles son los requisitos de inscripción según el reglamento?';
    console.log(`[Agente] Enviando consulta de prueba: "${queryText}"`);
    
    await typeFirst(driver, [
      By.css('.ai-input'),
      By.css('input[placeholder*="Escribe"]')
    ], queryText, 10000, ACTION_DELAY_MS);

    await clickFirst(driver, [
      By.css('.ai-send-btn'),
      By.css('button[type="submit"]')
    ], 10000, ACTION_DELAY_MS);

    // 4. Verificar respuesta del agente
    console.log('[Agente] Esperando respuesta del Agente Inteligente (RAG)...');
    // Esperar a que desaparezca el indicador de "procesando" o aparezca la burbuja de la respuesta
    await driver.wait(async () => {
      const messages = await driver.findElements(By.css('.ai-message.assistant'));
      return messages.length > 0;
    }, 20000);

    const lastMessage = await driver.findElement(By.css('.ai-message.assistant:last-child .ai-message-content'));
    const responseText = await lastMessage.getText();
    console.log(`[Agente] Respuesta del agente obtenida:\n"${responseText.substring(0, 150)}..."`);

    if (responseText && responseText.trim().length > 5) {
      console.log('[Agente] ¡Prueba de respuesta del agente VERIFICADA con éxito!');
    } else {
      throw new Error('La respuesta del agente está vacía o es demasiado corta.');
    }

    // Cerrar panel de agente
    await clickFirst(driver, [
      By.css('.ai-btn-icon[title="Cerrar"]'),
      By.xpath("//button[contains(.,'Close') or @title='Cerrar']")
    ], 5000, ACTION_DELAY_MS).catch(() => null);

    // 5. Cerrar sesión
    await driver.get(`${BASE_URL}/cerrar-sesion`);
    await sleep(driver);
    console.log('[Agente] Sesión cerrada con éxito');

    console.log('--- Flujo Selenium Módulo Consultas (Agente) Completado ---');
  } finally {
    await driver.quit();
  }
}

run().catch((error) => {
  console.error('Fallo selenium_agente');
  console.error(error);
  process.exit(1);
});
