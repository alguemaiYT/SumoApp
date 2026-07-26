import fs from 'fs';
import path from 'path';

async function run() {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  const downloadsDir = 'C:\\Users\\Aluno\\Downloads';
  const tabs = [
    { index: 0, name: 'sumo_app_telemetria.png' },
    { index: 1, name: 'sumo_app_estrategias.png' },
    { index: 2, name: 'sumo_app_calibracao.png' },
    { index: 3, name: 'sumo_app_console.png' }
  ];

  for (const tab of tabs) {
    // Click tab button
    await page.evaluate((idx) => {
      const btns = document.querySelectorAll('nav button');
      if (btns[idx]) btns[idx].click();
    }, tab.index);

    await new Promise(r => setTimeout(r, 600));

    // Scroll main 100% down
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.scrollTop = main.scrollHeight;
    });

    await new Promise(r => setTimeout(r, 600));

    const filePath = path.join(downloadsDir, tab.name);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`SUCCESS: ${filePath}`);
  }

  await browser.close();
}

run().catch(console.error);
