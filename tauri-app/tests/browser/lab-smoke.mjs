import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Run against `npm run preview -- --port 4173` after npm run build.
// Only synthetic content and an in-memory SQLite database are used.
const config = JSON.parse(await readFile(new URL('../../src-tauri/tauri.conf.json',import.meta.url),'utf8'));
const db = new DatabaseSync(':memory:');
const secrets = new Map(), errors = [], dialogs = [];
let failWrites = false, destroyed = false;
const browser = await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
const context = await browser.newContext({permissions:['clipboard-read','clipboard-write'],viewport:{width:1500,height:950}});
const page = await context.newPage();
await page.exposeFunction('testInvoke',async (command,args = {}) => {
    if (command === 'plugin:sql|load') return args.db;
    if (command === 'plugin:sql|select' || command === 'plugin:sql|execute') {
        if (failWrites && command.endsWith('execute') && args.query.startsWith('INSERT INTO app_state')) throw new Error('Simulated disk full');
        const statement = db.prepare(args.query);
        const values = Object.fromEntries((args.values||[]).map((value,index)=>[String(index+1),value??null]));
        const parameters = Object.keys(values).length ? [values] : [];
        if (command.endsWith('select')) return statement.all(...parameters);
        const result = statement.run(...parameters); return [Number(result.changes),Number(result.lastInsertRowid)];
    }
    if (command === 'read_app_secret') return secrets.get(args.key)||null;
    if (command === 'store_app_secret') { secrets.set(args.key,args.secret); return; }
    if (command === 'remove_app_secret') { secrets.delete(args.key); return; }
    if (command === 'get_biometric_availability') return {supported:false,available:false,enrolled:false};
    if (command === 'plugin:event|listen') return 1;
    if (command === 'plugin:window|destroy') { destroyed = true; return; }
    if (command === 'plugin:dialog|confirm') return true;
    if (command === 'plugin:dialog|ask') return true;
    if (command === 'plugin:dialog|message') return;
    throw new Error(`Unexpected native operation: ${command}`);
});
await page.addInitScript(() => {
    let callbackId = 0;
    window.__testNativeCallbacks = new Map();
    window.__TAURI_INTERNALS__ = {invoke:window.testInvoke,metadata:{currentWindow:{label:'main'},currentWebview:{label:'main'}},
        transformCallback:callback=>{window.__testNativeCallbacks.set(++callbackId,callback);return callbackId;},unregisterCallback:()=>{}};
    window.__TAURI__ = {core:{invoke:window.testInvoke}};
    window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {unregisterListener:()=>{}};
    window.confirm = () => true;
});
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error' && /Content Security Policy|Refused to/.test(message.text())) errors.push(message.text());});
page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.accept();});
await page.route('**/*',async route=>{
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    await route.fulfill({response,headers:{...response.headers(),'content-security-policy':config.app.security.csp}});
});
try {
    await page.goto(process.env.LAB_TEST_URL||'http://localhost:4173');
    await page.waitForFunction(()=>document.querySelector('#loginTitle')?.textContent==='Create Lab Account');
    await page.locator('#loginUsernameInput').fill('synthetic-lab');
    await page.locator('#loginPasswordInput').fill('synthetic password');
    await page.locator('#loginBtn').click();
    await page.locator('.lab-dialog [data-close]').click();
    await page.locator('[data-action=demo]').click();
    await page.waitForFunction(()=>document.querySelector('#soapO')?.value.includes('Writer explored guilt'));
    assert.match(await page.locator('[data-identity]').textContent(),/Morgan/);
    await page.locator('[data-action=preview]').click();
    const preview = page.locator('.lab-dialog [data-text]');
    assert.match(await preview.inputValue(),/Writer explored guilt/);
    assert.doesNotMatch(await preview.inputValue(),/Writer utilized narrative externalization/);
    await page.locator('.lab-dialog [data-reviewed]').check();
    await page.locator('.lab-dialog [data-copy]').click();
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),await preview.inputValue());
    await page.locator('.lab-dialog [data-close]').click();
    assert.equal(await page.locator('[data-status]').textContent(),'Copied');
    await page.locator('[data-action=transferred]').click();
    assert.equal(await page.locator('[data-status]').textContent(),'Transferred');
    await page.locator('[data-action=history]').click();
    // History may be empty until the first substantive edit.
    const objective = page.locator('#soapO');
    await objective.fill('Writer explored Ct’s concerns. </textarea><img src=x onerror="window.__injected=true">');
    await objective.blur();
    await page.waitForTimeout(1700);
    await page.evaluate(()=>window.__appAuthHooks.fullRender());
    assert.match(await objective.inputValue(),/<img src=x/);
    assert.equal(await page.evaluate(()=>window.__injected),undefined);
    assert.notEqual(await page.locator('[data-status]').textContent(),'Transferred');
    await page.locator('[data-action=history]').click();
    await page.locator('.lab-dialog [data-restore]').click();
    assert.match(await objective.inputValue(),/Writer explored guilt/);
    await page.waitForTimeout(1700);
    const savedCiphertext = db.prepare("SELECT value FROM app_state WHERE key='main_state'").get().value;
    assert.ok(!savedCiphertext.includes('Writer explored'));
    failWrites = true;
    await objective.fill('Writer retained this unsaved edit.'); await objective.blur();
    const unsavedText = await objective.inputValue();
    await page.evaluate(()=>window.__appAuthHooks.saveDataToLocalStorage());
    await page.evaluate(()=>document.querySelector('#lockScreenBtn').click());
    await page.waitForFunction(()=>document.querySelector('#loginOverlay').style.display==='flex');
    assert.equal(db.prepare("SELECT value FROM app_state WHERE key='main_state'").get().value,savedCiphertext);
    await page.locator('#loginUsernameInput').fill('synthetic-lab');
    await page.locator('#loginPasswordInput').fill('synthetic password');
    await page.locator('#loginBtn').click();
    await page.waitForFunction(()=>document.querySelector('#appContainer').style.display==='flex');
    // Unlock deliberately resets selection; select the same encounter again.
    await page.locator('#clientList .client-item').first().click();
    await page.locator('#appointmentList .appointment-item').first().click();
    assert.equal(await objective.inputValue(),unsavedText);
    failWrites = false;
    assert.equal(await page.evaluate(()=>window.__appAuthHooks.saveDataToLocalStorage()),true);
    assert.equal(destroyed,false);
    assert.deepEqual(errors,[]);
    await page.screenshot({path:'/tmp/smartemr-lab-smoke.png',fullPage:true});
    console.log('Lab browser smoke passed: account, demo, exact copy, transfer status, history, safe rendering, failed-save lock recovery.');
} catch (error) {
    console.error({errors,dialogs,loginError:await page.locator('#loginErrorMsg').textContent()});
    await page.screenshot({path:'/tmp/smartemr-lab-smoke-failure.png',fullPage:true});
    throw error;
} finally { await browser.close(); db.close(); }
