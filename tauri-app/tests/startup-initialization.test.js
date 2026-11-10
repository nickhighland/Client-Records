import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const htmlPaths = [
    path.join(here, '../index.html'),
    path.join(here, '../src/index.html')
];

const getLoadCollapsedStates = (html) => {
    const declaration = 'const loadCollapsedStates = () => {';
    const start = html.indexOf(declaration);
    assert.notEqual(start, -1, 'loadCollapsedStates declaration should exist');
    const end = html.indexOf('\n            };', start);
    assert.notEqual(end, -1, 'loadCollapsedStates declaration should be complete');
    const expressionStart = html.indexOf('=', start) + 1;
    return html.slice(expressionStart, end + '\n            }'.length).trim().replace(/;$/, '');
};

for (const htmlPath of htmlPaths) {
    test(`${path.basename(path.dirname(htmlPath))}/index.html restores only present collapsible sections`, async () => {
        const html = await readFile(htmlPath, 'utf8');
        const expression = getLoadCollapsedStates(html);
        const sectionStates = new Map();
        const ariaStates = new Map();
        const buttons = ['deletedAppointments', 'goalsList'].map(sectionKey => {
            const section = {
                classList: {
                    toggle(className, enabled) {
                        sectionStates.set(sectionKey, { className, enabled });
                    }
                }
            };
            return {
                dataset: { sectionKey },
                closest(selector) {
                    assert.equal(selector, '.section-collapser');
                    return section;
                },
                setAttribute(name, value) {
                    ariaStates.set(sectionKey, { name, value });
                }
            };
        });
        const document = {
            querySelectorAll(selector) {
                assert.equal(selector, '.section-collapser-btn');
                return buttons;
            }
        };
        const localStorage = {
            getItem(key) {
                if (key === 'deletedAppointmentsCollapsed') return 'true';
                return null;
            }
        };

        const loadCollapsedStates = new Function('document', 'localStorage', `return ${expression};`)(document, localStorage);
        assert.doesNotThrow(() => loadCollapsedStates());
        assert.deepEqual(sectionStates.get('deletedAppointments'), {
            className: 'section-collapsed', enabled: true
        });
        assert.deepEqual(sectionStates.get('goalsList'), {
            className: 'section-collapsed', enabled: false
        });
        assert.deepEqual(ariaStates.get('deletedAppointments'), {
            name: 'aria-expanded', value: 'false'
        });
        assert.deepEqual(ariaStates.get('goalsList'), {
            name: 'aria-expanded', value: 'true'
        });
    });
}
