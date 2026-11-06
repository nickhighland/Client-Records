import {
    checkFirstLogin,
    createUser,
    loginUser,
    loginUserWithBiometricSecret,
    getLastAuthError,
    getCurrentUser,
    clearActiveSession,
    getBiometricAvailability,
    storeCurrentBiometricLogin,
    readBiometricLoginSecret,
    removeBiometricLoginForUser,
    requestPasswordReset,
    confirmPasswordReset,
    requestEmailVerification,
    confirmEmailVerification,
    updateRecoverySettings,
    getRecoverySettings,
    testSmtpSettings,
    deleteUserAccount
} from '../../database.js';

export function createAuthController() {
    const BIOMETRIC_LOGIN_USERNAME_KEY = 'biometricLoginUsername';
    let biometricLaunchAttempted = false;
    let biometricLoginInProgress = false;
    const isDesktopRuntime = () => typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;
    let biometricAvailability = {
        supported: isDesktopRuntime(),
        available: isDesktopRuntime(),
        enrolled: true,
        message: ''
    };
    const getBiometricLabel = () => (/mac/i.test(navigator.platform || '') ? 'Touch ID' : 'Biometric Login');
    const getRememberedBiometricUsername = () => (localStorage.getItem(BIOMETRIC_LOGIN_USERNAME_KEY) || '').trim();
    const rememberBiometricUsername = (username) => {
        const normalizedUsername = (username || '').trim();
        if (!normalizedUsername) return;
        localStorage.setItem(BIOMETRIC_LOGIN_USERNAME_KEY, normalizedUsername);
    };
    const clearRememberedBiometricUsername = () => {
        localStorage.removeItem(BIOMETRIC_LOGIN_USERNAME_KEY);
    };
    const isBiometricCancellationMessage = (message) => {
        const text = String(message || '').toLowerCase();
        return text.includes('canceled')
            || text.includes('cancelled')
            || text.includes('user canceled')
            || text.includes('user cancelled');
    };
    const normalizeBiometricAvailability = (availability) => ({
        supported: availability?.supported !== false,
        available: !!availability?.available,
        enrolled: availability?.enrolled !== false,
        message: typeof availability?.message === 'string' ? availability.message.trim() : ''
    });
    const getBiometricEnrollmentHelpText = () => {
        if (!isDesktopRuntime()) return '';
        return /mac/i.test(navigator.platform || '')
            ? 'Fingerprint enrollment happens in macOS System Settings > Touch ID & Password.'
            : 'Biometric enrollment is managed by your operating system, not inside the app.';
    };
    async function refreshBiometricAvailability() {
        biometricAvailability = normalizeBiometricAvailability(await getBiometricAvailability());
        return biometricAvailability;
    }

    const loginOverlay = document.getElementById('loginOverlay');
    const loginUsernameInput = document.getElementById('loginUsernameInput');
    const loginPasswordInput = document.getElementById('loginPasswordInput');
    const loginBtn = document.getElementById('loginBtn');
    const loginErrorMsg = document.getElementById('loginErrorMsg');
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    // --- Login and Auto-Lock Logic ---
    let inactivityTimer;
    let countdownInterval = null;
    let countdownDeadline = null;
    const COUNTDOWN_SECONDS = 60; // seconds of warning before locking

    function getInactivityLimit() {
        const sel = document.getElementById('autolockSelect');
        return sel ? parseInt(sel.value, 10) : 600000;
    }

    function stopCountdown() {
        if (countdownInterval !== null) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        countdownDeadline = null;
        const countdown = document.getElementById('autolockCountdown');
        const select    = document.getElementById('autolockSelect');
        if (countdown) countdown.style.display = 'none';
        if (select)    select.style.display    = '';
    }

    function startCountdown() {
        const countdown = document.getElementById('autolockCountdown');
        const select    = document.getElementById('autolockSelect');
        if (select)    select.style.display    = 'none';
        if (countdown) countdown.style.display = '';

        countdownDeadline = Date.now() + (COUNTDOWN_SECONDS * 1000);

        function formatTime(secs) {
            const m = Math.floor(secs / 60);
            const s = secs % 60;
            return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`;
        }

        const updateCountdown = () => {
            const remaining = Math.max(0, Math.ceil((countdownDeadline - Date.now()) / 1000));
            if (countdown) countdown.textContent = `Locking in ${formatTime(remaining)}…`;
            if (remaining <= 0) {
                stopCountdown();
                lockApp();
            }
        };

        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
    }

    const reconcileCountdownAfterResume = () => {
        if (!document.hidden && countdownDeadline !== null) {
            const remaining = Math.max(0, Math.ceil((countdownDeadline - Date.now()) / 1000));
            if (remaining <= 0) {
                stopCountdown();
                lockApp();
            }
        }
    };
    document.addEventListener('visibilitychange', reconcileCountdownAfterResume);
    window.addEventListener('focus', reconcileCountdownAfterResume);
    window.addEventListener('pageshow', reconcileCountdownAfterResume);

    function setBiometricStatusMessage(message = '', color = 'var(--text-color-secondary)') {
        if (!biometricLoginStatusMsg) return;
        biometricLoginStatusMsg.textContent = message;
        biometricLoginStatusMsg.style.color = color;
    }

    function refreshBiometricLoginUI() {
        if (!biometricLoginPanel || !biometricLoginBtn || !biometricLoginHint) return;

        const rememberedUsername = getRememberedBiometricUsername();
        const biometricLabel = getBiometricLabel();

        biometricLoginBtn.textContent = `Unlock with ${biometricLabel}`;

        if (!isDesktopRuntime() || isFirstLogin || !rememberedUsername) {
            biometricLoginPanel.style.display = 'none';
            biometricLoginHint.textContent = '';
            if (biometricEnrollmentHint) {
                biometricEnrollmentHint.style.display = !isDesktopRuntime() || isFirstLogin || rememberedUsername
                    ? 'none'
                    : 'block';
            }
            if (!rememberedUsername) {
                setBiometricStatusMessage('');
            }
            return;
        }

        biometricLoginPanel.style.display = 'block';
        if (biometricEnrollmentHint) {
            biometricEnrollmentHint.style.display = 'none';
        }
        biometricLoginHint.textContent = `Saved for ${rememberedUsername} on this Mac.`;
        biometricLoginBtn.disabled = biometricLoginInProgress;
        biometricLoginBtn.style.opacity = biometricLoginInProgress ? '0.75' : '1';
        biometricLoginBtn.style.cursor = biometricLoginInProgress ? 'wait' : 'pointer';

        if (loginUsernameInput && !loginUsernameInput.value.trim()) {
            loginUsernameInput.value = rememberedUsername;
        }
    }

    function refreshBiometricSettingsUI() {
        if (!enableBiometricLoginBtn || !disableBiometricLoginBtn || !biometricSettingsStatus) return;

        const currentUsername = (getCurrentUser() || '').trim();
        const rememberedUsername = getRememberedBiometricUsername();
        const biometricLabel = getBiometricLabel();
        const enabledForCurrentUser = !!currentUsername && currentUsername === rememberedUsername;
        const availability = biometricAvailability || {};
        const biometricSupported = availability.supported !== false;
        const biometricAvailable = !!availability.available;
        const availabilityMessage = (availability.message || '').trim();

        enableBiometricLoginBtn.textContent = `Enable ${biometricLabel}`;
        disableBiometricLoginBtn.textContent = `Disable ${biometricLabel}`;
        if (biometricEnrollmentHelp) {
            biometricEnrollmentHelp.textContent = getBiometricEnrollmentHelpText();
        }

        if (!isDesktopRuntime()) {
            biometricSettingsStatus.style.color = 'var(--text-color-secondary)';
            biometricSettingsStatus.textContent = `${biometricLabel} launch login is only available in the desktop app.`;
            enableBiometricLoginBtn.disabled = true;
            disableBiometricLoginBtn.disabled = true;
            return;
        }

        enableBiometricLoginBtn.disabled = !currentUsername || biometricLoginInProgress || !biometricAvailable;
        disableBiometricLoginBtn.disabled = !enabledForCurrentUser || biometricLoginInProgress;

        if (!biometricSupported || (!biometricAvailable && availabilityMessage)) {
            biometricSettingsStatus.style.color = availability.enrolled === false ? '#e67e22' : 'var(--text-color-secondary)';
            biometricSettingsStatus.textContent = availabilityMessage || `${biometricLabel} is not available right now.`;
        } else if (!currentUsername) {
            biometricSettingsStatus.style.color = 'var(--text-color-secondary)';
            biometricSettingsStatus.textContent = `Unlock the app before configuring ${biometricLabel}.`;
        } else if (enabledForCurrentUser) {
            biometricSettingsStatus.style.color = '#27ae60';
            biometricSettingsStatus.textContent = `${biometricLabel} launch login is enabled for ${currentUsername}.`;
        } else if (rememberedUsername) {
            biometricSettingsStatus.style.color = '#e67e22';
            biometricSettingsStatus.textContent = `${biometricLabel} launch login is currently saved for ${rememberedUsername}.`;
        } else {
            biometricSettingsStatus.style.color = 'var(--text-color-secondary)';
            biometricSettingsStatus.textContent = `${biometricLabel} launch login is not enabled on this Mac.`;
        }
    }

    async function finalizeSuccessfulUnlock() {
        const hooks = window.__appAuthHooks;
        if (!hooks) {
            throw new Error('Application is not initialized yet.');
        }

        try {
            await hooks.loadDataFromLocalStorage();
        } catch (error) {
            clearActiveSession();
            throw new Error(`Incorrect password, ${getBiometricLabel()} login, or corrupted data.`);
        }

        loginOverlay.style.display = 'none';
        document.getElementById('appContainer').style.display = 'flex';
        resetInactivityTimer();

        hooks.normalizeClientData();
        hooks.fullRender();
        setBiometricStatusMessage('');
        refreshBiometricSettingsUI();
    }

    async function enableBiometricLoginForCurrentSession() {
        const currentUsername = (getCurrentUser() || '').trim();
        const biometricLabel = getBiometricLabel();
        const previouslyRememberedUsername = getRememberedBiometricUsername();
        if (!currentUsername) {
            refreshBiometricSettingsUI();
            return false;
        }

        const availability = await refreshBiometricAvailability();
        if (!availability.available) {
            refreshBiometricSettingsUI();
            return false;
        }

        biometricLoginInProgress = true;
        enableBiometricLoginBtn.disabled = true;
        disableBiometricLoginBtn.disabled = true;
        biometricSettingsStatus.style.color = 'var(--text-color-secondary)';
        biometricSettingsStatus.textContent = `Saving ${biometricLabel} launch login...`;

        if (previouslyRememberedUsername && previouslyRememberedUsername !== currentUsername) {
            await removeBiometricLoginForUser(previouslyRememberedUsername);
        }

        const success = await storeCurrentBiometricLogin();
        biometricLoginInProgress = false;

        if (success) {
            rememberBiometricUsername(currentUsername);
            biometricLaunchAttempted = true;
            setBiometricStatusMessage(`${biometricLabel} launch login is ready for ${currentUsername}.`, '#27ae60');
        } else if (getRememberedBiometricUsername() === currentUsername) {
            clearRememberedBiometricUsername();
        }

        await refreshBiometricAvailability();
        refreshBiometricLoginUI();
        refreshBiometricSettingsUI();

        if (!success) {
            biometricSettingsStatus.style.color = '#e74c3c';
            biometricSettingsStatus.textContent = getLastAuthError() || `Failed to enable ${biometricLabel}.`;
        }

        return success;
    }

    async function disableBiometricLoginForCurrentSession() {
        const currentUsername = (getCurrentUser() || '').trim();
        const biometricLabel = getBiometricLabel();
        if (!currentUsername) {
            refreshBiometricSettingsUI();
            return false;
        }

        biometricLoginInProgress = true;
        enableBiometricLoginBtn.disabled = true;
        disableBiometricLoginBtn.disabled = true;
        biometricSettingsStatus.style.color = 'var(--text-color-secondary)';
        biometricSettingsStatus.textContent = `Removing ${biometricLabel} launch login...`;

        const success = await removeBiometricLoginForUser(currentUsername);
        biometricLoginInProgress = false;

        if (success) {
            clearRememberedBiometricUsername();
            setBiometricStatusMessage('', 'var(--text-color-secondary)');
        }

        refreshBiometricLoginUI();
        refreshBiometricSettingsUI();

        if (!success) {
            biometricSettingsStatus.style.color = '#e74c3c';
            biometricSettingsStatus.textContent = getLastAuthError() || `Failed to disable ${biometricLabel}.`;
        }

        return success;
    }

    async function attemptBiometricLogin({ autoTriggered = false } = {}) {
        const rememberedUsername = getRememberedBiometricUsername();
        const biometricLabel = getBiometricLabel();

        if (!rememberedUsername || biometricLoginInProgress || isFirstLogin || !isDesktopRuntime()) {
            return false;
        }

        biometricLoginInProgress = true;
        refreshBiometricLoginUI();
        refreshBiometricSettingsUI();
        loginUsernameInput.value = rememberedUsername;

        if (!autoTriggered) {
            setBiometricStatusMessage(`Waiting for ${biometricLabel}...`);
            loginErrorMsg.style.display = 'none';
        }

        try {
            const secret = await readBiometricLoginSecret(rememberedUsername);
            if (!secret) {
                throw new Error(getLastAuthError() || `${biometricLabel} login failed.`);
            }

            const success = await loginUserWithBiometricSecret(rememberedUsername, secret);
            if (!success) {
                throw new Error(getLastAuthError() || `${biometricLabel} login failed.`);
            }

            await finalizeSuccessfulUnlock();
            return true;
        } catch (error) {
            clearActiveSession();

            const message = error?.message || String(error) || `${biometricLabel} login failed.`;
            const lowerMessage = message.toLowerCase();
            if (lowerMessage.includes('item not found') || lowerMessage.includes('no touch id login is saved')) {
                clearRememberedBiometricUsername();
            }

            if (!autoTriggered || !isBiometricCancellationMessage(message)) {
                loginErrorMsg.textContent = message;
                loginErrorMsg.style.display = 'block';
            }

            setBiometricStatusMessage(
                isBiometricCancellationMessage(message)
                    ? `${biometricLabel} was canceled. You can use your password instead.`
                    : message,
                isBiometricCancellationMessage(message) ? 'var(--text-color-secondary)' : '#e74c3c'
            );

            return false;
        } finally {
            biometricLoginInProgress = false;
            refreshBiometricLoginUI();
            refreshBiometricSettingsUI();
        }
    }

    function showVerificationPanel(username = '') {
        const verifyPanel = document.getElementById('verifyEmailPanel');
        const resetPanel = document.getElementById('resetPanel');
        const smtpPanel = document.getElementById('smtpSettingsPanel');
        const deletePanel = document.getElementById('deleteAccountPanel');
        verifyPanel.style.display = 'block';
        resetPanel.style.display = 'none';
        smtpPanel.style.display = 'none';
        deletePanel.style.display = 'none';
        if (username) {
            document.getElementById('loginUsernameInput').value = username.trim();
        }
        document.getElementById('verifyEmailStatusMsg').textContent = '';
    }

    async function showSmtpSettingsPanel(username = '') {
        const panel = document.getElementById('smtpSettingsPanel');
        document.getElementById('loginToolsDropdown').classList.add('hidden');
        document.getElementById('resetPanel').style.display = 'none';
        document.getElementById('verifyEmailPanel').style.display = 'none';
        document.getElementById('deleteAccountPanel').style.display = 'none';
        panel.style.display = 'block';

        const normalizedUsername = (username || document.getElementById('loginUsernameInput').value || '').trim();
        document.getElementById('smtpUpdateUsernameInput').value = normalizedUsername;
        document.getElementById('smtpUpdateHostInput').value = 'smtp.gmail.com';
        document.getElementById('smtpUpdatePortInput').value = '587';
        document.getElementById('smtpUpdateSecurityInput').value = 'starttls';
        document.getElementById('smtpSettingsStatusMsg').textContent = '';

        const loginPassword = document.getElementById('loginPasswordInput').value || '';
        if (normalizedUsername && loginPassword) {
            const settings = await getRecoverySettings(normalizedUsername, loginPassword);
            if (settings) {
                document.getElementById('smtpUpdateRecoveryEmailInput').value = settings.email || '';
                document.getElementById('smtpUpdateHostInput').value = settings.smtpHost || 'smtp.gmail.com';
                document.getElementById('smtpUpdatePortInput').value = String(settings.smtpPort || 587);
                document.getElementById('smtpUpdateSecurityInput').value = ['tls', 'ssl', 'starttls'].includes((settings.smtpSecurity || '').toLowerCase())
                    ? (settings.smtpSecurity || '').toLowerCase()
                    : 'starttls';
                document.getElementById('smtpUpdateUsernameSmtpInput').value = settings.smtpUsername || '';
                document.getElementById('smtpUpdateFromInput').value = settings.smtpFrom || settings.email || '';
                document.getElementById('smtpSettingsStatusMsg').style.color = 'var(--text-color-secondary)';
                document.getElementById('smtpSettingsStatusMsg').textContent = 'Loaded saved SMTP settings. Enter SMTP app password to test/save.';
            } else {
                document.getElementById('smtpUpdateRecoveryEmailInput').value = document.getElementById('onboardingEmailInput').value || '';
                document.getElementById('smtpUpdateFromInput').value = document.getElementById('smtpUpdateRecoveryEmailInput').value || '';
                document.getElementById('smtpSettingsStatusMsg').style.color = '#e67e22';
                document.getElementById('smtpSettingsStatusMsg').textContent = getLastAuthError() || 'Enter current password to load saved SMTP fields.';
            }
        } else {
            document.getElementById('smtpUpdateRecoveryEmailInput').value = document.getElementById('onboardingEmailInput').value || '';
            document.getElementById('smtpUpdateFromInput').value = document.getElementById('smtpUpdateRecoveryEmailInput').value || '';
        }

        document.getElementById('smtpUpdatePasswordSmtpInput').value = '';
    }

    function resetInactivityTimer() {
        stopCountdown();
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(startCountdown, getInactivityLimit());
    }

    function isAppUnlocked() {
        const appContainer = document.getElementById('appContainer');
        return !!appContainer && window.getComputedStyle(appContainer).display !== 'none';
    }

    let lastActivityResetAt = 0;
    function handleInactivityResetOnActivity() {
        if (!isAppUnlocked()) return;

        const now = Date.now();
        if (now - lastActivityResetAt < 250) return;

        lastActivityResetAt = now;
        resetInactivityTimer();
    }

    async function lockApp() {
        stopCountdown();
        clearTimeout(inactivityTimer);
        const hooks = window.__appAuthHooks;
        if (isAppUnlocked() && hooks?.saveDataToLocalStorage) {
            try {
                await hooks.saveDataToLocalStorage();
            } catch (error) {
                console.error('Failed to save before lock:', error);
            }
        }
        clearActiveSession();
        loginOverlay.style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
        loginUsernameInput.value = '';
        loginPasswordInput.value = '';
        loginErrorMsg.style.display = 'none';
        document.getElementById('resetPanel').style.display = 'none';
        document.getElementById('verifyEmailPanel').style.display = 'none';
        document.getElementById('smtpSettingsPanel').style.display = 'none';
        document.getElementById('deleteAccountPanel').style.display = 'none';
        document.getElementById('loginToolsDropdown').classList.add('hidden');
        setBiometricStatusMessage('');
        refreshBiometricSettingsUI();
        initLoginScreen(); // Re-check if it's still the first login
    }

    let isFirstLogin = false;

    async function initLoginScreen() {
        isFirstLogin = await checkFirstLogin();
        const authError = getLastAuthError();
        const onboardingRecoverySection = document.getElementById('onboardingRecoverySection');
        const resetPanel = document.getElementById('resetPanel');
        const verifyEmailPanel = document.getElementById('verifyEmailPanel');
        const smtpSettingsPanel = document.getElementById('smtpSettingsPanel');
        const loginToolsMenu = document.getElementById('loginToolsMenu');
        const deleteAccountPanel = document.getElementById('deleteAccountPanel');
        if (authError) {
            const hint = authError.includes('window.__TAURI_INTERNALS__') || authError.includes('invoke')
                ? 'Open the desktop app window (Tauri), not the browser URL.'
                : '';
            loginErrorMsg.textContent = hint ? `${authError} ${hint}` : authError;
            loginErrorMsg.style.display = 'block';
        } else {
            loginErrorMsg.style.display = 'none';
        }
        if (isFirstLogin) {
            document.getElementById('loginTitle').textContent = "Create Account";
            document.getElementById('loginSubtitle').textContent = "Create a username/password and recovery email + SMTP settings.";
            loginBtn.textContent = "Create Account";
            onboardingRecoverySection.style.display = 'block';
            forgotPasswordBtn.style.display = 'none';
            loginToolsMenu.style.display = 'none';
            resetPanel.style.display = 'none';
            verifyEmailPanel.style.display = 'none';
            smtpSettingsPanel.style.display = 'none';
            deleteAccountPanel.style.display = 'none';
        } else {
            document.getElementById('loginTitle').textContent = "SmartEMR Login";
            document.getElementById('loginSubtitle').textContent = "Enter your username and password to unlock SmartEMR.";
            loginBtn.textContent = "Unlock";
            onboardingRecoverySection.style.display = 'none';
            forgotPasswordBtn.style.display = 'block';
            loginToolsMenu.style.display = 'block';
            resetPanel.style.display = 'none';
            verifyEmailPanel.style.display = 'none';
            smtpSettingsPanel.style.display = 'none';
            deleteAccountPanel.style.display = 'none';
        }

        await refreshBiometricAvailability();
        refreshBiometricLoginUI();
        refreshBiometricSettingsUI();

        if (!isFirstLogin && !biometricLaunchAttempted && getRememberedBiometricUsername() && isDesktopRuntime()) {
            biometricLaunchAttempted = true;
            setTimeout(() => {
                attemptBiometricLogin({ autoTriggered: true });
            }, 150);
        }
    }

    async function unlockApp() {
        const username = loginUsernameInput.value;
        const password = loginPasswordInput.value;
    
        if (username && password) {
            let success = false;
            if (isFirstLogin) {
                const recoveryEmail = document.getElementById('onboardingEmailInput').value;
                const smtpHost = document.getElementById('onboardingSmtpHostInput').value;
                const smtpPort = document.getElementById('onboardingSmtpPortInput').value;
                const smtpSecurity = document.getElementById('onboardingSmtpSecurityInput').value;
                const smtpUsername = document.getElementById('onboardingSmtpUsernameInput').value;
                const smtpPassword = document.getElementById('onboardingSmtpPasswordInput').value;
                const smtpFrom = document.getElementById('onboardingSmtpFromInput').value;
                success = await createUser(username, password, recoveryEmail, {
                    smtpHost,
                    smtpPort,
                    smtpSecurity,
                    smtpUsername,
                    smtpPassword,
                    smtpFrom
                });

                if (success) {
                    showVerificationPanel(username);
                    const verifyStatus = document.getElementById('verifyEmailStatusMsg');
                    verifyStatus.style.color = '#27ae60';
                    verifyStatus.textContent = 'Verification code sent. Enter it below to finish setup.';
                    loginErrorMsg.style.display = 'none';
                    return;
                }
            } else {
                success = await loginUser(username, password);

                if (!success) {
                    const authError = getLastAuthError() || '';
                    if (authError.toLowerCase().includes('email not verified')) {
                        showVerificationPanel(username);
                        const verifyStatus = document.getElementById('verifyEmailStatusMsg');
                        verifyStatus.style.color = '#e67e22';
                        verifyStatus.textContent = 'Email not verified. Send or enter your verification code.';
                    }
                }
            }

            if (success) {
                try {
                    await finalizeSuccessfulUnlock();
                } catch (e) {
                    loginErrorMsg.textContent = e?.message || "Incorrect username, password, or corrupted data.";
                    loginErrorMsg.style.display = 'block';
                }
            } else {
                const authError = getLastAuthError();
                loginErrorMsg.textContent = authError || (isFirstLogin ? "Failed to create user." : "Incorrect username or password.");
                loginErrorMsg.style.display = 'block';
                if (isFirstLogin && authError && authError.includes('already exists')) {
                    await initLoginScreen();
                }
            }
        } else {
            loginErrorMsg.textContent = "Please enter a username and password.";
            loginErrorMsg.style.display = 'block';
        }
    }

    loginBtn.addEventListener('click', unlockApp);
    loginPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') unlockApp();
    });
    loginUsernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loginPasswordInput.focus();
    });
    biometricLoginBtn?.addEventListener('click', () => {
        attemptBiometricLogin({ autoTriggered: false });
    });
    enableBiometricLoginBtn?.addEventListener('click', async () => {
        await enableBiometricLoginForCurrentSession();
    });
    disableBiometricLoginBtn?.addEventListener('click', async () => {
        await disableBiometricLoginForCurrentSession();
    });

    forgotPasswordBtn.addEventListener('click', () => {
        const resetPanel = document.getElementById('resetPanel');
        const resetUsernameInput = document.getElementById('resetUsernameInput');
        resetPanel.style.display = resetPanel.style.display === 'none' ? 'block' : 'none';
        document.getElementById('verifyEmailPanel').style.display = 'none';
        document.getElementById('smtpSettingsPanel').style.display = 'none';
        document.getElementById('deleteAccountPanel').style.display = 'none';
        resetUsernameInput.value = (loginUsernameInput.value || '').trim();
        document.getElementById('resetStatusMsg').textContent = '';
    });

    document.getElementById('openSmtpPanelBtn').addEventListener('click', async () => {
        await showSmtpSettingsPanel();
    });

    document.getElementById('openSmtpPanelFromVerifyBtn').addEventListener('click', async () => {
        const username = (document.getElementById('loginUsernameInput').value || '').trim();
        await showSmtpSettingsPanel(username);
    });

    document.getElementById('cancelResetBtn').addEventListener('click', () => {
        document.getElementById('resetPanel').style.display = 'none';
        document.getElementById('resetStatusMsg').textContent = '';
    });

    document.getElementById('loginToolsBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById('loginToolsDropdown');
        dropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        const menu = document.getElementById('loginToolsMenu');
        if (!menu.contains(e.target)) {
            document.getElementById('loginToolsDropdown').classList.add('hidden');
        }
    });

    document.getElementById('openDeleteAccountPanelBtn').addEventListener('click', () => {
        document.getElementById('loginToolsDropdown').classList.add('hidden');
        document.getElementById('resetPanel').style.display = 'none';
        document.getElementById('verifyEmailPanel').style.display = 'none';
        document.getElementById('smtpSettingsPanel').style.display = 'none';
        const panel = document.getElementById('deleteAccountPanel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        document.getElementById('deleteAccountStatusMsg').textContent = '';
        document.getElementById('deleteAccountUsernameInput').value = (document.getElementById('loginUsernameInput').value || '').trim();
    });

    // Auto-suggest port when security mode changes
    function suggestPortForSecurity(securityValue, portInput) {
        const currentPort = Number(portInput.value);
        if (securityValue === 'tls' || securityValue === 'ssl') {
            if (currentPort === 587 || currentPort === 25 || !currentPort) {
                portInput.value = '465';
            }
        } else if (securityValue === 'starttls') {
            if (currentPort === 465 || currentPort === 25 || !currentPort) {
                portInput.value = '587';
            }
        }
    }

    document.getElementById('smtpUpdateSecurityInput').addEventListener('change', (e) => {
        suggestPortForSecurity(e.target.value, document.getElementById('smtpUpdatePortInput'));
    });

    document.getElementById('onboardingSmtpSecurityInput').addEventListener('change', (e) => {
        suggestPortForSecurity(e.target.value, document.getElementById('onboardingSmtpPortInput'));
    });

    // Validate port/security match and warn user
    function validatePortSecurityMatch(security, port) {
        // Allow any port/security combination - providers vary
        return '';
    }

    document.getElementById('saveSmtpSettingsBtn').addEventListener('click', async () => {
        const username = (document.getElementById('smtpUpdateUsernameInput').value || '').trim();
        const password = document.getElementById('smtpUpdatePasswordInput').value || '';
        const recoveryEmail = (document.getElementById('smtpUpdateRecoveryEmailInput').value || '').trim();
        const smtpHost = (document.getElementById('smtpUpdateHostInput').value || '').trim();
        const smtpPort = document.getElementById('smtpUpdatePortInput').value;
        const smtpSecurity = document.getElementById('smtpUpdateSecurityInput').value;
        const smtpUsername = (document.getElementById('smtpUpdateUsernameSmtpInput').value || '').trim();
        const smtpPassword = document.getElementById('smtpUpdatePasswordSmtpInput').value || '';
        const smtpFrom = (document.getElementById('smtpUpdateFromInput').value || '').trim();
        const status = document.getElementById('smtpSettingsStatusMsg');

        // Warn about port/security mismatch
        const mismatchWarning = validatePortSecurityMatch(smtpSecurity, smtpPort);
        if (mismatchWarning) {
            status.style.color = '#e67e22';
            status.textContent = mismatchWarning;
            return;
        }

        status.style.color = 'var(--text-color-secondary)';
        status.textContent = 'Saving SMTP settings and sending verification code...';

        const success = await updateRecoverySettings(username, password, recoveryEmail, {
            smtpHost,
            smtpPort,
            smtpSecurity,
            smtpUsername,
            smtpPassword,
            smtpFrom
        }, true);

        if (!success) {
            status.style.color = '#e74c3c';
            status.textContent = getLastAuthError() || 'Failed to update SMTP settings.';
            return;
        }

        const saveMessage = getLastAuthError() || 'SMTP settings updated.';
        if (saveMessage.toLowerCase().includes('verification email failed')) {
            status.style.color = '#f39c12';
            status.textContent = saveMessage;
            return;
        }

        status.style.color = '#27ae60';
        status.textContent = saveMessage;

        document.getElementById('verifyEmailCodeInput').value = '';
        document.getElementById('verifyEmailStatusMsg').textContent = 'Settings updated. Enter your new verification code.';
        document.getElementById('verifyEmailStatusMsg').style.color = '#27ae60';
        document.getElementById('smtpSettingsPanel').style.display = 'none';
        document.getElementById('verifyEmailPanel').style.display = 'block';
    });

    document.getElementById('testSmtpSettingsBtn').addEventListener('click', async () => {
        const username = (document.getElementById('smtpUpdateUsernameInput').value || '').trim();
        const password = document.getElementById('smtpUpdatePasswordInput').value || '';
        const recoveryEmail = (document.getElementById('smtpUpdateRecoveryEmailInput').value || '').trim();
        const smtpHost = (document.getElementById('smtpUpdateHostInput').value || '').trim();
        const smtpPort = document.getElementById('smtpUpdatePortInput').value;
        const smtpSecurity = document.getElementById('smtpUpdateSecurityInput').value;
        const smtpUsername = (document.getElementById('smtpUpdateUsernameSmtpInput').value || '').trim();
        const smtpPassword = document.getElementById('smtpUpdatePasswordSmtpInput').value || '';
        const smtpFrom = (document.getElementById('smtpUpdateFromInput').value || '').trim();
        const status = document.getElementById('smtpSettingsStatusMsg');

        // Warn about port/security mismatch
        const mismatchWarning = validatePortSecurityMatch(smtpSecurity, smtpPort);
        if (mismatchWarning) {
            status.style.color = '#e67e22';
            status.textContent = mismatchWarning;
            return;
        }

        status.style.color = 'var(--text-color-secondary)';
        status.textContent = 'Sending SMTP test email...';

        const ok = await testSmtpSettings(username, password, recoveryEmail, {
            smtpHost,
            smtpPort,
            smtpSecurity,
            smtpUsername,
            smtpPassword,
            smtpFrom
        });

        if (!ok) {
            status.style.color = '#e74c3c';
            status.textContent = getLastAuthError() || 'SMTP test failed.';
            return;
        }

        status.style.color = '#27ae60';
        status.textContent = 'SMTP test email sent successfully.';
    });

    document.getElementById('cancelSmtpSettingsBtn').addEventListener('click', () => {
        document.getElementById('smtpSettingsPanel').style.display = 'none';
        document.getElementById('smtpSettingsStatusMsg').textContent = '';
    });

    document.getElementById('sendVerifyEmailCodeBtn').addEventListener('click', async () => {
        const username = (document.getElementById('loginUsernameInput').value || '').trim();
        const status = document.getElementById('verifyEmailStatusMsg');
        status.style.color = 'var(--text-color-secondary)';
        status.textContent = 'Sending verification code...';

        const success = await requestEmailVerification(username);
        if (success) {
            status.style.color = '#27ae60';
            status.textContent = getLastAuthError() || 'Verification code sent.';
        } else {
            status.style.color = '#e74c3c';
            status.textContent = getLastAuthError() || 'Failed to send verification code.';
        }
    });

    document.getElementById('confirmVerifyEmailBtn').addEventListener('click', async () => {
        const username = (document.getElementById('loginUsernameInput').value || '').trim();
        const code = (document.getElementById('verifyEmailCodeInput').value || '').trim();
        const status = document.getElementById('verifyEmailStatusMsg');

        status.style.color = 'var(--text-color-secondary)';
        status.textContent = 'Verifying email...';

        const verified = await confirmEmailVerification(username, code);
        if (!verified) {
            status.style.color = '#e74c3c';
            status.textContent = getLastAuthError() || 'Verification failed.';
            return;
        }

        status.style.color = '#27ae60';
        status.textContent = 'Email verified. Unlocking...';
        document.getElementById('loginUsernameInput').value = username;

        const password = document.getElementById('loginPasswordInput').value || '';
        if (!password) {
            status.style.color = '#27ae60';
            status.textContent = 'Email verified. Enter password and click Unlock.';
            return;
        }

        await unlockApp();
    });

    document.getElementById('cancelVerifyEmailBtn').addEventListener('click', () => {
        document.getElementById('verifyEmailPanel').style.display = 'none';
        document.getElementById('verifyEmailStatusMsg').textContent = '';
    });

    document.getElementById('cancelDeleteAccountBtn').addEventListener('click', () => {
        document.getElementById('deleteAccountPanel').style.display = 'none';
        document.getElementById('deleteAccountStatusMsg').textContent = '';
    });

    document.getElementById('confirmDeleteAccountBtn').addEventListener('click', async () => {
        const username = (document.getElementById('deleteAccountUsernameInput').value || '').trim();
        const password = document.getElementById('deleteAccountPasswordInput').value || '';
        const usernameAgain = (document.getElementById('deleteAccountConfirmUsernameInput').value || '').trim();
        const typedWord = (document.getElementById('deleteAccountTypedWordInput').value || '').trim();
        const status = document.getElementById('deleteAccountStatusMsg');

        if (!username || !password || !usernameAgain || !typedWord) {
            status.style.color = '#e74c3c';
            status.textContent = 'Complete all deletion fields.';
            return;
        }

        if (username !== usernameAgain) {
            status.style.color = '#e74c3c';
            status.textContent = 'Username confirmation does not match.';
            return;
        }

        if (typedWord !== 'DELETE ACCOUNT') {
            status.style.color = '#e74c3c';
            status.textContent = 'You must type DELETE ACCOUNT exactly.';
            return;
        }

        const secondConfirmation = confirm('Final confirmation: This will permanently delete this account and local encrypted data. Continue?');
        if (!secondConfirmation) {
            status.style.color = 'var(--text-color-secondary)';
            status.textContent = 'Deletion cancelled.';
            return;
        }

        status.style.color = 'var(--text-color-secondary)';
        status.textContent = 'Deleting account...';

        const success = await deleteUserAccount(username, password);
        if (success) {
            if (getRememberedBiometricUsername() === username) {
                clearRememberedBiometricUsername();
                setBiometricStatusMessage('');
            }
            status.style.color = '#27ae60';
            status.textContent = 'Account deleted. You can now create a fresh account.';

            document.getElementById('deleteAccountPasswordInput').value = '';
            document.getElementById('deleteAccountConfirmUsernameInput').value = '';
            document.getElementById('deleteAccountTypedWordInput').value = '';
            document.getElementById('resetPanel').style.display = 'none';

            await initLoginScreen();
        } else {
            status.style.color = '#e74c3c';
            status.textContent = getLastAuthError() || 'Account deletion failed.';
        }
    });

    document.getElementById('sendResetCodeBtn').addEventListener('click', async () => {
        const username = (document.getElementById('resetUsernameInput').value || '').trim();
        const status = document.getElementById('resetStatusMsg');
        status.style.color = 'var(--text-color-secondary)';
        status.textContent = 'Sending reset code...';
        const success = await requestPasswordReset(username);
        if (success) {
            status.style.color = '#27ae60';
            status.textContent = getLastAuthError() || 'Reset code sent.';
        } else {
            status.style.color = '#e74c3c';
            status.textContent = getLastAuthError() || 'Failed to send reset code.';
        }
    });

    document.getElementById('confirmResetBtn').addEventListener('click', async () => {
        const username = (document.getElementById('resetUsernameInput').value || '').trim();
        const code = (document.getElementById('resetCodeInput').value || '').trim();
        const newPassword = document.getElementById('resetNewPasswordInput').value || '';
        const confirmPassword = document.getElementById('resetConfirmPasswordInput').value || '';
        const status = document.getElementById('resetStatusMsg');

        if (newPassword !== confirmPassword) {
            status.style.color = '#e74c3c';
            status.textContent = 'Passwords do not match.';
            return;
        }

        status.style.color = 'var(--text-color-secondary)';
        status.textContent = 'Resetting password...';

        const success = await confirmPasswordReset(username, code, newPassword);
        if (success) {
            status.style.color = '#27ae60';
            status.textContent = 'Password reset successful. You can now log in.';
            document.getElementById('loginUsernameInput').value = username;
            document.getElementById('loginPasswordInput').value = '';
            document.getElementById('resetCodeInput').value = '';
            document.getElementById('resetNewPasswordInput').value = '';
            document.getElementById('resetConfirmPasswordInput').value = '';
        } else {
            status.style.color = '#e74c3c';
            status.textContent = getLastAuthError() || 'Password reset failed.';
        }
    });

    // Initialize login screen
    initLoginScreen();

    const autolockSelect = document.getElementById('autolockSelect');
    if (autolockSelect) {
        autolockSelect.addEventListener('change', () => {
            if (isAppUnlocked()) {
                resetInactivityTimer();
            }
        });
    }

    // Reset timer on any app activity; capture phase avoids missing events that stop bubbling.
    ['mousemove', 'mousedown', 'keydown', 'scroll', 'click', 'pointerdown', 'pointermove', 'touchstart', 'wheel', 'input'].forEach((eventName) => {
        document.addEventListener(eventName, handleInactivityResetOnActivity, true);
    });

        return {
            lockApp,
            getRememberedBiometricUsername,
            clearRememberedBiometricUsername,
            refreshBiometricSettingsUI,
            setBiometricStatusMessage
        };
}
