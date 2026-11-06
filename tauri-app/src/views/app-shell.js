import accountAndLogin from './fragments/account-and-login.html?raw';
import cssrs from './fragments/cssrs.html?raw';
import workspace from './fragments/workspace.html?raw';
import clinicalInstructions from './fragments/clinical-instructions.html?raw';
import settings from './fragments/settings.html?raw';
import soapPlatformConfiguration from './fragments/soap-platform-configuration.html?raw';
import additionalModals from './fragments/additional-modals.html?raw';
import fileInput from './fragments/file-input.html?raw';

const applicationMarkup = [
    accountAndLogin,
    cssrs,
    workspace,
    clinicalInstructions,
    settings,
    soapPlatformConfiguration,
    additionalModals,
    fileInput
].join('\n');

export const mountAppShell = () => {
    const mountPoint = document.getElementById('appShellRoot');
    if (!mountPoint) throw new Error('The application shell mount point is missing.');
    mountPoint.outerHTML = applicationMarkup;
};
