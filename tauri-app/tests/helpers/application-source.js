import { readFile } from 'node:fs/promises';

const readSource = async relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

export async function readApplicationSource() {
    const [htmlEntry, accountAndLogin, cssrsModal, workspace, clinicalInstructions, settings, soapPlatformConfiguration, additionalModals, fileInput, baseStyles, workspaceStyles, modalStyles, controlStyles, cssrs, clientRecord, treatmentPlan, dateControls, richNoteEditor, clientViews, clientRecordEditor, objectiveOrdering, interventionMatching, promptConfig, aiProviderClient, providerController, authController, platformModel, objectiveReviewModel, objectiveReviewStateModel, auditModel, domElements, appModule] = await Promise.all([
        readSource('index.html'),
        readSource('src/views/fragments/account-and-login.html'),
        readSource('src/views/fragments/cssrs.html'),
        readSource('src/views/fragments/workspace.html'),
        readSource('src/views/fragments/clinical-instructions.html'),
        readSource('src/views/fragments/settings.html'),
        readSource('src/views/fragments/soap-platform-configuration.html'),
        readSource('src/views/fragments/additional-modals.html'),
        readSource('src/views/fragments/file-input.html'),
        readSource('src/styles/base.css'),
        readSource('src/styles/workspace.css'),
        readSource('src/styles/modals.css'),
        readSource('src/styles/controls.css'),
        readSource('src/features/cssrs.js'),
        readSource('src/domain/client-record.js'),
        readSource('src/domain/treatment-plan.js'),
        readSource('src/features/treatment-plan/date-controls.js'),
        readSource('src/features/notes/rich-note-editor.js'),
        readSource('src/features/clients/client-views.js'),
        readSource('src/features/clients/client-record-editor.js'),
        readSource('src/features/soap/objective-ordering.js'),
        readSource('src/features/interventions/intervention-matching.js'),
        readSource('src/features/soap/prompt-config.js'),
        readSource('src/services/ai-provider-client.js'),
        readSource('src/features/soap/provider-controller.js'),
        readSource('src/features/auth/auth-controller.js'),
        readSource('src/features/soap/platform-model.js'),
        readSource('src/features/soap/objective-review-model.js'),
        readSource('src/features/soap/objective-review-state.js'),
        readSource('src/features/soap/audit-model.js'),
        readSource('src/ui/dom-elements.js'),
        readSource('src/main.js')
    ]);

    const styles = [baseStyles, workspaceStyles, modalStyles, controlStyles].join('\n');
    const applicationMarkup = [accountAndLogin, cssrsModal, workspace, clinicalInstructions, settings, soapPlatformConfiguration, additionalModals, fileInput].join('\n');
    const mountedHtml = htmlEntry.replace('<div id=\"appShellRoot\"></div>', applicationMarkup);
    const materializedStyles = mountedHtml.replace(
        '<link rel="stylesheet" href="/src/styles.css">',
        `<style>\n${styles}\n</style>`
    );
    const interventionMatchingTestSource = interventionMatching
        .replace(/^import \{[\s\S]*?\} from ['\"]\.\.\/soap\/objective-ordering\.js['\"];\n/, '')
        .replace(/^export const /gm, 'const ');
    const testModuleSource = [clientRecord, treatmentPlan, dateControls, richNoteEditor, clientViews, clientRecordEditor, objectiveOrdering, interventionMatchingTestSource, promptConfig, aiProviderClient, providerController, auditModel, domElements]
        .map(source => source.replace(/^([ \t]*)export const /gm, '$1const ').replace(/^export const /gm, 'const '))
        .join('\n');
    const authTestSource = authController
        .replace(/^import \{[\s\S]*?from ['\"]\.\.\/\.\.\/database\.js['\"];\n/, '')
        .replace('export function createAuthController', 'function createAuthController');
    const platformModelTestSource = platformModel.replace(/^export const /gm, 'const ');
    const objectiveReviewModelTestSource = objectiveReviewModel
        .replace(/^import \{[\s\S]*?from ['\"]\.\/objective-ordering\.js['\"];\n/, '')
        .replace(/^export const /gm, 'const ');
    const objectiveReviewStateTestSource = objectiveReviewStateModel
        .replace(/^import \{[\s\S]*?from ['\"]\.\/objective-ordering\.js['\"];\n/, '')
        .replace(/^import \{[\s\S]*?from ['\"]\.\/objective-review-model\.js['\"];\n/, '')
        .replace(/^export const /gm, 'const ') + '\nconst objectiveReviewStateModelEnd = true;';
    const mainWithoutFeatureImport = appModule
        .replace("import './features/cssrs.js';\n", '')
        .replace("import { createAiProviderClient } from './services/ai-provider-client.js';\n", '')
        .replace("import { createSoapProviderController } from './features/soap/provider-controller.js';\n", '')
        .replace("import { createClientViews } from './features/clients/client-views.js';\n", '')
        .replace("import { createClientRecordEditor } from './features/clients/client-record-editor.js';\n", '')
        .replace("import { createAuthController } from './features/auth/auth-controller.js';\n", '')
        .replace("import { mountAppShell } from './views/app-shell.js';\n", '')
        .replace("import { bindApplicationElements } from './ui/dom-elements.js';\n", '')
        .replace(/^import \{[\s\S]*?from ['\"]\.\/features\/soap\/platform-model\.js['\"];\n/m, '')
        .replace(/^import \{[\s\S]*?from ['\"]\.\/features\/soap\/objective-review-model\.js['\"];\n/m, '')
        .replace(/^import \{[\s\S]*?from ['\"]\.\/features\/soap\/objective-review-state\.js['\"];\n/m, '')
        .replace(/^import \{[\s\S]*?from ['\"]\.\/features\/soap\/audit-model\.js['\"];\n/m, '')
        .replace(/^import \{[\s\S]*?from ['\"]\.\/features\/interventions\/intervention-matching\.js['\"];\n/m, '')
        .replace(/import \{[\s\S]*?from ['\"]\.\/domain\/(?:client-record|treatment-plan)\.js['\"];\n/g, '')
        .replace(/import \{[\s\S]*?from ['\"]\.\/features\/treatment-plan\/date-controls\.js['\"];\n/g, '')
        .replace(/import \{[\s\S]*?from ['\"]\.\/features\/notes\/rich-note-editor\.js['\"];\n/g, '')
        .replace(/import \{[\s\S]*?from ['\"]\.\/features\/soap\/objective-ordering\.js['\"];\n/g, '')
        .replace(/import \{[\s\S]*?from ['\"]\.\/features\/soap\/prompt-config\.js['\"];\n/g, '')
        .replace(/import \{[\s\S]*?from ['\"]\.\/services\/ai-provider-client\.js['\"];\n/g, '');

    return materializedStyles.replace(
        '<script type="module" src="/src/main.js"></script>',
        `<script>\n${cssrs}\n</script>\n<script type="module">\n${testModuleSource}\n${authTestSource}\n${platformModelTestSource}\n${objectiveReviewModelTestSource}\n${objectiveReviewStateTestSource}\n${mainWithoutFeatureImport}\n</script>`
    );
}
