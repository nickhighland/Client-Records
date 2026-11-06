import './features/cssrs.js';
import { bindApplicationElements } from './ui/dom-elements.js';
import { createAuthController } from './features/auth/auth-controller.js';
import {
    normalizeObjectiveRedundancyGroupsFromAi,
    completeObjectiveTopicGroups,
    limitObjectiveReviewDefaults,
    buildObjectiveRedundancyReviewData
} from './features/soap/objective-review-model.js';
import {
    getResolvedSoapAuditResult,
    getAuditProofingData,
    getSoapAuditProofingContext,
    hasAppointmentGenerationInput,
    runSoapAuditCheck
} from './features/soap/audit-model.js';
import {
    ensureSoapObjectiveActionState,
    updateSoapFieldValue,
    isLegacySoapPresentingProblem,
    getObjectiveRedundancyReview,
    getObjectiveRedundancyItemsForReview,
    reconcileObjectiveRedundancyReview,
    getSelectedObjectiveRedundancyIndexes,
    getSelectedObjectiveRedundancyItemIndexes,
    getObjectiveRedundancyGroupedItemIndexes,
    getObjectiveRedundancyGroupedSuggestionSourceIndexes,
    setObjectiveRedundancyItemSelected,
    getObjectiveRedundancyDecision
} from './features/soap/objective-review-state.js';
import {
    SOAP_PLATFORM_SECTION_DEFS,
    SOAP_PLATFORM_DEFAULT_ORDER,
    getDefaultSoapPlatforms,
    normalizeSoapPlatformList,
    findSoapPlatformById,
    findClientSoapPlatform,
    findDefaultSoapPlatformId,
    getSoapPlatformSectionKeysFromList,
    isSoapPlatformSectionEnabledInList,
    getSoapPlatformSectionDefinitionByKey,
    createSoapPlatformSnapshot,
    getSoapPlatformSectionKeysForAppointmentFromList
} from './features/soap/platform-model.js';
import { createAiProviderClient } from './services/ai-provider-client.js';
import { createSoapProviderController } from './features/soap/provider-controller.js';
import { createClientViews } from './features/clients/client-views.js';
import { createClientRecordEditor } from './features/clients/client-record-editor.js';
import {
    OBJECTIVE_INTERVENTION_MIN_TARGET,
    OBJECTIVE_INTERVENTION_MAX_COUNT,
    selectInterventionsFromBank,
    extractInterventionsFromObjective as extractSupportedInterventionsFromObjective
} from './features/interventions/intervention-matching.js';
import { invoke } from '@tauri-apps/api/core';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { save, ask, message } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import {
    choosePreferredVertexModel,
    fetchVertexGeminiModelCatalog,
    getVertexApiHost,
    getVertexRequestLocations,
    isVertexPublisherModelNotFound,
    normalizeVertexLocation
} from './vertex-models.js';
import {
    buildVertexCachedSoapPayload,
    buildVertexDirectSoapPayload,
    buildVertexSoapCacheMaterial,
    getOrCreateVertexSoapContextCache,
    invalidateVertexContextCache
} from './vertex-context-cache.js';
import {
    loadEncryptedStateWithLegacyMigration,
    saveEncryptedState
} from './state-persistence.js';
import {
    CLIENT_EMAIL_PATTERN,
    createEmptySessionMember,
    ensureClientContactInfo,
    formatClientPhoneInput,
    getClientContactEntryValue,
    getClientContactValidationMessage,
    getClientDiagnoses,
    getClientSessionMembers,
    getClientSessionType,
    formatTreatmentPlanDiagnosisEntries,
    hasAssignedClientSessionType,
    isClientContactEntryLocked,
    isCoupleClient,
    normalizeClientContactEntries,
    normalizeClientDiagnoses,
    normalizeClientSessionType,
    normalizeDiagnosisEntry,
    normalizePreferredPronounRecord,
    parseTreatmentPlanDiagnosisEntries,
    normalizeSessionMembers,
    syncLegacyDiagnosisText
} from './domain/client-record.js';
import {
    DEFAULT_GOAL_TIMELINE_MONTHS,
    DEFAULT_OBJECTIVE_TIMELINE_MONTHS,
    TREATMENT_PLAN_TIMELINE_OPTIONS,
    addMonthsToDateInput,
    formatPlanDate,
    getClientTreatmentPlanStartDate,
    getGoalTreatmentPlanStartDate,
    getObjectiveTreatmentPlanStartDate,
    getTreatmentPlanTimelineOptionsMarkup,
    isValidDateInputValue,
    normalizeTreatmentPlanTimeline,
    parseLocalDateInput,
    renderTreatmentPlanDateRange
} from './domain/treatment-plan.js';
import {
    initializeSegmentedDateInputs,
    renderSegmentedDateControlMarkup,
    syncSegmentedDateInput
} from './features/treatment-plan/date-controls.js';
import {
    getRichNoteSemanticTags,
    getRichNoteTextColor,
    RICH_NOTE_COLOR_BASE_ATTRIBUTE,
    RICH_NOTE_COLOR_THEME_ATTRIBUTE,
    getRichNoteTheme,
    clampRichNoteColorChannel,
    parseRichNoteColor,
    normalizeRichNoteColor,
    invertRichNoteColor,
    getRichNoteColorDisplayValue,
    getRichNoteColorMetadata,
    getRichNoteColoredNodes,
    sanitizeRichNoteHtml,
    normalizeRichNoteColorMetadata,
    updateRichNoteColorsForTheme,
    plainTextToRichNoteHtml,
    setRichNoteEditorValue,
    getRichNoteEditorValue,
    isRichNoteEditorNode,
    saveRichNoteSelection,
    restoreRichNoteSelection,
    getRichNoteToolbar,
    updateRichNoteColorSwatch,
    updateRichNoteColorInputForTheme,
    updateRichNoteToolbarState,
    updateRichNoteToolbarStates,
    executeRichNoteCommand,
    handleRichNoteShortcut
} from './features/notes/rich-note-editor.js';
import {
    soapTopicStopWords,
    soapTopicWeakAnchorTokens,
    splitSoapBulletItems,
    joinSoapBulletItems,
    normalizeObjectiveLine,
    normalizeObjectiveOrderingItem,
    normalizeObjectiveSection,
    normalizeObjectiveSuggestions,
    tokenizeForSoapTopic,
    getTopicTextFromSuggestion,
    scoreTopicOverlap,
    hasStrongSingleTopicAnchor,
    buildObjectiveTopicClusters,
    getTopicRankForText,
    sortByTopicOrderStable,
    sortByExplicitTopicRanksStable,
    SOAP_SORT_SECTION_KEYS,
    ensureSoapSectionOrderOverrides,
    setSoapSectionOrderOverride,
    isSoapSectionOrderOverridden,
    alignSoapSectionsByObjectiveOrder
} from './features/soap/objective-ordering.js';
import {
    SOAP_SESSION_NOTE_PROSE_GUIDANCE,
    SOAP_MEDICAL_NECESSITY_GUIDANCE,
    SOAP_INSTRUCTION_SECTION_DEFS,
    TREATMENT_GOAL_INSTRUCTION_SECTION_DEFS,
    SOAP_GUIDANCE_MIGRATION_VERSION,
    LEGACY_SOAP_INSTRUCTION_DEFAULTS,
    SOAP_GOLDEN_THREAD_CHAIN,
    SOAP_OBJECTIVE_SUGGESTION_MIN_COUNT,
    SOAP_OBJECTIVE_SUGGESTION_MAX_COUNT,
    GOLDEN_THREAD_SOAP_GUIDANCE_MARKER,
    GOLDEN_THREAD_SOAP_GUIDANCE_ADDENDUM,
    getDefaultInstructionSections,
    normalizeInstructionSections,
    appendSoapGuidanceAddendum,
    migrateSoapGuidanceOnce,
    migrateLegacyInstructionSections,
    buildInstructionGuidanceBlock,
    getDefaultSoapInstructionSections,
    getDefaultTreatmentGoalInstructionSections,
    buildSoapSystemPrompt,
    DEFAULT_SOAP_SYSTEM_PROMPT,
    buildTreatmentGoalSystemPrompt,
    DEFAULT_GOAL_GENERATION_SYSTEM_PROMPT
} from './features/soap/prompt-config.js';
import {
    checkFirstLogin,
    createUser,
    loginUser,
    loginUserWithBiometricSecret,
    getLastAuthError,
    getCurrentUser,
    clearActiveSession,
    changePassword,
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
    deleteUserAccount,
    saveState,
    loadState,
    isDatabaseInitialized,
    importEncryptedSqlDump,
    importSqlDump,
    exportEncryptedSqlDump
} from './database.js';

const { mountAppShell } = await import('./views/app-shell.js');
mountAppShell();

document.addEventListener('DOMContentLoaded', () => {
    const {
        clientListEl,
        todaySessionsListEl,
        todaySessionsCountEl,
        clearTodaySessionsBtn,
        mainBankCountEl,
        mainBankSearchInput,
        clearMainBankSearchBtn,
        addClientBtn,
        sortClientsBtn,
        appointmentListEl,
        addAppointmentBtn,
        addIntakeBtn,
        appointmentDateInput,
        updateAppointmentDateBtn,
        noteNameInput,
        addNoteBtn,
        renameNoteBtn,
        deletedClientsListEl,
        clearDeletedClientsBtn,
        archivedClientsListEl,
        deletedAppointmentsListEl,
        clearDeletedAppointmentsBtn,
        persistentNotesEl,
        nextSessionNotesEl,
        clientDetailsTabBtn,
        contactTabBtn,
        nextSessionTabBtn,
        clientDetailsContentEl,
        contactContentEl,
        nextSessionContentEl,
        clientDiagnosesListEl,
        addDiagnosisBtn,
        clientPresentingProblemEl,
        sessionInfoEl,
        auditProofSymptomsEl,
        auditProofFunctionalEl,
        auditProofProgressEl,
        auditProofNecessityEl,
        regularSessionFieldsEl,
        auditProofingBlockEl,
        intakeSessionBlockEl,
        intakeFieldsContainerEl,
        copyIntakeSessionBtn,
        guidingModalitiesListEl,
        guidingModalityOtherWrapEl,
        guidingModalityOtherEl,
        soapContentEl,
        autoSaveIndicator,
        saveStatus,
        clientDetailsTabGroup,
        updateClientDetailsTabLabels,
        compactLabels,
        settingsBtn,
        checkForUpdatesBtn,
        menuBackupWarning,
        menuUpdateAsterisk,
        checkForUpdatesAsterisk,
        settingsModal,
        closeSettingsBtn,
        openSoapConfigurationBtn,
        soapConfigurationModal,
        closeSoapConfigurationBtn,
        doneSoapConfigurationBtn,
        soapPlatformSelect,
        soapPlatformNameInput,
        saveSoapPlatformNameBtn,
        newSoapPlatformNameInput,
        addSoapPlatformBtn,
        deleteSoapPlatformBtn,
        soapPlatformSectionsList,
        informedConsentBtn,
        soapAuditGuideBtn,
        soapInstructionsBtn,
        treatmentGoalsInstructionsBtn,
        interventionBankBtn,
        informedConsentModal,
        closeConsentBtn,
        copyConsentNotationBtn,
        closeConsentBtnBottom,
        soapAuditGuideModal,
        closeSoapAuditGuideBtn,
        closeSoapAuditGuideBtnBottom,
        goalGeneratorModal,
        closeGoalGeneratorBtn,
        generateGoalsBtn,
        addClientModal,
        closeAddClientBtn,
        cancelAddClientBtn,
        confirmAddClientBtn,
        addClientNameInput,
        exportDataModal,
        closeExportDataBtn,
        exportDataText,
        copyExportDataBtn,
        downloadExportDataBtn,
        goalDiagnosisInput,
        presentingProblemShorthandInput,
        goalCountInput,
        objectiveCountInput,
        objectivesPerGoalInput,
        objectiveCountHelp,
        objectiveStyleSelect,
        runGoalGeneratorBtn,
        applyGeneratedGoalsBtn,
        applyGeneratedGoalsBottomBtn,
        generatedGoalsReview,
        interventionBankModal,
        closeInterventionBankBtn,
        newInterventionInput,
        newInterventionModalitySelect,
        newInterventionModalityOtherWrap,
        newInterventionModalityOther,
        newInterventionCouplesOnly,
        addInterventionBtn,
        interventionBankList,
        interventionPickerModal,
        closeInterventionPickerBtn,
        interventionPickerList,
        saveInterventionSelectionBtn,
        manualSaveBtn,
        exportBtn,
        importBtn,
        eraseAllBtn,
        currentPasswordInput,
        newPasswordInput,
        confirmNewPasswordInput,
        changePasswordBtn,
        changePasswordStatus,
        loginOverlay,
        loginUsernameInput,
        loginPasswordInput,
        loginBtn,
        loginErrorMsg,
        forgotPasswordBtn,
        biometricLoginPanel,
        biometricLoginBtn,
        biometricLoginHint,
        biometricLoginStatusMsg,
        enableBiometricLoginBtn,
        disableBiometricLoginBtn,
        biometricSettingsStatus,
        customInstructionsBtn,
        customInstructionsModal,
        closeCustomInstructionsBtn,
        persistentInstructionsInput,
        sessionInstructionsInput,
        preferredPronounsSelect,
        clientSessionTypeSelect,
        clientSoapPlatformSelect,
        clientPreferredPronounsWrapEl,
        sessionMembersWrapEl,
        sessionMembersListEl,
        addSessionMemberBtn,
        customPronounsWrapEl,
        customPronounSubjectInput,
        customPronounObjectInput,
        customPronounPossessiveInput,
        saveCustomInstructionsBtn,
        clearCustomInstructionsBtn,
        customInstructionsModalitiesListEl,
        customInstructionsModalityOtherWrapEl,
        customInstructionsModalityOtherEl,
        soapInstructionsModal,
        closeSoapInstructionsBtn,
        soapInstructionsSectionsEl,
        saveSoapInstructionsBtn,
        resetSoapInstructionsBtn,
        treatmentGoalsInstructionsModal,
        closeTreatmentGoalsInstructionsBtn,
        treatmentGoalsInstructionsSectionsEl,
        saveTreatmentGoalsInstructionsBtn,
        resetTreatmentGoalsInstructionsBtn,
        apiProviderSelect,
        openwebuiSettings,
        serverAddressInput,
        apiKeyInput,
        ollamaSettings,
        ollamaAddressInput,
        vertexSettings,
        vertexServiceAccountInput,
        selectVertexKeyBtn,
        clearVertexKeyBtn,
        vertexKeyFileInput,
        vertexKeyStatus,
        vertexLocationInput,
        vertexModelInput,
        refreshVertexModelsBtn,
        vertexModelStatus,
        openaiSettings,
        openaiApiKeyInput,
        openaiModelInput,
        connectApiBtn,
        verifyApiBtn,
        apiStatus,
        modelSelect,
        modelSelectWrapper,
        generateNoteBtn,
        fileInput,
        appModeEmrBtn,
        appModeDsmBtn,
        appModeAssessmentsBtn,
        appModeSafetyPlanBtn,
        headerColumnControls,
        mainGridEl,
        workspaceViewEl,
        dsmIframeEl,
        assessmentsIframeEl,
        safetyPlanIframeEl,
        headerMenu,
        headerMenuBtn,
        headerMenuDropdown,
        configureBackupBtn,
        clearBackupBtn,
        themeToggleBtn,
        lockScreenBtn,
        goalsListInTabEl,
        addGoalBtnInTab,
        treatmentPlanStartDateInput,
        appointmentsTabBtn,
        goalsTabBtn,
        appointmentsTabContent,
        goalsTabContent,
        deletedClientsToggleBtn,
        archivedClientsToggleBtn,
        deletedAppointmentsToggleBtn,
        goalsListToggleBtn,
    } = bindApplicationElements();

    // App State
    let data = { clients: [], archivedClients: [], soapPlatforms: [] };
    let deletedItems = { clients: [], appointments: [], notes: [], intakes: [] };
    let selectedClientId = null;
    let selectedAppointmentId = null;
    let selectedNoteId = null;
    let selectedIntakeId = null;
    const soapNoteGenerationInFlight = new Set();
    const objectiveOrganizationInFlight = new Set();
    const objectiveReviewPreparationInFlight = new Set();
    const getAppointmentTaskKey = (clientId, appointmentId) => JSON.stringify([String(clientId || ''), String(appointmentId || '')]);
    const isSoapNoteGenerationInFlight = (clientId, appointmentId) => soapNoteGenerationInFlight.has(getAppointmentTaskKey(clientId, appointmentId));
    const isObjectiveOrganizationInFlight = (appointmentContext) => Boolean(appointmentContext
        && objectiveOrganizationInFlight.has(getAppointmentTaskKey(appointmentContext.clientId, appointmentContext.appointmentId)));
    const isObjectiveReviewPreparationInFlight = (appointmentContext) => Boolean(appointmentContext
        && objectiveReviewPreparationInFlight.has(getAppointmentTaskKey(appointmentContext.clientId, appointmentContext.appointmentId)));
    const updateGenerateNoteButtonState = () => {
        if (!generateNoteBtn) return;
        const client = findClient(selectedClientId);
        const appointment = findAppointment(client, selectedAppointmentId);
        const isGenerating = Boolean(appointment && isSoapNoteGenerationInFlight(client.id, appointment.id));
        const isBusy = Boolean(appointment && (isGenerating
            || isObjectiveOrganizationInFlight({ clientId: client.id, appointmentId: appointment.id })
            || isObjectiveReviewPreparationInFlight({ clientId: client.id, appointmentId: appointment.id })));
        generateNoteBtn.disabled = !appointment || !hasAppointmentGenerationInput(appointment) || isBusy;
        generateNoteBtn.textContent = isGenerating ? 'Generating...' : isBusy ? 'Processing...' : 'Generate Note';
    };
    let recordViewClearedForSelectedClient = false;
    let appointmentDateManualOverride = null;
    let appointmentDateRefreshTimer = null;
    let clientSearchQuery = '';
    let isDirty = false;
    let apiProvider = 'openwebui';
    let serverAddress = null;
    let apiKey = null;
    let ollamaAddress = null;
    let vertexServiceAccount = null;
    let vertexLocation = 'global';
    let vertexModelCatalog = [];
    let openaiApiKey = null;
    let selectedModel = null;
    let persistentInstructions = '';
    let activeNotesTab = 'clientDetails';
    let activeSoapPlatformId = null;
    let draggedSoapPlatformSectionKey = null;
    let soapPlatformPointerDragState = null;

    const updateNotesTabUI = () => {
        const activeTabMap = {
            clientDetails: {
                button: clientDetailsTabBtn,
                content: clientDetailsContentEl
            },
            contact: {
                button: contactTabBtn,
                content: contactContentEl
            },
            nextSession: {
                button: nextSessionTabBtn,
                content: nextSessionContentEl
            }
        };

        Object.entries(activeTabMap).forEach(([tabKey, { button, content }]) => {
            if (!button || !content) return;
            const isActive = activeNotesTab === tabKey;
            button.classList.toggle('active', isActive);
            content.classList.toggle('hidden', !isActive);
            button.style.background = isActive ? 'var(--accent-color, #007aff)' : 'transparent';
            button.style.color = isActive ? '#ffffff' : 'var(--text-color-secondary)';
        });
    };
    let sessionInstructions = '';
    let preferredPronouns = '';
    let customPronounSubject = '';
    let customPronounObject = '';
    let customPronounPossessive = '';
    let sessionMembersDraft = [];
    let generatedGoalsDraft = [];
    let generatedPresentingProblemDraft = '';
    let activeGoalGeneratorClientId = null;
    let goalGenerationRequestId = 0;
    let goalGeneratorModalities = [];
    let goalGeneratorModalityOther = '';
    let autoBackupPath = '';
    let backupWriteInProgress = false;
    let activeWorkspaceMode = 'emr';

    const embeddedWorkspaceModes = {
        dsm: { iframe: dsmIframeEl, button: appModeDsmBtn },
        assessments: { iframe: assessmentsIframeEl, button: appModeAssessmentsBtn },
        safetyPlan: { iframe: safetyPlanIframeEl, button: appModeSafetyPlanBtn }
    };

    const syncEmbeddedTheme = (effectiveTheme = document.body.dataset.theme) => {
        const theme = effectiveTheme === 'dark' ? 'dark' : 'light';
        const currentOrigin = window.location.origin;
        const targetOrigin = currentOrigin && currentOrigin !== 'null' ? currentOrigin : '*';
        const message = { type: 'smartemr-theme', theme };

        Object.values(embeddedWorkspaceModes).forEach(({ iframe }) => {
            if (!iframe?.contentWindow) return;
            try {
                iframe.contentWindow.postMessage(message, targetOrigin);
            } catch (error) {
                iframe.contentWindow.postMessage(message, '*');
            }
        });
    };

    Object.values(embeddedWorkspaceModes).forEach(({ iframe }) => {
        iframe?.addEventListener('load', () => syncEmbeddedTheme());
    });

    const ensureWorkspaceIframeLoaded = (mode) => {
        const iframe = embeddedWorkspaceModes[mode]?.iframe;
        if (!iframe || iframe.getAttribute('src')) return;
        iframe.setAttribute('src', iframe.dataset.src);
    };

    const setWorkspaceMode = (mode) => {
        activeWorkspaceMode = mode === 'emr' || embeddedWorkspaceModes[mode] ? mode : 'emr';
        const activeEmbeddedWorkspace = embeddedWorkspaceModes[activeWorkspaceMode];
        const isEmbeddedMode = Boolean(activeEmbeddedWorkspace);

        if (isEmbeddedMode) {
            ensureWorkspaceIframeLoaded(activeWorkspaceMode);
        }

        mainGridEl?.classList.toggle('hidden', isEmbeddedMode);
        workspaceViewEl?.classList.toggle('hidden', !isEmbeddedMode);
        headerColumnControls?.classList.toggle('hidden', isEmbeddedMode);
        autoSaveIndicator?.classList.toggle('hidden', isEmbeddedMode);
        headerMenuDropdown?.classList.add('hidden');

        appModeEmrBtn?.classList.toggle('is-active', !isEmbeddedMode);
        appModeEmrBtn?.setAttribute('aria-pressed', String(!isEmbeddedMode));
        Object.entries(embeddedWorkspaceModes).forEach(([workspaceMode, { iframe, button }]) => {
            const isActive = workspaceMode === activeWorkspaceMode;
            iframe?.classList.toggle('is-active', isActive);
            button?.classList.toggle('is-active', isActive);
            button?.setAttribute('aria-pressed', String(isActive));
        });
    };
    appModeEmrBtn?.addEventListener('click', () => setWorkspaceMode('emr'));
    appModeDsmBtn?.addEventListener('click', () => setWorkspaceMode('dsm'));
    appModeAssessmentsBtn?.addEventListener('click', () => setWorkspaceMode('assessments'));
    appModeSafetyPlanBtn?.addEventListener('click', () => setWorkspaceMode('safetyPlan'));
    setWorkspaceMode('emr');
    let backupWritePending = false;
    const INFORMED_CONSENT_CONVERSATION_NOTATION = 'Reviewed limits of confidentiality, including that information shared in session is confidential with exceptions for risk of serious harm to self or others, suspected abuse or neglect of a child, elderly person, or vulnerable adult, and legal requirements such as court orders or subpoenas. Reviewed fees and billing, including that sessions are billed at the agreed-upon rate, insurance is billed when applicable, and the client is responsible for copays, deductibles, and any denied claims. Reviewed session duration, including that sessions scheduled in a one-hour appointment block provide 53 minutes of direct session time, with the remaining time reserved for documentation and care coordination. Reviewed cancellation and attendance policy, including that appointments cancelled with less than 24 hours\u2019 notice or missed sessions are charged the full session fee, and that the therapist waits up to 10 minutes before a session is considered a no-show. Reviewed communication guidelines, including that email is used for scheduling and administrative purposes only and is not appropriate for emergencies. Reviewed crisis procedures, including instruction to contact 988 or call 911 in case of emergency.';
    const PRONOUN_PRESETS = {
        'he/him/his': { subject: 'he', object: 'him', possessive: 'his' },
        'she/hers': { subject: 'she', object: 'her', possessive: 'hers' },
        'they/them': { subject: 'they', object: 'them', possessive: 'their' }
    };
    const PRONOUN_SELECT_OPTIONS = [
        { value: '', label: 'Select pronouns (required)' },
        { value: 'he/him/his', label: 'he/him/his' },
        { value: 'she/hers', label: 'she/her/hers' },
        { value: 'they/them', label: 'they/them/their' },
        { value: 'custom', label: 'Custom' }
    ];
    const getPronounSelectOptionsMarkup = (selectedValue = '') => PRONOUN_SELECT_OPTIONS
        .map(option => `<option value="${option.value}" ${option.value === selectedValue ? 'selected' : ''}>${option.label}</option>`)
        .join('');
    const getGoogleAccessToken = async (serviceAccountJson) => {
        try {
            const { invoke } = window.__TAURI__.core;
            const token = await invoke('generate_google_token', { serviceAccountJson });
            if (!token) {
                throw new Error("Rust backend returned an empty token.");
            }
            return token;
        } catch (error) {
            console.error('Error invoking Rust backend for Google Access Token:', error);
            const errorMessage = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
            throw new Error(`Failed to generate token via Rust backend: ${errorMessage}`);
        }
    };
    const DEFAULT_INTERVENTION_BANK = [
        'Acceptance', 'Career Counseling', 'CBT: Behavioral Activation', 'CBT: Cognitive Challenging', 'CBT: Cognitive Reframing',
        'CBT: Cognitive Restructuring', 'CBT: Identifying/Challenging Cognitive Distortions', 'CBT: Mindfulness Training',
        'Collaborative Problem-Solving', 'Collaborative Treatment Planning', 'Communication Skills Training',
        'Conflict Resolution Skill Development', 'Decisional Balance', 'Diagnostic Assessment', 'DPerspective Taking',
        'EFCT – Choreographing Enactments', 'EFCT – De-Escalation', 'EFCT – Empathetic Conjecture', 'EFCT – Evocative Responding',
        'EFCT – Facilitation of Emotional Engagement', 'EFCT – Heightening', 'EFCT – Reflection', 'EFCT – Restructuring Interactions',
        'Emotional Processing', 'Exploration of Coping Patterns', 'Exploration of Core Beliefs', 'Exploration of Family Dynamics',
        'Exploration of Relationship Patterns', 'Family Consultation', 'Grief Counseling', 'Inner Child Work',
        'MI: Decisional Balance (pros/cons)', 'MI: Developing Discrepancy', 'MI: Developing Motivation', 'MI: Eliciting Change Talk',
        'MI: Evoking Commitment Language', 'NT: Deconstruction', 'NT: Externalization', 'NT: Identifying Meaning-Making Patterns',
        'NT: Re-Authoring', 'NT: Re-Framing', 'NT: Re-membering', 'NT: Scaffolding Questions', 'NT: Use of Metaphor/Imagery',
        'NT: Values Exploration', 'PD: Confrontation', 'PD: Exploration of Attachment Patterns', 'PD: Exploration of Themes and Patterns',
        'PD: Exploration of Transference', 'PD: Explore Defense Mechanisms', 'PD: Insight & Emotional Integration', 'PD: Interpretation', 'PD: Reflection'
    ];
    const getInitialData = () => ({
        clients: [],
        archivedClients: [],
        todaySessionClientIds: [],
        interventionBank: [...DEFAULT_INTERVENTION_BANK],
        soapPlatforms: getDefaultSoapPlatforms(),
        aiInstructions: {
            soapPromptSections: getDefaultSoapInstructionSections(),
            treatmentGoalsPromptSections: getDefaultTreatmentGoalInstructionSections(),
            soapSystemPrompt: DEFAULT_SOAP_SYSTEM_PROMPT,
            treatmentGoalsSystemPrompt: DEFAULT_GOAL_GENERATION_SYSTEM_PROMPT
        }
    });
    const intakePromptFields = [
        { key: 'presentingProblem', label: 'Presenting Problem' },
        { key: 'riskAssessment', label: 'Risk Assessment' },
        { key: 'objectiveContent', label: 'Objective Content' },
        { key: 'identification', label: 'Identification' },
        { key: 'historyPresentingProblem', label: 'History of Presenting Problem' },
        { key: 'psychiatricHistory', label: 'Psychiatric History' },
        { key: 'traumaHistory', label: 'Trauma History' },
        { key: 'familyPsychHistory', label: 'Family Psychiatric History' },
        { key: 'medicalConditionsHistory', label: 'Medical Conditions and History' },
        { key: 'currentMedications', label: 'Current Medications' },
        { key: 'substanceUse', label: 'Substance Use' },
        { key: 'sleepHygiene', label: 'Sleep Hygiene' },
        { key: 'familyHistory', label: 'Family History' },
        { key: 'socialHistory', label: 'Social History' },
        { key: 'spiritualCulturalFactors', label: 'Spiritual/Cultural Factors' },
        { key: 'developmentalHistory', label: 'Developmental History' },
        { key: 'educationalVocationalHistory', label: 'Educational/Vocational History' },
        { key: 'legalHistory', label: 'Legal History' },
        { key: 'snap', label: 'SNAP' },
        { key: 'otherImportantInformation', label: 'Other Important Information' },
        { key: 'plan', label: 'Plan' },
        { key: 'diagnosis', label: 'Diagnosis' }
    ];
    const DEFAULT_GUIDING_MODALITIES = ['Psychodynamic Psychotherapy', 'Narrative Therapy'];
    const GUIDING_MODALITY_OPTIONS = [
        'CBT (Cognitive Behavioral Therapy)',
        'DBT (Dialectical Behavior Therapy)',
        'ACT (Acceptance and Commitment Therapy)',
        'REBT (Rational Emotive Behavior Therapy)',
        'CPT (Cognitive Processing Therapy)',
        'ERP (Exposure and Response Prevention)',
        'Behavioral Activation (BA)',
        'TF-CBT (Trauma-Focused CBT)',
        'Psychodynamic Psychotherapy',
        'Psychoanalysis',
        'IFS (Internal Family Systems)',
        'Object Relations Therapy',
        'Attachment-Based Therapy',
        'EFT (Emotionally Focused Therapy)',
        'Person-Centered Therapy',
        'Gestalt Therapy',
        'Existential Therapy',
        'Narrative Therapy',
        'Solution-Focused Brief Therapy (SFBT)',
        'Logotherapy',
        'Other (Specify)'
    ];
    goalGeneratorModalities = [...DEFAULT_GUIDING_MODALITIES];

    // --- Data Management ---
    const findClient = id => data.clients.find(c => c.id === id) || data.archivedClients.find(c => c.id === id);
    const findAppointment = (client, id) => client?.appointments.find(a => a.id === id);
    const findNote = (client, id) => client?.notes?.find(n => n.id === id);
    const findIntakeSession = (client, id) => client?.intakeSessions?.find(i => i.id === id);
    
    const richNoteSelections = new WeakMap();
    const getLocalDateInputValue = (date = new Date()) => {
        return date.getFullYear() + '-' +
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0');
    };
    const getAppointmentDateInputValue = (dateValue) => {
        if (!dateValue) return '';
        const rawDate = String(dateValue);
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate;
        const date = new Date(dateValue);
        return Number.isNaN(date.getTime()) ? '' : getLocalDateInputValue(date);
    };
    const syncAppointmentDateInput = () => {
        if (recordViewClearedForSelectedClient) {
            appointmentDateInput.value = '';
            return;
        }

        const client = findClient(selectedClientId);
        const appointment = client ? findAppointment(client, selectedAppointmentId) : null;
        const nextValue = appointment
            ? getAppointmentDateInputValue(appointment.date)
            : (appointmentDateManualOverride || getLocalDateInputValue());
        appointmentDateInput.value = nextValue;
        syncSegmentedDateInput('appointmentDateInput', nextValue);
    };
    const scheduleAppointmentDateRefresh = () => {
        if (appointmentDateRefreshTimer) {
            window.clearTimeout(appointmentDateRefreshTimer);
        }

        const now = new Date();
        const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
        appointmentDateRefreshTimer = window.setTimeout(() => {
            syncAppointmentDateInput();
            scheduleAppointmentDateRefresh();
        }, Math.max(1000, nextDay.getTime() - now.getTime()));
    };
    const getSelectedAppointmentContext = () => {
        const client = findClient(selectedClientId);
        const appointment = findAppointment(client, selectedAppointmentId);
        if (!client || !appointment) return null;
        return { clientId: client.id, appointmentId: appointment.id, appointment };
    };
    const getAppointmentFromContext = (appointmentContext) => {
        if (!appointmentContext) return null;
        if (appointmentContext.appointment) return appointmentContext.appointment;
        const client = findClient(appointmentContext.clientId);
        return findAppointment(client, appointmentContext.appointmentId) || null;
    };
    const isCurrentAppointmentContext = (appointmentContext) => {
        if (!appointmentContext) return false;
        return selectedClientId === appointmentContext.clientId
            && selectedAppointmentId === appointmentContext.appointmentId
            && !selectedNoteId
            && !selectedIntakeId;
    };

    const normalizeClientData = () => {
        let dataMigrated = false;
        if (!Array.isArray(data.clients)) data.clients = [];
        if (!Array.isArray(data.archivedClients)) data.archivedClients = [];
        if (!Array.isArray(data.todaySessionClientIds)) data.todaySessionClientIds = [];
        if (normalizeSoapPlatforms()) dataMigrated = true;

        const activeClientIds = new Set((data.clients || []).map(client => client.id));
        const seenTodaySessionIds = new Set();
        data.todaySessionClientIds = data.todaySessionClientIds.filter(id => {
            if (!activeClientIds.has(id) || seenTodaySessionIds.has(id)) return false;
            seenTodaySessionIds.add(id);
            return true;
        });

        const allClients = [...(data.clients || []), ...(data.archivedClients || [])];
        allClients.forEach(client => {
            if (!Array.isArray(client.appointments)) client.appointments = [];
            if (!Array.isArray(client.notes)) client.notes = [];
            if (!Array.isArray(client.intakeSessions)) client.intakeSessions = [];
            if (!Array.isArray(client.goals)) client.goals = [];
            const contactInfoBeforeNormalization = JSON.stringify(client.contactInfo);
            ensureClientContactInfo(client);
            if (contactInfoBeforeNormalization !== JSON.stringify(client.contactInfo)) dataMigrated = true;
            const previousSessionType = client.sessionType;
            const normalizedSessionType = normalizeClientSessionType(client.sessionType ?? client.clientType);
            client.sessionType = normalizedSessionType;
            if (previousSessionType !== client.sessionType) dataMigrated = true;
            if (typeof client.sessionTypeAssigned !== 'boolean') {
                // Existing couple assignments are unambiguous. Existing individual values
                // may be the historical default, so require confirmation in Instructions.
                client.sessionTypeAssigned = normalizedSessionType === 'couple' || normalizedSessionType === 'family';
                dataMigrated = true;
            }
            if (typeof client.diagnosis !== 'string') client.diagnosis = '';
            if (normalizeClientDiagnoses(client)) dataMigrated = true;
            if (typeof client.presentingProblem !== 'string') client.presentingProblem = '';
            if (typeof client.persistentInstructions !== 'string') client.persistentInstructions = '';
            if (typeof client.nextSessionNotes !== 'string') client.nextSessionNotes = '';
            if (typeof client.soapPlatformId !== 'string') {
                client.soapPlatformId = '';
                dataMigrated = true;
            }
            if (!client.preferredPronouns || typeof client.preferredPronouns !== 'object') {
                client.preferredPronouns = {
                    value: '',
                    subject: '',
                    object: '',
                    possessive: ''
                };
            }
            if (typeof client.preferredPronouns.value !== 'string') client.preferredPronouns.value = '';
            if (typeof client.preferredPronouns.subject !== 'string') client.preferredPronouns.subject = '';
            if (typeof client.preferredPronouns.object !== 'string') client.preferredPronouns.object = '';
            if (typeof client.preferredPronouns.possessive !== 'string') client.preferredPronouns.possessive = '';
            const previousSessionMembers = JSON.stringify(client.sessionMembers);
            client.sessionMembers = normalizeSessionMembers(client.sessionMembers);
            if (previousSessionMembers !== JSON.stringify(client.sessionMembers)) dataMigrated = true;
            client.goals.forEach(goal => {
                if (!goal.timelineMonths) goal.timelineMonths = 12;
                if (!Array.isArray(goal.objectives)) goal.objectives = [];
                goal.objectives.forEach(obj => {
                    if (!obj.timelineMonths) obj.timelineMonths = 3;
                    if (!obj.format) obj.format = 'action';
                });
            });
            client.appointments.forEach(appt => {
                if (!Array.isArray(appt.selectedInterventions)) appt.selectedInterventions = [];
                if (typeof appt.sessionInstructions !== 'string') {
                    appt.sessionInstructions = typeof appt.customInstructions === 'string' ? appt.customInstructions : '';
                }
                if (appt.customInstructions !== undefined) {
                    delete appt.customInstructions;
                }
                ensureSoapObjectiveActionState(appt);
            });

            if (!client.goalGenerationLens || typeof client.goalGenerationLens !== 'object') {
                client.goalGenerationLens = {
                    modalities: [...DEFAULT_GUIDING_MODALITIES],
                    other: ''
                };
            }
            if (!Array.isArray(client.goalGenerationLens.modalities) || client.goalGenerationLens.modalities.length === 0) {
                client.goalGenerationLens.modalities = [...DEFAULT_GUIDING_MODALITIES];
            }
            if (typeof client.goalGenerationLens.other !== 'string') {
                client.goalGenerationLens.other = '';
            }
        });

        if (!Array.isArray(data.interventionBank) || data.interventionBank.length === 0) {
            data.interventionBank = [...DEFAULT_INTERVENTION_BANK];
        }

        if (!data.aiInstructions || typeof data.aiInstructions !== 'object') {
            data.aiInstructions = {};
        }
        if (!data.aiInstructions.soapPromptSections || typeof data.aiInstructions.soapPromptSections !== 'object') {
            data.aiInstructions.soapPromptSections = migrateLegacyInstructionSections(
                data.aiInstructions.soapSystemPrompt,
                DEFAULT_SOAP_SYSTEM_PROMPT,
                SOAP_INSTRUCTION_SECTION_DEFS
            );
        }
        if (!data.aiInstructions.treatmentGoalsPromptSections || typeof data.aiInstructions.treatmentGoalsPromptSections !== 'object') {
            data.aiInstructions.treatmentGoalsPromptSections = migrateLegacyInstructionSections(
                data.aiInstructions.treatmentGoalsSystemPrompt,
                DEFAULT_GOAL_GENERATION_SYSTEM_PROMPT,
                TREATMENT_GOAL_INSTRUCTION_SECTION_DEFS
            );
        }
        data.aiInstructions.soapPromptSections = normalizeInstructionSections(
            data.aiInstructions.soapPromptSections,
            SOAP_INSTRUCTION_SECTION_DEFS
        );
        data.aiInstructions.treatmentGoalsPromptSections = normalizeInstructionSections(
            data.aiInstructions.treatmentGoalsPromptSections,
            TREATMENT_GOAL_INSTRUCTION_SECTION_DEFS
        );
        const soapGuidanceMigrated = migrateSoapGuidanceOnce(data.aiInstructions);
        data.aiInstructions.soapSystemPrompt = buildSoapSystemPrompt(data.aiInstructions.soapPromptSections);
        data.aiInstructions.treatmentGoalsSystemPrompt = buildTreatmentGoalSystemPrompt(data.aiInstructions.treatmentGoalsPromptSections);
        systemPrompt = data.aiInstructions.soapSystemPrompt;
        goalGenerationSystemPrompt = data.aiInstructions.treatmentGoalsSystemPrompt;

        if (!deletedItems || typeof deletedItems !== 'object') {
            deletedItems = { clients: [], appointments: [], notes: [], intakes: [] };
        }
        if (!Array.isArray(deletedItems.clients)) deletedItems.clients = [];
        if (!Array.isArray(deletedItems.appointments)) deletedItems.appointments = [];
        if (!Array.isArray(deletedItems.notes)) deletedItems.notes = [];
        if (!Array.isArray(deletedItems.intakes)) deletedItems.intakes = [];
        return dataMigrated || soapGuidanceMigrated;
    };

    const isClientInTodaySessions = (clientId) => (data.todaySessionClientIds || []).includes(clientId);

    const removeClientFromTodaySessions = (clientId) => {
        if (!Array.isArray(data.todaySessionClientIds)) return;
        data.todaySessionClientIds = data.todaySessionClientIds.filter(id => id !== clientId);
    };

    const getTodaySessionClients = () => {
        const clientById = new Map((data.clients || []).map(client => [client.id, client]));
        return (data.todaySessionClientIds || []).map(id => clientById.get(id)).filter(Boolean);
    };

    const getMainBankClients = () => {
        const todaySessionIds = new Set(data.todaySessionClientIds || []);
        return (data.clients || []).filter(client => !todaySessionIds.has(client.id));
    };

    const moveClientToTodaySessionsEnd = (clientId) => {
        if (!clientId) return;
        removeClientFromTodaySessions(clientId);
        if (!Array.isArray(data.todaySessionClientIds)) {
            data.todaySessionClientIds = [];
        }
        data.todaySessionClientIds.push(clientId);
    };

    const reorderVisibleClientSlots = (orderedVisibleIds) => {
        const visibleIdSet = new Set(orderedVisibleIds);
        const clientById = new Map((data.clients || []).filter(client => visibleIdSet.has(client.id)).map(client => [client.id, client]));
        let visibleIndex = 0;
        data.clients = (data.clients || []).map(client => (
            visibleIdSet.has(client.id) ? clientById.get(orderedVisibleIds[visibleIndex++]) : client
        ));
    };

    const moveIdWithinArray = (ids, sourceId, targetId = null, insertAfter = false) => {
        const orderedIds = [];
        const seenIds = new Set();
        ids.forEach(id => {
            if (id === sourceId || seenIds.has(id)) return;
            seenIds.add(id);
            orderedIds.push(id);
        });

        if (!targetId || !orderedIds.includes(targetId)) {
            orderedIds.push(sourceId);
            return orderedIds;
        }

        const targetIndex = orderedIds.indexOf(targetId);
        const insertionIndex = insertAfter ? targetIndex + 1 : targetIndex;
        orderedIds.splice(insertionIndex, 0, sourceId);
        return orderedIds;
    };

    const saveAuditProofingField = (fieldKey, value) => {
        const client = findClient(selectedClientId);
        const appointment = findAppointment(client, selectedAppointmentId);
        if (!appointment) return;

        const current = getAuditProofingData(appointment);
        current[fieldKey] = value;
        appointment.auditProofing = current;
        delete appointment.auditCheck;
        markDirty();
        updateGenerateNoteButtonState();
    };

    const renderIntakeFields = (intakeSession) => {
        if (!intakeFieldsContainerEl) return;

        intakeFieldsContainerEl.innerHTML = '';
        if (!intakeSession) return;

        if (!intakeSession.fields || typeof intakeSession.fields !== 'object') {
            intakeSession.fields = {};
        }

        intakePromptFields.forEach(field => {
            const wrapper = document.createElement('div');
            wrapper.className = 'audit-proofing-field';

            const label = document.createElement('label');
            label.setAttribute('for', `intake-${field.key}`);
            label.textContent = field.label;

            const textarea = document.createElement('textarea');
            textarea.id = `intake-${field.key}`;
            textarea.className = 'intake-field-input';
            textarea.dataset.intakeKey = field.key;
            textarea.value = intakeSession.fields[field.key] || '';
            textarea.placeholder = `Enter ${field.label.toLowerCase()}...`;

            wrapper.appendChild(label);
            wrapper.appendChild(textarea);
            intakeFieldsContainerEl.appendChild(wrapper);
        });
    };

    const formatIntakeSessionForCopy = (intakeSession) => {
        if (!intakeSession?.fields || typeof intakeSession.fields !== 'object') return '';

        return intakePromptFields
            .map(field => ({
                label: field.label,
                value: String(intakeSession.fields[field.key] ?? '').trim()
            }))
            .filter(field => field.value)
            .map(field => `**${field.label}**\n${field.value}`)
            .join('\n\n');
    };

    const renderAuditResults = (auditResult) => {
        if (!auditResult) {
            return `
                <div class="audit-box">
                    <div style="font-size: 0.85rem; color: var(--text-color-secondary);">Run the audit check to evaluate this SOAP note against the audit guide criteria.</div>
                </div>
            `;
        }

        const resolvedAudit = getResolvedSoapAuditResult(auditResult);

        return `
            <div class="audit-box">
                <div class="audit-summary">
                    <span><strong>Audit Score:</strong> ${resolvedAudit.score}%</span>
                    <span class="audit-badge ${resolvedAudit.likelyPass ? 'pass' : 'fail'}">${resolvedAudit.likelyPass ? 'Likely Pass' : 'Needs Revision'}</span>
                </div>
                <div style="font-size: 0.84rem; margin-bottom: 6px; color: var(--text-color-secondary);">${resolvedAudit.summary}</div>
                <ul class="audit-items">
                    ${resolvedAudit.checks.map(check => `<li class="${check.pass ? 'audit-item-pass' : 'audit-item-fail'}"><div style="display: flex; align-items: center; gap: 8px;"><label style="display: flex; align-items: center; gap: 6px; font-size: 0.78rem; white-space: nowrap;"><input type="checkbox" class="audit-manual-check" data-check-label="${check.label.replace(/\"/g, '&quot;')}" ${check.manualOverride ? 'checked' : ''}></label><span>${check.pass ? '✓' : '✗'} ${check.label}</span></div></li>`).join('')}
                </ul>
                ${resolvedAudit.opportunities && resolvedAudit.opportunities.length > 0 ? `
                    <div class="audit-remediation">
                        <strong>Ways to strengthen this note:</strong>
                        <ul>
                            ${resolvedAudit.opportunities.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    };

    const getTreatmentGoalsContext = (client) => {
        if (!client) return '';
        const contextSections = [];
        const diagnosis = (client.diagnosis || '').trim();
        if (diagnosis) {
            contextSections.push(`- **Clinician-Entered Diagnosis (Treatment Anchor; not evidence of today's symptoms):**\n${diagnosis}`);
        }

        const presentingProblem = (client.presentingProblem || '').trim();
        if (presentingProblem) {
            contextSections.push(`- **Presenting Problem (Treatment Context; not proof of today's status):**\n${presentingProblem}`);
        }

        const activeGoals = Array.isArray(client.goals)
            ? client.goals.filter(goal => goal.status === 'active')
            : [];
        if (activeGoals.length > 0) {
            contextSections.push(`- **Active Treatment Plan:**\n${activeGoals.map(goal => {
                const objectives = goal.objectives && goal.objectives.length > 0
                    ? goal.objectives.map(obj => `    - Objective: ${obj.text} (${obj.completed ? 'Completed; historical context' : 'In Progress'}, ${obj.timelineMonths || 3} months)`).join('\n')
                    : '    - No specific objectives defined';
                return `  - Treatment goal: ${goal.title} (${goal.timelineMonths || 12} months)\n${objectives}`;
            }).join('\n')}`);
        }

        return contextSections.length > 0 ? `\n${contextSections.join('\n')}\n` : '';
    };

    const getCandidateObjectivesContext = (client) => {
        if (!client?.goals?.length) return '';
        const objectives = client.goals
            .filter(goal => goal.status === 'active')
            .flatMap(goal => (goal.objectives || [])
                .filter(obj => !obj.completed)
                .map(obj => ({
                    goal: goal.title,
                    text: obj.text,
                    timelineMonths: obj.timelineMonths || 3
                })));
        if (!objectives.length) return '';
        return `\n- **Candidate Objectives (not automatically addressed; choose only when current-session evidence supports them):**\n${objectives.map(obj => `  - Objective: ${obj.text} (Treatment goal: ${obj.goal}; ${obj.timelineMonths} months)`).join('\n')}`;
    };

    const DEFAULT_INTERVENTION_MODALITY = 'General';
    const isDefaultCouplesOnlyIntervention = (name) => /^EFCT\s*[-\u2013]/i.test(String(name || '').trim());
    const interventionBankCollator = new Intl.Collator(undefined, {
        sensitivity: 'base',
        numeric: true
    });

    const normalizeInterventionModality = (value) => {
        const text = String(value || '').trim();
        return text || DEFAULT_INTERVENTION_MODALITY;
    };

    const compareInterventionBankEntries = (left, right) => {
        const modalityCompare = interventionBankCollator.compare(left.modality, right.modality);
        if (modalityCompare !== 0) return modalityCompare;
        if (left.isHeader !== right.isHeader) return left.isHeader ? -1 : 1;
        return interventionBankCollator.compare(left.name, right.name);
    };

    const createInterventionBankEntry = (entry, index = 0) => {
        if (typeof entry === 'string') {
            return {
                id: crypto.randomUUID(),
                name: entry.trim(),
                modality: DEFAULT_INTERVENTION_MODALITY,
                isHeader: false,
                couplesOnly: isDefaultCouplesOnlyIntervention(entry),
                order: index
            };
        }

        const name = String(entry?.name || entry?.text || '').trim();
        const modality = normalizeInterventionModality(entry?.modality || entry?.category);

        return {
            id: entry?.id || crypto.randomUUID(),
            name,
            modality,
            isHeader: !!entry?.isHeader || (!name && !!modality),
            couplesOnly: entry?.couplesOnly === true
                || entry?.coupleOnly === true
                || entry?.couples_only === true
                || isDefaultCouplesOnlyIntervention(name),
            order: Number.isFinite(entry?.order) ? entry.order : index
        };
    };

    const normalizeInterventionBank = () => {
        if (!Array.isArray(data.interventionBank)) {
            data.interventionBank = [];
            return;
        }

        const seenHeaderModalities = new Set();
        data.interventionBank = data.interventionBank
            .map((entry, index) => createInterventionBankEntry(entry, index))
            .filter(entry => entry.isHeader || entry.name)
            .sort(compareInterventionBankEntries)
            .filter(entry => {
                if (!entry.isHeader) return true;
                if (seenHeaderModalities.has(entry.modality)) return false;
                seenHeaderModalities.add(entry.modality);
                return true;
            })
            .map((entry, index) => ({ ...entry, order: index }));
    };

    const getInterventionBankEntries = () => {
        normalizeInterventionBank();
        return data.interventionBank;
    };

    const getInterventionBankModalities = () => {
        return [...new Set(getInterventionBankEntries().map(entry => normalizeInterventionModality(entry.modality)))];
    };

    const ensureInterventionBankHeader = (entries, modality) => {
        const normalizedModality = normalizeInterventionModality(modality);
        if (entries.some(entry => entry.isHeader && entry.modality === normalizedModality)) return;
        entries.push({
            id: crypto.randomUUID(),
            name: '',
            modality: normalizedModality,
            isHeader: true,
            order: entries.length
        });
    };

    const commitInterventionBankEntries = (entries) => {
        data.interventionBank = entries.map((entry, index) => ({ ...entry, order: index }));
        normalizeInterventionBank();
        markDirty();
        renderInterventionBank();
        renderInterventionPicker();
        renderSoap();
    };

    const getInterventionBankEntryByName = (name) => {
        const normalizedName = String(name || '').trim();
        return getInterventionBankEntries().find(entry => entry.name === normalizedName) || null;
    };

    const isInterventionAllowedForClient = (entryOrName, client) => {
        const entry = typeof entryOrName === 'string'
            ? getInterventionBankEntryByName(entryOrName)
            : entryOrName;
        return !entry || !entry.couplesOnly || isCoupleClient(client);
    };

    const getInterventionBankEntriesForClient = (client) => getInterventionBankEntries()
        .filter(entry => entry.isHeader || isInterventionAllowedForClient(entry, client));

    const getInterventionBankNames = (client = null) => getInterventionBankEntriesForClient(client)
        .filter(entry => !entry.isHeader)
        .map(entry => entry.name);

    const groupInterventionNamesByModality = (names) => {
        const groups = new Map();

        (names || []).filter(Boolean).forEach(name => {
            const entry = getInterventionBankEntryByName(name);
            const modality = normalizeInterventionModality(entry?.modality);
            if (!groups.has(modality)) groups.set(modality, []);
            groups.get(modality).push(String(name).trim());
        });

        return [...groups.entries()].map(([modality, items]) => ({
            modality,
            items: [...items].sort((left, right) => interventionBankCollator.compare(left, right))
        }));
    };

    const formatInterventionsByModality = (names) => {
        const groups = groupInterventionNamesByModality(names);
        if (groups.length === 0) return 'No interventions identified directly in Objective section.';

        return groups.map(group => {
            const interventionLines = group.items.map(item => `• ${item}`).join('\n');
            return `${group.modality}:\n${interventionLines}`;
        }).join('\n\n');
    };

    const getObjectiveDerivedInterventions = (appointment, client = null) => {
        const matches = Array.isArray(appointment?.soap?.objectiveInterventionMatches)
            ? appointment.soap.objectiveInterventionMatches.filter(Boolean)
            : [];
        return matches.filter(item => isInterventionAllowedForClient(item, client || findClient(selectedClientId)));
    };

    const getInterventionBankContext = (client = null) => {
        const bank = getInterventionBankNames(client);
        return bank.length > 0
            ? `\n- **Intervention Bank (Allowed Interventions Only):**\n${bank.map(item => `  - ${item}`).join('\n')}`
            : '';
    };

    const getSelectedInterventionContext = (appointment, client = null) => {
        const selected = getObjectiveDerivedInterventions(appointment, client);
        return selected.length > 0
            ? `\n- **Previously Selected Interventions (From Bank):**\n${selected.map(item => `  - ${item}`).join('\n')}`
            : '';
    };

    const getInterventionContext = (appointment, client = null) =>
        `${getInterventionBankContext(client)}${getSelectedInterventionContext(appointment, client)}`;

    const mergeInterventions = (existing, incoming) => {
        const set = new Set([...(existing || []), ...(incoming || [])].filter(Boolean));
        const bank = Array.isArray(data.interventionBank) ? data.interventionBank : [];
        const orderedBankMatches = bank.filter(item => set.has(item));
        const extras = [...set].filter(item => !bank.includes(item));
        return [...orderedBankMatches, ...extras];
    };

    const extractInterventionsFromObjective = (objectiveText, client = null) =>
        extractSupportedInterventionsFromObjective(objectiveText, getInterventionBankNames(client));

    const refreshObjectiveSuggestionInterventionMatches = (appointment, client = null) => {
        if (!appointment?.soap) return;
        const objectiveSuggestions = Array.isArray(appointment.soap.o_suggestion)
            ? appointment.soap.o_suggestion
            : [];
        appointment.soap.o_suggestion_intervention_matches = objectiveSuggestions.map(suggestion => {
            if (typeof suggestion === 'object' && suggestion && suggestion.suggested) {
                return extractInterventionsFromObjective(suggestion.suggested, client);
            }
            if (typeof suggestion === 'string') {
                return extractInterventionsFromObjective(suggestion, client);
            }
            return [];
        });
    };

    const getResolvedSoapInterventions = (appointment, client = null) => {
        const manualSelections = Array.isArray(appointment?.selectedInterventions)
            ? appointment.selectedInterventions.filter(Boolean)
            : [];
        const objectiveMatches = Array.isArray(appointment?.soap?.objectiveInterventionMatches)
            ? appointment.soap.objectiveInterventionMatches.filter(Boolean)
            : [];
        return mergeInterventions(manualSelections, objectiveMatches)
            .filter(item => isInterventionAllowedForClient(item, client || findClient(selectedClientId)));
    };

    const updateSoapInterventionsValue = (appointment, nextValue) => {
        if (!appointment) return false;
        if (!appointment.soap) appointment.soap = { s: '', o: '', a: '', p: '' };
        const next = String(nextValue ?? '');
        const current = String(appointment.soap.interventions ?? '');
        if (current === next) return false;
        appointment.soap.interventions = next;
        const actionState = ensureSoapObjectiveActionState(appointment);
        actionState.interventionsRevision += 1;
        return true;
    };

    const markObjectiveOrganizeCompleted = (appointment) => {
        const actionState = ensureSoapObjectiveActionState(appointment);
        actionState.organizedRevision = actionState.objectiveRevision;
    };

    const markObjectiveReadCompleted = (appointment) => {
        const actionState = ensureSoapObjectiveActionState(appointment);
        actionState.readObjectiveRevision = actionState.objectiveRevision;
        actionState.readInterventionsRevision = actionState.interventionsRevision;
    };

    const isObjectiveOrganizeCompleted = (appointment) => {
        const actionState = ensureSoapObjectiveActionState(appointment);
        return Number.isInteger(actionState.organizedRevision) && actionState.organizedRevision === actionState.objectiveRevision;
    };

    const isObjectiveReadCompleted = (appointment) => {
        const actionState = ensureSoapObjectiveActionState(appointment);
        return Number.isInteger(actionState.readObjectiveRevision)
            && Number.isInteger(actionState.readInterventionsRevision)
            && actionState.readObjectiveRevision === actionState.objectiveRevision
            && actionState.readInterventionsRevision === actionState.interventionsRevision;
    };

    const SOAP_ICON_SVGS = {
        copy: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
        bank: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h2M10 6h10M4 12h2M10 12h10M4 18h2M10 18h10"></path></svg>',
        refresh: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 11a8.1 8.1 0 0 0-14.7-4.8L3 9"></path><path d="M3 4v5h5"></path><path d="M4 13a8.1 8.1 0 0 0 14.7 4.8L21 15"></path><path d="M21 20v-5h-5"></path></svg>',
        check: '<span class="soap-action-complete" aria-hidden="true">✓</span>'
    };
    const CONTACT_ICON_SVGS = {
        copy: SOAP_ICON_SVGS.copy,
        edit: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>',
        check: '<span aria-hidden="true">✓</span>',
        remove: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"></path></svg>'
    };
    const renderSoapCopyButton = (targetId, label) => {
        return `<button type="button" class="copy-btn soap-icon-btn" data-target="${targetId}" title="Copy ${label}" aria-label="Copy ${label}">${SOAP_ICON_SVGS.copy}</button>`;
    };

    const setSoapActionButtonContent = (button, label, isComplete, isLoading = false) => {
        if (!button) return;
        const isRefreshButton = label === 'Refresh';
        const loadingContent = isLoading && !isRefreshButton
            ? `<span class="soap-action-spinner" aria-hidden="true"></span>${label}...`
            : `${label}${isComplete ? SOAP_ICON_SVGS.check : ''}`;
        button.innerHTML = isRefreshButton
            ? `${SOAP_ICON_SVGS.refresh}${isComplete ? SOAP_ICON_SVGS.check : ''}`
            : loadingContent;
        button.classList.toggle('is-loading', isLoading);
        button.title = isLoading
            ? (isRefreshButton ? 'Refreshing interventions...' : `${label}...`)
            : (isRefreshButton ? 'Refresh interventions' : label);
        button.setAttribute('aria-label', button.title);
        button.setAttribute('aria-busy', String(isLoading));
    };

    const SOAP_POST_OBJECTIVE_FIELD_IDS = [
        'interventions',
        'presentingProblem',
        'sessionFocus',
        'diagnosticSupport',
        'medicalNecessity'
    ];

    const setSoapPostObjectiveProcessingState = (isLoading) => {
        SOAP_POST_OBJECTIVE_FIELD_IDS.forEach(fieldId => {
            const textarea = document.getElementById(fieldId);
            const container = textarea?.closest('.soap-section, .soap-support-block');
            const header = container?.querySelector('.soap-header, .soap-support-header');
            const label = header?.querySelector('span');
            if (!textarea || !header || !label) return;

            let status = label.querySelector('.soap-processing-status');
            if (isLoading) {
                if (!status) {
                    status = document.createElement('span');
                    status.className = 'soap-processing-status';
                    status.setAttribute('aria-live', 'polite');
                    status.innerHTML = '<span class="soap-action-spinner" aria-hidden="true"></span>Generating...';
                    label.appendChild(status);
                }
                textarea.classList.add('soap-field-processing');
                textarea.setAttribute('aria-busy', 'true');
            } else {
                status?.remove();
                textarea.classList.remove('soap-field-processing');
                textarea.removeAttribute('aria-busy');
            }
        });
    };

    const refreshObjectiveActionButtons = (appointment) => {
        const objectiveText = (appointment?.soap?.o || '').trim();
        const objectiveOrganized = isObjectiveOrganizeCompleted(appointment);
        const selectedAppointmentContext = getSelectedAppointmentContext();
        const selectedAppointment = getAppointmentFromContext(selectedAppointmentContext);
        const isDisplayedAppointment = Boolean(appointment && selectedAppointment === appointment);
        const isOrganizing = isDisplayedAppointment && isObjectiveOrganizationInFlight(selectedAppointmentContext);
        const isReviewPreparing = isDisplayedAppointment && isObjectiveReviewPreparationInFlight(selectedAppointmentContext);
        const generateInterventionsBtn = isDisplayedAppointment
            ? document.getElementById('generateInterventionsBtn')
            : null;
        if (generateInterventionsBtn) {
            generateInterventionsBtn.disabled = !objectiveText || !objectiveOrganized;
            setSoapActionButtonContent(generateInterventionsBtn, 'Refresh', isObjectiveReadCompleted(appointment));
        }

        const supportButtons = [
            document.getElementById('refreshPresentingProblemBtn'),
            document.getElementById('refreshSessionFocusBtn'),
            document.getElementById('refreshDiagnosticSupportBtn'),
            document.getElementById('refreshMedicalNecessityBtn')
        ].filter(Boolean);
        supportButtons.forEach(button => {
            button.disabled = !objectiveOrganized;
            const label = button.id === 'refreshPresentingProblemBtn'
                ? 'Refresh Presenting Problem'
                : button.id === 'refreshSessionFocusBtn'
                ? 'Refresh Session Focus'
                : button.id === 'refreshDiagnosticSupportBtn'
                ? 'Refresh Diagnostic Support'
                : 'Refresh Medical Necessity';
            button.title = objectiveOrganized ? label : 'Press Approve in Objective first';
            button.setAttribute('aria-label', button.title);
        });
    };

    const syncObjectiveInterventionsFromObjectiveText = (appointment, objectiveText, client = null) => {
        if (!appointment) return [];
        if (!appointment.soap) appointment.soap = { s: '', o: '', a: '', p: '' };

        const objectiveMatches = extractInterventionsFromObjective(objectiveText ?? appointment.soap.o ?? '', client);
        appointment.soap.objectiveInterventionMatches = objectiveMatches;

        updateSoapInterventionsValue(appointment, formatInterventionsByModality(objectiveMatches));

        const interventionsTextarea = document.getElementById('interventions');
        if (interventionsTextarea) {
            interventionsTextarea.value = appointment.soap.interventions;
            interventionsTextarea.style.height = 'auto';
            autoResizeTextarea(interventionsTextarea);
        }

        return objectiveMatches;
    };

    const getClientPreferredPronouns = (client) => {
        return normalizePreferredPronounRecord(client?.preferredPronouns);
    };

    const getPreferredPronounsContext = (client) => {
        const pronouns = getClientPreferredPronouns(client);
        if (!pronouns.value) return '';

        if (pronouns.value === 'custom') {
            if (!pronouns.subject || !pronouns.object || !pronouns.possessive) return '';
            return `\n- **Client Preferred Pronouns:** custom (subject: ${pronouns.subject}, object: ${pronouns.object}, possessive: ${pronouns.possessive})\n- **Pronoun Usage Rule:** Use these pronouns consistently when referring to Ct.`;
        }

        const preset = PRONOUN_PRESETS[pronouns.value];
        if (!preset) return '';
        return `\n- **Client Preferred Pronouns:** ${pronouns.value} (subject: ${preset.subject}, object: ${preset.object}, possessive: ${preset.possessive})\n- **Pronoun Usage Rule:** Use these pronouns consistently when referring to Ct.`;
    };

    const hasAssignedPreferredPronounRecord = (value) => {
        const pronouns = normalizePreferredPronounRecord(value);
        if (!pronouns.value) return false;
        if (pronouns.value === 'custom') {
            return Boolean(pronouns.subject && pronouns.object && pronouns.possessive);
        }
        return Boolean(PRONOUN_PRESETS[pronouns.value]);
    };

    const hasAssignedClientPreferredPronouns = (client) => hasAssignedPreferredPronounRecord(client?.preferredPronouns);

    const getSessionMemberPronounsLabel = (member) => {
        const pronouns = normalizePreferredPronounRecord(member?.preferredPronouns);
        if (!hasAssignedPreferredPronounRecord(pronouns)) return 'not assigned';
        if (pronouns.value === 'custom') {
            return `custom (subject: ${pronouns.subject}, object: ${pronouns.object}, possessive: ${pronouns.possessive})`;
        }
        const preset = PRONOUN_PRESETS[pronouns.value];
        return `${pronouns.value} (subject: ${preset.subject}, object: ${preset.object}, possessive: ${preset.possessive})`;
    };

    const hasAssignedSessionMembers = (client) => {
        const sessionType = getClientSessionType(client);
        if (sessionType !== 'couple' && sessionType !== 'family') return true;
        const members = getClientSessionMembers(client);
        return members.length >= 2 && members.every(member => {
            const hasName = typeof member?.name === 'string' && member.name.trim().length > 0;
            const hasRole = sessionType !== 'family'
                || (typeof member?.role === 'string' && member.role.trim().length > 0);
            return hasName && hasRole && hasAssignedPreferredPronounRecord(member?.preferredPronouns);
        });
    };

    const getSessionMembersContext = (client) => {
        const sessionType = getClientSessionType(client);
        if (sessionType !== 'couple' && sessionType !== 'family') return '';
        const members = getClientSessionMembers(client);
        const heading = sessionType === 'family' ? 'Family Members' : 'Couple/Partnership Members';
        if (members.length === 0) {
            return `\n- **${heading}:** Not assigned.`;
        }
        const memberLines = members.map((member, index) => {
            const name = (member?.name || '').trim() || `Member ${index + 1}`;
            const role = sessionType === 'family' ? `; role: ${(member?.role || '').trim() || 'not assigned'}` : '';
            return `\n- **Session Member ${index + 1}:** ${name}${role}; pronouns: ${getSessionMemberPronounsLabel(member)}`;
        }).join('');
        const collectiveGrammarRule = sessionType === 'couple'
            ? '\n- **Couple Collective Grammar Rule:** When referring to both members together, use "Cts" as the collective subject and "Cts\'" as the collective possessive. Never write "Ct\'s" for a couple. Use "Ct\'s" only for one singular client; use each named member\'s name and assigned pronouns for individual references.'
            : '';
        return `\n- **${heading}:**${memberLines}\n- **Session Member Pronoun Rule:** Use each member's name and assigned pronouns consistently when referring to them.${collectiveGrammarRule}`;
    };

    const normalizeCoupleCollectiveReferences = (value, client) => {
        if (getClientSessionType(client) !== 'couple') return value;
        if (typeof value === 'string') {
            return value.replace(/\bCt(['’])s\b/g, 'Cts$1');
        }
        if (Array.isArray(value)) {
            return value.map(item => normalizeCoupleCollectiveReferences(item, client));
        }
        if (value && typeof value === 'object') {
            return Object.fromEntries(Object.entries(value).map(([key, item]) => [
                key,
                normalizeCoupleCollectiveReferences(item, client)
            ]));
        }
        return value;
    };

    const SOAP_CLIENT_REQUIREMENT_LABELS = {
        soapPlatform: 'a SOAP platform',
        preferredPronouns: 'preferred pronouns',
        sessionType: 'a client session type',
        sessionMembers: 'all session members, their roles for family sessions, and their pronouns'
    };

    const getMissingSoapClientRequirements = (client) => {
        const missing = [];
        if (!getClientSoapPlatform(client)) missing.push('soapPlatform');
        if (!hasAssignedClientSessionType(client)) {
            missing.push('sessionType');
            return missing;
        }
        const sessionType = getClientSessionType(client);
        if (sessionType === 'individual' && !hasAssignedClientPreferredPronouns(client)) {
            missing.push('preferredPronouns');
        }
        if ((sessionType === 'couple' || sessionType === 'family') && !hasAssignedSessionMembers(client)) {
            missing.push('sessionMembers');
        }
        return missing;
    };

    const getSoapGenerationRequirementMessage = (missingRequirements = []) => {
        const labels = missingRequirements
            .map(requirement => SOAP_CLIENT_REQUIREMENT_LABELS[requirement])
            .filter(Boolean);
        const list = labels.length <= 1
            ? labels[0] || 'the required client information'
            : labels.length === 2
                ? `${labels[0]} and ${labels[1]}`
                : `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
        return `Before generating a SOAP note, assign this client ${list} in Instructions.`;
    };

    const appendAuditFieldToSection = (currentSectionText, label, value) => {
        const trimmedValue = (value || '').trim();
        if (!trimmedValue) return currentSectionText || '';
        const existing = currentSectionText || '';
        const normalizedExisting = existing.toLowerCase();
        // Check for duplicates by value only (no label prefix in output)
        if (normalizedExisting.includes(trimmedValue.toLowerCase())) {
            return existing;
        }
        const prefix = existing.trim().length > 0 ? '\n' : '';
        return `${existing}${prefix}• ${trimmedValue}`;
    };

    const normalizeSuggestionComparableText = (text) => String(text || '')
        .replace(/^•\s*/, '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();

    const getSuggestionComparisonTexts = (suggestions = []) => suggestions.flatMap(suggestion => {
        if (typeof suggestion === 'object' && suggestion) {
            return [suggestion.original, suggestion.suggested]
                .map(normalizeSuggestionComparableText)
                .filter(Boolean);
        }
        return [normalizeSuggestionComparableText(suggestion)].filter(Boolean);
    });

    const hasPendingSuggestionForText = (suggestions = [], text = '') => {
        const normalizedTarget = normalizeSuggestionComparableText(text);
        if (!normalizedTarget) return false;
        return getSuggestionComparisonTexts(suggestions).some(candidate => (
            candidate === normalizedTarget
            || candidate.includes(normalizedTarget)
            || normalizedTarget.includes(candidate)
        ));
    };

    const getInstructionsContext = (client, appointment) => {
        const persistent = (client?.persistentInstructions || '').trim();
        const session = (appointment?.sessionInstructions || '').trim();
        const sessionType = getClientSessionType(client);
        const sessionTypeAssigned = hasAssignedClientSessionType(client);
        const pronounsContext = sessionType === 'individual' ? getPreferredPronounsContext(client) : '';
        const sessionMembersContext = getSessionMembersContext(client);
        const soapPlatform = getClientSoapPlatform(client);

        const sessionTypeLabel = sessionType === 'couple'
            ? 'Couple / Partnership'
            : sessionType === 'family'
                ? 'Family'
                : 'Individual';
        let context = `\n- **Client Session Type:** ${sessionTypeAssigned ? sessionTypeLabel : 'Not assigned'}`;
        context += sessionTypeAssigned
            ? sessionType === 'couple'
                ? '\n- **Couple-Only Intervention Rule:** Use interventions marked Couples only when the Client Session Type is Couple.'
                : sessionType === 'family'
                    ? '\n- **Family Session Member Rule:** Use each family member\'s name, role, and assigned pronouns consistently.'
                    : ''
            : '\n- **Client Session Type Rule:** Assign the client session type in Instructions before generating a SOAP note.';
        if (soapPlatform) {
            const enabledSectionKeys = getSoapPlatformSectionKeys(client, false);
            const enabledSections = enabledSectionKeys
                .map(sectionKey => getSoapPlatformSectionDefinition(sectionKey)?.label)
                .filter(Boolean);
            const disabledSections = SOAP_PLATFORM_SECTION_DEFS
                .filter(section => !enabledSectionKeys.includes(section.key))
                .map(section => section.label);
            context += `\n- **SOAP Platform:** ${soapPlatform.name}`;
            context += `\n- **SOAP Sections (in order):** ${enabledSections.join(' -> ') || 'None'}`;
            if (disabledSections.length > 0) {
                context += `\n- **SOAP Sections Disabled for This Platform:** ${disabledSections.join(', ')}`;
            }
            context += '\n- **SOAP Platform Rule:** Generate content for enabled sections only, in the configured order. Do not add disabled sections or extra sections.';
        } else {
            context += '\n- **SOAP Platform:** Not assigned. SOAP generation is blocked until a platform is assigned in Instructions.';
        }
        if (sessionMembersContext) {
            context += sessionMembersContext;
        }
        if (pronounsContext) {
            context += pronounsContext;
        }
        if (persistent) {
            context += `\n- **Persistent Instructions (Client-Level):**\n${persistent}`;
        }
        if (session) {
            context += `\n- **Session Instructions (Appointment-Level):**\n${session}`;
        }
        if (persistent && session) {
            context += `\n- **Instruction Precedence Rule:** If Session Instructions conflict with Persistent Instructions, follow Session Instructions for this note.`;
        }
        return context;
    };

    const getModalitiesContext = (modalitiesInput, otherInput) => {
        const modalities = Array.isArray(modalitiesInput) ? [...new Set(modalitiesInput.filter(Boolean))] : [];
        const other = (otherInput || '').trim();
        const normalized = modalities.filter(m => m && m !== 'Other (Specify)');
        if (modalities.includes('Other (Specify)') && other) {
            normalized.push(`Other: ${other}`);
        }
        if (!normalized.length) return '';
        return normalized;
    };

    const getGoalGenerationModalitiesContext = () => getModalitiesContext(goalGeneratorModalities, goalGeneratorModalityOther);

    const getClientGoalGenerationLens = (client) => {
        if (!client) {
            return {
                modalities: [...DEFAULT_GUIDING_MODALITIES],
                other: ''
            };
        }

        if (!client.goalGenerationLens || typeof client.goalGenerationLens !== 'object') {
            client.goalGenerationLens = {
                modalities: [...DEFAULT_GUIDING_MODALITIES],
                other: ''
            };
        }

        if (!Array.isArray(client.goalGenerationLens.modalities) || client.goalGenerationLens.modalities.length === 0) {
            client.goalGenerationLens.modalities = [...DEFAULT_GUIDING_MODALITIES];
        }
        if (typeof client.goalGenerationLens.other !== 'string') {
            client.goalGenerationLens.other = '';
        }

        return {
            modalities: [...client.goalGenerationLens.modalities],
            other: client.goalGenerationLens.other
        };
    };

    const saveClientGoalGenerationLens = (clientId = selectedClientId) => {
        const client = findClient(clientId);
        if (!client) return;

        client.goalGenerationLens = {
            modalities: [...new Set((goalGeneratorModalities || []).filter(Boolean))],
            other: goalGeneratorModalityOther || ''
        };
        markDirty();
    };

    const getClientSoapModalityContext = (client, appointment) => {
        const lens = getClientGoalGenerationLens(client);
        const modalities = getModalitiesContext(lens.modalities, lens.other);
        if (!modalities || modalities.length === 0) return '';

        const explicitInterventionSignals = [
            (appointment?.sessionInfo || '').trim(),
            ...(getResolvedSoapInterventions(appointment, client).map(item => item && item.trim()).filter(Boolean))
        ].filter(Boolean);

        return `
- **Client Modality Lens (Default):**
${modalities.map(item => `  - ${item}`).join('\n')}
- **Lens Rule:** Use the listed modalities as a default framing only when consistent with the session content.
- **Override Rule (Required):** If Session Information or selected interventions explicitly indicate a different modality/technique, preserve those interventions as written and do NOT force-fit them into the default lens.
${explicitInterventionSignals.length > 0 ? `- **Explicit Intervention Signals from Session Data:**\n${explicitInterventionSignals.map(item => `  - ${item}`).join('\n')}` : ''}`;
    };

    const renderInterventionBank = () => {
        if (!interventionBankList) return;
        const entries = getInterventionBankEntries();
        if (entries.length === 0) {
            interventionBankList.innerHTML = '<div class="no-selection">Add interventions and assign them to a modality.</div>';
            renderInterventionModalityOptions();
            return;
        }
        const groups = entries.reduce((map, entry) => {
            const modality = normalizeInterventionModality(entry.modality);
            if (!map.has(modality)) map.set(modality, { header: null, items: [] });
            if (entry.isHeader) {
                map.get(modality).header = entry;
            } else {
                map.get(modality).items.push(entry);
            }
            return map;
        }, new Map());

        interventionBankList.innerHTML = [...groups.entries()].map(([modality, group]) => `
            <div class="intervention-group">
                <div class="intervention-group-header">
                    <span>${modality}</span>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span class="intervention-group-count">${group.items.length} item${group.items.length === 1 ? '' : 's'}</span>
                        ${group.header && group.items.length === 0 ? `<button class="action-btn delete-btn" data-bank-id="${group.header.id}" title="Delete empty modality bank" style="width:20px;height:20px;">×</button>` : ''}
                    </div>
                </div>
                <div class="intervention-group-body" data-drop-modality="${modality.replace(/"/g, '&quot;')}">
                    ${group.items.length > 0 ? group.items.map(entry => `
                        <div class="intervention-row intervention-bank-row" draggable="true" data-bank-id="${entry.id}" data-bank-modality="${entry.modality.replace(/"/g, '&quot;')}">
                            <div class="intervention-bank-name">
                                <span>${entry.name}</span>
                                ${entry.couplesOnly ? '<span class="couples-only-badge">Couples only</span>' : ''}
                            </div>
                            <div class="intervention-bank-controls">
                                <label class="intervention-scope-toggle" title="Only offer this intervention for Couple sessions">
                                    <input type="checkbox" class="intervention-couples-only-toggle" data-bank-id="${entry.id}" ${entry.couplesOnly ? 'checked' : ''}>
                                    Couples only
                                </label>
                                <button class="action-btn delete-btn" data-bank-id="${entry.id}" title="Remove intervention" style="width:20px;height:20px;">×</button>
                            </div>
                        </div>
                    `).join('') : `<div class="intervention-group-empty">Drag interventions here or add a new one under this modality.</div>`}
                </div>
            </div>
        `).join('');
        renderInterventionModalityOptions();
    };

    const renderInterventionPicker = () => {
        const client = findClient(selectedClientId);
        const appointment = findAppointment(client, selectedAppointmentId);
        if (!appointment || !interventionPickerList) return;
        const selected = new Set(appointment.selectedInterventions || []);
        const entries = getInterventionBankEntriesForClient(client);
        const groups = entries.reduce((map, entry) => {
            if (entry.isHeader) return map;
            const modality = normalizeInterventionModality(entry.modality);
            if (!map.has(modality)) map.set(modality, []);
            map.get(modality).push(entry);
            return map;
        }, new Map());

        if (groups.size === 0) {
            interventionPickerList.innerHTML = '<div class="no-selection">No interventions are available for this client type. Mark interventions as Couples only when appropriate.</div>';
            return;
        }

        interventionPickerList.innerHTML = [...groups.entries()].map(([modality, groupEntries]) => `
            <div class="intervention-group">
                <div class="intervention-group-header">
                    <span>${modality}</span>
                    <span class="intervention-group-count">${groupEntries.length} item${groupEntries.length === 1 ? '' : 's'}</span>
                </div>
                <div class="intervention-group-body">
                    ${groupEntries.map(entry => `
                        <label class="intervention-row" style="cursor:pointer;">
                            <span class="intervention-bank-name"><span>${entry.name}</span>${entry.couplesOnly ? '<span class="couples-only-badge">Couples only</span>' : ''}</span>
                            <input type="checkbox" class="picker-intervention" value="${entry.name.replace(/"/g, '&quot;')}" ${selected.has(entry.name) ? 'checked' : ''}>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');
    };

    let draggedInterventionBankId = null;

    const clearInterventionDropTargets = () => {
        if (!interventionBankList) return;
        interventionBankList.querySelectorAll('.intervention-drop-target').forEach(el => el.classList.remove('intervention-drop-target'));
    };

    const moveInterventionBankEntry = (draggedId, targetId = null, targetModality = '') => {
        const entries = getInterventionBankEntries().map(entry => ({ ...entry }));
        const movedEntry = entries.find(entry => entry.id === draggedId && !entry.isHeader);
        if (!movedEntry) return;

        const resolvedTargetModality = normalizeInterventionModality(
            targetModality || entries.find(entry => entry.id === targetId)?.modality || movedEntry.modality
        );
        if (movedEntry.modality === resolvedTargetModality) return;

        movedEntry.modality = resolvedTargetModality;
        ensureInterventionBankHeader(entries, resolvedTargetModality);
        commitInterventionBankEntries(entries);
    };

    const renderInterventionModalityOptions = () => {
        if (!newInterventionModalitySelect || !newInterventionModalityOtherWrap || !newInterventionModalityOther) return;
        const currentValue = newInterventionModalitySelect.value;
        const modalities = getInterventionBankModalities();
        const modalityOptions = modalities.map(modality => `<option value="${modality.replace(/"/g, '&quot;')}" ${modality === currentValue ? 'selected' : ''}>${modality}</option>`).join('');
        const hasCustomValue = currentValue && currentValue !== '__new__' && !modalities.includes(currentValue);
        newInterventionModalitySelect.innerHTML = `
            <option value="" ${!currentValue ? 'selected' : ''}>Choose modality...</option>
            ${modalityOptions}
            <option value="__new__" ${currentValue === '__new__' || hasCustomValue ? 'selected' : ''}>Other (new modality)</option>
        `;
        const showOther = newInterventionModalitySelect.value === '__new__' || hasCustomValue;
        newInterventionModalityOtherWrap.classList.toggle('hidden', !showOther);
        newInterventionModalityOther.disabled = !showOther;
        if (showOther && hasCustomValue) {
            newInterventionModalityOther.value = currentValue;
        }
    };

    const syncInterventionModalityInputs = () => {
        if (!newInterventionModalitySelect || !newInterventionModalityOtherWrap || !newInterventionModalityOther) return;
        const showOther = newInterventionModalitySelect.value === '__new__';
        newInterventionModalityOtherWrap.classList.toggle('hidden', !showOther);
        newInterventionModalityOther.disabled = !showOther;
        if (!showOther) {
            newInterventionModalityOther.value = '';
        }
    };

    const renderGuidingModalities = () => {
        if (!guidingModalitiesListEl || !guidingModalityOtherEl || !guidingModalityOtherWrapEl) return;

        if (!Array.isArray(goalGeneratorModalities) || goalGeneratorModalities.length === 0) {
            goalGeneratorModalities = [...DEFAULT_GUIDING_MODALITIES];
        }

        guidingModalitiesListEl.innerHTML = goalGeneratorModalities.map((selectedModality, index) => `
            <div class="modality-row" data-modality-index="${index}">
                <select class="setting-input modality-select" data-modality-index="${index}">
                    ${GUIDING_MODALITY_OPTIONS.map(option => `<option value="${option.replace(/"/g, '&quot;')}" ${option === selectedModality ? 'selected' : ''}>${option}</option>`).join('')}
                </select>
                <button type="button" class="modality-row-btn add-modality-btn" title="Add modality">+</button>
                <button type="button" class="modality-row-btn remove-modality-btn" title="Remove modality" ${goalGeneratorModalities.length <= 1 ? 'disabled' : ''}>−</button>
            </div>
        `).join('');

        guidingModalityOtherEl.value = goalGeneratorModalityOther || '';
        const hasOtherSelected = goalGeneratorModalities.includes('Other (Specify)');
        guidingModalityOtherWrapEl.classList.toggle('hidden', !hasOtherSelected);
        guidingModalityOtherEl.disabled = !hasOtherSelected;
    };

    const saveGuidingModalities = () => {
        const selected = Array.from(guidingModalitiesListEl.querySelectorAll('.modality-select')).map(el => el.value);
        goalGeneratorModalities = selected.filter(Boolean);
        if (!goalGeneratorModalities.includes('Other (Specify)')) {
            goalGeneratorModalityOther = '';
            guidingModalityOtherEl.value = '';
            guidingModalityOtherEl.disabled = true;
            guidingModalityOtherWrapEl.classList.add('hidden');
        } else {
            guidingModalityOtherWrapEl.classList.remove('hidden');
            guidingModalityOtherEl.disabled = false;
            goalGeneratorModalityOther = guidingModalityOtherEl.value || '';
        }
        saveClientGoalGenerationLens();
    };

    const renderCustomInstructionsModalities = () => {
        if (!customInstructionsModalitiesListEl || !customInstructionsModalityOtherWrapEl || !customInstructionsModalityOtherEl) return;

        if (!Array.isArray(goalGeneratorModalities) || goalGeneratorModalities.length === 0) {
            goalGeneratorModalities = [...DEFAULT_GUIDING_MODALITIES];
        }

        customInstructionsModalitiesListEl.innerHTML = goalGeneratorModalities.map((selectedModality, index) => `
            <div class="modality-row" data-modal-instructions-index="${index}">
                <select class="setting-input custom-instructions-modality-select" data-modal-instructions-index="${index}">
                    ${GUIDING_MODALITY_OPTIONS.map(option => `<option value="${option.replace(/"/g, '&quot;')}" ${option === selectedModality ? 'selected' : ''}>${option}</option>`).join('')}
                </select>
                <button type="button" class="modality-row-btn add-custom-modality-btn" title="Add modality">+</button>
                <button type="button" class="modality-row-btn remove-custom-modality-btn" title="Remove modality" ${goalGeneratorModalities.length <= 1 ? 'disabled' : ''}>−</button>
            </div>
        `).join('');

        customInstructionsModalityOtherEl.value = goalGeneratorModalityOther || '';
        const hasOtherSelected = goalGeneratorModalities.includes('Other (Specify)');
        customInstructionsModalityOtherWrapEl.classList.toggle('hidden', !hasOtherSelected);
        customInstructionsModalityOtherEl.disabled = !hasOtherSelected;
    };

    const saveCustomInstructionsModalities = () => {
        const selected = Array.from(customInstructionsModalitiesListEl.querySelectorAll('.custom-instructions-modality-select')).map(el => el.value);
        goalGeneratorModalities = selected.filter(Boolean);
        if (!goalGeneratorModalities.includes('Other (Specify)')) {
            goalGeneratorModalityOther = '';
            customInstructionsModalityOtherEl.value = '';
            customInstructionsModalityOtherEl.disabled = true;
            customInstructionsModalityOtherWrapEl.classList.add('hidden');
        } else {
            customInstructionsModalityOtherWrapEl.classList.remove('hidden');
            customInstructionsModalityOtherEl.disabled = false;
            goalGeneratorModalityOther = customInstructionsModalityOtherEl.value || '';
        }
        saveClientGoalGenerationLens();
    };

    const makeGoalText = (problem, index, modalities) => {
        const modalityHint = modalities[0] ? ` using ${modalities[0]}` : '';
        const templates = [
            `Client will demonstrate improved management of ${problem}${modalityHint}, resulting in decreased symptom burden.`,
            `Client will strengthen adaptive coping around ${problem}${modalityHint}, resulting in decreased functional impairment.`,
            `Client will increase emotional regulation related to ${problem}${modalityHint}, resulting in decreased distress and improved stability.`,
            `Client will improve consistency in healthy responses to ${problem}${modalityHint}, resulting in decreased escalation and improved daily functioning.`
        ];
        return templates[index % templates.length];
    };

    const makeObjectiveText = (problem, goalText, objectiveIndex, format, modalities) => {
        const modalityPhrase = modalities.length > 0 ? ` aligned with ${modalities[0]}` : '';
        if (format === 'smart') {
            const smartTemplates = [
                `Client will identify 2 triggers related to ${problem}${modalityPhrase} and document them in writing at least 3 days per week.`,
                `Client will practice one coping strategy tied to ${goalText.toLowerCase()}${modalityPhrase} in at least 2 real-life situations each week.`,
                `Client will track intensity of ${problem} symptoms weekly${modalityPhrase} and report trend changes during session.`,
                `Client will use a structured self-regulation routine${modalityPhrase} and report at least 50% adherence by target review date.`
            ];
            return smartTemplates[objectiveIndex % smartTemplates.length];
        }

        const actionTemplates = [
            `Client will identify patterns that maintain ${problem}${modalityPhrase} and discuss them in session.`,
            `Client will identify and practice coping responses for ${problem}${modalityPhrase} between sessions.`,
            `Client will identify barriers to progress${modalityPhrase} and use one replacement action in real-time.`,
            `Client will identify gains and next steps${modalityPhrase} to sustain progress related to ${problem}.`
        ];
        return actionTemplates[objectiveIndex % actionTemplates.length];
    };

    let goalGenerationSystemPrompt = '';

    const MODALITY_TERM_MAP = {
        'CBT (Cognitive Behavioral Therapy)': ['CBT', 'Cognitive Behavioral Therapy'],
        'DBT (Dialectical Behavior Therapy)': ['DBT', 'Dialectical Behavior Therapy'],
        'ACT (Acceptance and Commitment Therapy)': ['ACT', 'Acceptance and Commitment Therapy'],
        'REBT (Rational Emotive Behavior Therapy)': ['REBT', 'Rational Emotive Behavior Therapy'],
        'CPT (Cognitive Processing Therapy)': ['CPT', 'Cognitive Processing Therapy'],
        'ERP (Exposure and Response Prevention)': ['ERP', 'Exposure and Response Prevention'],
        'Behavioral Activation (BA)': ['Behavioral Activation', 'BA'],
        'TF-CBT (Trauma-Focused CBT)': ['TF-CBT', 'Trauma-Focused CBT'],
        'Psychodynamic Psychotherapy': ['Psychodynamic Psychotherapy', 'Psychodynamic'],
        'Psychoanalysis': ['Psychoanalysis', 'Psychoanalytic'],
        'IFS (Internal Family Systems)': ['IFS', 'Internal Family Systems'],
        'Object Relations Therapy': ['Object Relations Therapy', 'Object Relations'],
        'Attachment-Based Therapy': ['Attachment-Based Therapy', 'Attachment Focused'],
        'EFT (Emotionally Focused Therapy)': ['EFT', 'Emotionally Focused Therapy'],
        'Person-Centered Therapy': ['Person-Centered Therapy', 'Client-Centered Therapy'],
        'Gestalt Therapy': ['Gestalt Therapy', 'Gestalt'],
        'Existential Therapy': ['Existential Therapy', 'Existential'],
        'Narrative Therapy': ['Narrative Therapy', 'Narrative'],
        'Solution-Focused Brief Therapy (SFBT)': ['SFBT', 'Solution-Focused Brief Therapy', 'Solution Focused'],
        'Logotherapy': ['Logotherapy']
    };

    const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const sanitizeGoalTextByModalities = (text, selectedModalities) => {
        if (!text) return '';
        const selectedSet = new Set((selectedModalities || []).filter(item => !item.startsWith('Other:')));
        let sanitized = text;

        Object.entries(MODALITY_TERM_MAP).forEach(([option, terms]) => {
            if (selectedSet.has(option)) return;
            terms.forEach(term => {
                const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'gi');
                sanitized = sanitized.replace(regex, 'selected-modality');
            });
        });

        return sanitized;
    };

    const normalizePresentingProblemFromAi = (aiPayload, diagnosis, shorthand) => {
        const generatedText = (aiPayload?.presentingProblem || aiPayload?.presenting_problem || '').toString().trim();
        if (generatedText) return generatedText;

        const diagnosisText = diagnosis ? `Client presents for treatment related to ${diagnosis}.` : '';
        const shorthandText = shorthand ? ` Clinician shorthand: ${shorthand}.` : '';
        return `${diagnosisText}${shorthandText}`.trim();
    };

    const getObjectiveTargetsByGoal = (goalCount, objectiveCount, objectivesPerGoal) => {
        if (objectivesPerGoal) return Array(goalCount).fill(objectiveCount);
        const targets = Array(goalCount).fill(0);
        for (let index = 0; index < objectiveCount; index += 1) {
            targets[index % goalCount] += 1;
        }
        return targets;
    };

    const normalizeGoalDraftsFromAi = (aiPayload, diagnosis, goalCount, objectiveCount, format, modalities, objectivesPerGoal) => {
        const staggeredTimeline = [3, 6, 9, 12];
        const generatedStartDate = getLocalDateInputValue();
        const aiGoals = Array.isArray(aiPayload?.goals) ? aiPayload.goals : [];
        const normalizedGoals = [];

        for (let goalIndex = 0; goalIndex < goalCount; goalIndex += 1) {
            const aiGoal = aiGoals[goalIndex] || {};
            const fallbackGoalTitle = makeGoalText(diagnosis, goalIndex, modalities);
            const goalTitle = (aiGoal.title || fallbackGoalTitle || '').toString().trim() || fallbackGoalTitle;
            normalizedGoals.push({
                id: crypto.randomUUID(),
                approved: true,
                title: sanitizeGoalTextByModalities(goalTitle, modalities),
                timelineMonths: normalizeTreatmentPlanTimeline(aiGoal.timelineMonths, DEFAULT_GOAL_TIMELINE_MONTHS),
                startDate: generatedStartDate,
                startDateManuallyEdited: false,
                objectives: []
            });
        }

        const objectiveTargets = getObjectiveTargetsByGoal(goalCount, objectiveCount, objectivesPerGoal);
        const sharedGoalContext = normalizedGoals.map(goal => goal.title).join('; ');
        const overallAiObjectives = Array.isArray(aiPayload?.objectives)
            ? aiPayload.objectives
            : aiGoals.flatMap(goal => Array.isArray(goal?.objectives) ? goal.objectives : []);
        let overallObjectiveIndex = 0;

        normalizedGoals.forEach((goal, goalIndex) => {
            const nestedAiObjectives = Array.isArray(aiGoals[goalIndex]?.objectives)
                ? aiGoals[goalIndex].objectives
                : [];
            const targetCount = objectiveTargets[goalIndex];

            for (let objectiveIndex = 0; objectiveIndex < targetCount; objectiveIndex += 1) {
                const rawAiObjective = objectivesPerGoal
                    ? nestedAiObjectives[objectiveIndex]
                    : overallAiObjectives[overallObjectiveIndex];
                const aiObjective = typeof rawAiObjective === 'string'
                    ? { text: rawAiObjective }
                    : (rawAiObjective || {});
                const goalContext = objectivesPerGoal ? goal.title : sharedGoalContext;
                const fallbackObjectiveText = makeObjectiveText(
                    diagnosis,
                    goalContext,
                    overallObjectiveIndex,
                    format,
                    modalities
                );
                const objectiveText = (aiObjective.text || fallbackObjectiveText || '').toString().trim() || fallbackObjectiveText;
                const fallbackTimeline = staggeredTimeline[Math.min(overallObjectiveIndex, staggeredTimeline.length - 1)];

                goal.objectives.push({
                    id: crypto.randomUUID(),
                    approved: true,
                    text: sanitizeGoalTextByModalities(objectiveText, modalities),
                    timelineMonths: normalizeTreatmentPlanTimeline(aiObjective.timelineMonths, fallbackTimeline),
                    startDate: generatedStartDate,
                    startDateManuallyEdited: false,
                    format: aiObjective.format === 'smart' ? 'smart' : format,
                    completed: false,
                    dateCreated: new Date().toISOString()
                });
                overallObjectiveIndex += 1;
            }
        });

        return normalizedGoals;
    };

    const rememberVertexEffectiveLocation = (location) => {
        const effectiveLocation = normalizeVertexLocation(location);
        if (effectiveLocation === vertexLocation) return;

        vertexLocation = effectiveLocation;
        vertexLocationInput.value = effectiveLocation;
        localStorage.setItem('vertexLocation', effectiveLocation);
    };

    const sleep = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));
    const VERTEX_MIN_REQUEST_GAP_MS = 750;
    const VERTEX_429_RETRY_LIMIT = 3;
    let vertexRequestQueue = Promise.resolve();
    let vertexRequestLastFinishedAt = 0;

    const enqueueVertexRequest = (operation) => {
        const queuedRequest = vertexRequestQueue.then(async () => {
            const waitMs = VERTEX_MIN_REQUEST_GAP_MS - (Date.now() - vertexRequestLastFinishedAt);
            if (waitMs > 0) await sleep(waitMs);
            try {
                return await operation();
            } finally {
                vertexRequestLastFinishedAt = Date.now();
            }
        });
        vertexRequestQueue = queuedRequest.catch(() => undefined);
        return queuedRequest;
    };

    const getVertexRetryAfterMs = (error, attempt) => {
        const retryAfterMs = Number(error?.vertexRetryAfterMs);
        if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
            return Math.min(retryAfterMs, 30000);
        }
        const exponentialDelay = Math.min(30000, 1500 * (2 ** attempt));
        return exponentialDelay + Math.floor(Math.random() * 250);
    };

    const requestVertexGenerateContentNow = async ({
        accessToken,
        allowErrorStatuses = [],
        errorPrefix = 'Vertex API error',
        location,
        modelId,
        payload,
        projectId
    }) => {
        let lastError = null;

        for (const requestLocation of getVertexRequestLocations(location)) {
            const host = getVertexApiHost(requestLocation);
            const url = `https://${host}/v1/projects/${projectId}/locations/${requestLocation}/publishers/google/models/${modelId}:generateContent`;
            const response = await tauriFetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                return { response, location: requestLocation };
            }

            const errorText = await response.text();
            const error = new Error(`${errorPrefix}: ${response.status} - ${errorText}`);
            lastError = error;
            error.vertexStatus = response.status;
            error.vertexRetryAfterMs = Number(response.headers?.get?.('Retry-After')) * 1000;

            if (requestLocation !== 'global'
                && isVertexPublisherModelNotFound(response.status, errorText)) {
                console.warn(
                    `Vertex model ${modelId} was not available in ${requestLocation}; retrying in global.`,
                    error
                );
                continue;
            }

            if (allowErrorStatuses.includes(response.status)) {
                return { error, location: requestLocation, response };
            }

            throw error;
        }

        throw lastError || new Error('Vertex API request failed.');
    };

    const requestVertexGenerateContent = (options) => enqueueVertexRequest(async () => {
        for (let attempt = 0; ; attempt += 1) {
            try {
                return await requestVertexGenerateContentNow(options);
            } catch (error) {
                if (error?.vertexStatus !== 429 || attempt >= VERTEX_429_RETRY_LIMIT) {
                    if (error?.vertexStatus === 429) {
                        const throttledError = new Error(
                            (options.errorPrefix || 'Vertex API error')
                            + ': Vertex temporarily throttled this request (429 RESOURCE_EXHAUSTED) after '
                            + (VERTEX_429_RETRY_LIMIT + 1)
                            + ' attempts. Please wait a moment and try again.'
                        );
                        throttledError.vertexStatus = 429;
                        throttledError.isVertexRateLimited = true;
                        throttledError.cause = error;
                        throw throttledError;
                    }
                    throw error;
                }

                const delayMs = getVertexRetryAfterMs(error, attempt);
                console.warn(
                    'Vertex request was rate-limited; retrying after '
                    + delayMs
                    + 'ms (attempt '
                    + (attempt + 2)
                    + ' of '
                    + (VERTEX_429_RETRY_LIMIT + 1)
                    + ').'
                );
                await sleep(delayMs);
            }
        }
    });

    const fetchGoalDraftsFromAI = async (diagnosis, shorthand, goalCount, objectiveCount, format, modalities, objectivesPerGoal) => {
        if (!selectedModel) {
            throw new Error('Please connect to a provider and select a model in Settings.');
        }

        const styleDescriptor = format === 'smart' ? 'smart' : 'action-focused';
        const selectedModalityOptions = modalities.filter(item => !item.startsWith('Other:'));
        const forbiddenModalityOptions = GUIDING_MODALITY_OPTIONS
            .filter(item => item !== 'Other (Specify)' && !selectedModalityOptions.includes(item));
        const modalityContext = modalities.length > 0 ? modalities.map(item => `- ${item}`).join('\n') : '- None specified';
        const forbiddenContext = forbiddenModalityOptions.length > 0
            ? forbiddenModalityOptions.map(item => `- ${item}`).join('\n')
            : '- None';

        const objectiveRequest = objectivesPerGoal
            ? `${objectiveCount} objectives under every goal`
            : `${objectiveCount} total objectives distributed across all goals; each objective must support the complete set of goals`;
        const userPrompt = `Diagnoses and Substantiation:\n${diagnosis}\n\nEach diagnosis block starts with the diagnosis name on its first line; the following lines are substantiation for that diagnosis. A blank line separates diagnosis blocks. Keep each substantiation paired with its diagnosis. Use the supplied substantiation as clinical context when writing the presenting problem, goals, and objectives. Do not mistake substantiation for another diagnosis or copy it verbatim as a separate plan item. Do not add clinical facts beyond the supplied diagnosis, substantiation, and shorthand.\n\nPresenting Problem Shorthand:\n${shorthand || '- None provided'}\n\nRequested Output:\n- Goals: ${goalCount}\n- Objectives: ${objectiveRequest}\n- Objective format: ${styleDescriptor}\n\nWrite a concise clinical Presenting Problem using the diagnoses, their paired substantiation, and Presenting Problem Shorthand above. Do not invent symptoms, duration, risk factors, functional impairment, or history that was not supplied.\n\nGuiding Modalities (Allowed):\n${modalityContext}\n\nForbidden Modalities (Do not use):\n${forbiddenContext}\n\nReturn only JSON in the required schema.`;

        return requestJsonObjectFromCurrentProvider(goalGenerationSystemPrompt, userPrompt);

    };

    const aiProviderClient = createAiProviderClient({
        getConfig: () => ({
            apiProvider,
            selectedModel,
            vertexServiceAccount,
            vertexLocation,
            openaiApiKey,
            serverAddress,
            apiKey,
            ollamaAddress: ollamaAddressInput?.value || ''
        }),
        fetchImpl: tauriFetch,
        getGoogleAccessToken,
        requestVertexGenerateContent,
        rememberVertexEffectiveLocation
    });
    const { requestJsonObjectFromCurrentProvider } = aiProviderClient;

    const organizeObjectiveContentLocally = (objectiveText) => {
        const objectiveItems = splitSoapBulletItems(objectiveText);
        if (objectiveItems.length < 2) return joinSoapBulletItems(objectiveItems);
        const { assignments } = buildObjectiveTopicClusters(objectiveItems);
        const organizedItems = sortByExplicitTopicRanksStable(objectiveItems, assignments);
        return joinSoapBulletItems(organizedItems);
    };

    const normalizeObjectiveOrderFromAiPayload = (objectiveItems, aiPayload) => {
        const aiItems = Array.isArray(aiPayload?.ordered_items)
            ? aiPayload.ordered_items
            : Array.isArray(aiPayload?.orderedItems)
                ? aiPayload.orderedItems
                : Array.isArray(aiPayload?.items)
                    ? aiPayload.items
                    : [];
        if (aiItems.length !== objectiveItems.length) return [];

        const originalBuckets = new Map();
        objectiveItems.forEach(item => {
            const key = normalizeObjectiveOrderingItem(item);
            if (!originalBuckets.has(key)) {
                originalBuckets.set(key, []);
            }
            originalBuckets.get(key).push(item);
        });

        const orderedItems = [];
        for (const aiItem of aiItems) {
            const key = normalizeObjectiveOrderingItem(aiItem);
            const bucket = originalBuckets.get(key);
            if (!bucket || bucket.length === 0) return [];
            orderedItems.push(bucket.shift());
        }

        if ([...originalBuckets.values()].some(bucket => bucket.length > 0)) return [];
        return orderedItems;
    };

    const fetchOrganizedObjectiveFromAI = async (objectiveText) => {
        const objectiveItems = splitSoapBulletItems(objectiveText);
        if (objectiveItems.length < 2) return joinSoapBulletItems(objectiveItems);

        const userPrompt = `Objective bullet points:\n${objectiveItems.map(item => `- ${item}`).join('\n')}\n\nReturn only JSON in the form {"ordered_items":["exact original bullet 1","exact original bullet 2"]}.`;
        const systemPrompt = 'Reorder the provided Objective bullet points into a more logical grouped order. Return every original bullet exactly once. Keep each bullet text exactly as provided aside from optional leading bullet characters. Do not rewrite, summarize, merge, split, or add headings.';

        const aiPayload = await requestJsonObjectFromCurrentProvider(systemPrompt, userPrompt);
        const orderedItems = normalizeObjectiveOrderFromAiPayload(objectiveItems, aiPayload);
        if (orderedItems.length !== objectiveItems.length) {
            throw new Error('AI response did not preserve the original Objective bullets exactly.');
        }

        return joinSoapBulletItems(orderedItems);
    };

    const fetchObjectiveRedundancyReviewFromAI = async (reviewItems) => {
        if (reviewItems.length < 2) return [];

        const objectiveContext = reviewItems
            .map(item => `${item.id}: ${item.text}`)
            .join('\n');
        const systemPrompt = [
            'You are organizing every behavioral-health SOAP Objective option into editable topic groups before the clinician approves anything. The items include generated Objective statements and suggested additions; categorize both.',
            'Group by a specific clinical focus, such as cannabis cessation, family support, workplace stress, or emotion regulation. Topics are categories, not claims of redundancy: complementary interventions and distinct details may belong in the same group as separate selectable options.',
            'Include every supplied item ID exactly once across disjoint groups. Do not omit, rewrite, merge, or create statements. Keep each original item as its own option so the clinician can edit it and choose multiple complementary options.',
            'Use a concise 2-3 word title for each group. Aim for groups of 2-3 related options where supported by the content. Keep unrelated clinical focuses in separate groups, and do not combine items just to hit a target count.',
            'Recommend checkboxes for about five of the strongest final statements overall. Prefer specific, session-grounded statements that capture an important intervention or response; leave overlapping or lower-value alternatives unchecked. Do not force a fixed count, and allow multiple checked items within a group when they contribute distinct useful content.',
            'Order groups by the importance of their recommended final statements, strongest first.',
            'Return only JSON exactly as {"objective_groups":[{"group_id":"G1","label":"Cannabis Cessation","item_ids":["O2","S1"],"recommended_keep_ids":["O2"]}]}. '
        ].join(' ');
        const userPrompt = `Objective options to categorize. Every listed ID must appear in exactly one topic group:\n${objectiveContext}\n\nReturn only the required JSON. The recommended_keep_ids are the options that should start checked; the clinician can change any text and select more than one option in a group.`;
        const aiPayload = await requestJsonObjectFromCurrentProvider(systemPrompt, userPrompt);
        return normalizeObjectiveRedundancyGroupsFromAi(reviewItems, aiPayload);
    };

    const prepareObjectiveRedundancyReview = async (appointment, client) => {
        if (!appointment?.soap) return [];
        let reviewData = buildObjectiveRedundancyReviewData(appointment);
        if (reviewData.items.length === 0) {
            delete appointment.soap.objectiveRedundancyReview;
            return [];
        }

        let groups = [];
        if (reviewData.items.length >= 2) {
            try {
                groups = await fetchObjectiveRedundancyReviewFromAI(reviewData.items);
            } catch (error) {
                console.warn('Objective topic grouping AI failed; creating local topic groups.', error);
                groups = [];
            }
        }

        const latestReviewData = buildObjectiveRedundancyReviewData(appointment);
        if (latestReviewData.objectiveText !== reviewData.objectiveText
            || JSON.stringify(latestReviewData.suggestionSnapshot) !== JSON.stringify(reviewData.suggestionSnapshot)) {
            reviewData = latestReviewData;
            groups = [];
        }

        groups = limitObjectiveReviewDefaults(completeObjectiveTopicGroups(reviewData.items, groups));
        const selectedItemIndexes = [...new Set(groups.flatMap(group => group.selectedItemIndexes || []))];
        appointment.soap.objectiveRedundancyReview = {
            reviewId: `objective-review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            objectiveText: reviewData.objectiveText,
            suggestionSnapshot: reviewData.suggestionSnapshot,
            items: reviewData.items,
            selectedItemIndexes,
            groups,
            manualObjectiveNote: ''
        };
        return groups;
    };

    const getClientDiagnosisNames = (client) => {
        const names = getClientDiagnoses(client)
            .map(entry => String(entry?.name || '').trim())
            .filter(Boolean);
        if (names.length > 0) return names;
        return String(client?.diagnosis || '')
            .split(/\r?\n/)
            .map(value => value.replace(/^\s*[-*\u2022]\s*/, '').trim())
            .filter(Boolean);
    };

    const buildDiagnosticSupportSessionContext = (client, appointment) => {
        const soap = appointment?.soap || {};
        const auditProofing = getAuditProofingData(appointment);
        const resolvedInterventions = getResolvedSoapInterventions(appointment, client);
        const interventionText = resolvedInterventions.length > 0
            ? resolvedInterventions.join('\n')
            : (soap.interventions || '');
        const sections = [
            ['Documented Presenting Problem', client?.presentingProblem],
            ['Session Information', appointment?.sessionInfo],
            ['Subjective', soap.s],
            ['Objective', soap.o],
            ['Interventions', interventionText],
            ['Assessment', soap.a],
            ['Plan', soap.p],
            ['Symptom Pattern / Severity Context', auditProofing.symptoms],
            ['Functional Impact', auditProofing.functionalImpact],
            ['Progress / Response to Treatment', auditProofing.progressResponse],
            ['Clinician-Entered Medical Necessity Rationale', auditProofing.medicalNecessity]
        ];

        return sections
            .map(([label, value]) => `${label}:\n${String(value || '').trim() || '- Not documented'}`)
            .join('\n\n');
    };

    const normalizeSupportValue = (value) => {
        const values = Array.isArray(value) ? value : [value];
        return values.map(item => {
            if (item && typeof item === 'object') {
                const diagnosis = String(item.diagnosis ?? item.name ?? '').trim();
                const statement = String(item.statement ?? item.support ?? item.text ?? '').trim();
                if (diagnosis && statement) return `${diagnosis}: ${statement}`;
                return statement || diagnosis;
            }
            return String(item ?? '').trim();
        }).filter(Boolean).join('\n\n').trim();
    };

    const normalizeDiagnosticSupportFromAi = (aiPayload) => {
        const rawSupport = aiPayload?.diagnostic_support
            ?? aiPayload?.diagnosticSupport
            ?? aiPayload?.statements
            ?? aiPayload?.statement
            ?? aiPayload?.support
            ?? '';
        const entries = Array.isArray(rawSupport) ? rawSupport : [rawSupport];

        return entries.map(item => {
            if (item && typeof item === 'object') {
                const diagnosis = String(item.diagnosis ?? item.name ?? '').trim();
                const rawSentences = Array.isArray(item.sentences)
                    ? item.sentences
                    : (item.statement ?? item.support ?? item.text ?? '');
                const sentences = (Array.isArray(rawSentences) ? rawSentences : [rawSentences])
                    .map(sentence => String(sentence ?? '').trim())
                    .filter(Boolean)
                    .slice(0, 4);
                const statement = sentences.join(' ');
                if (diagnosis && statement) return `${diagnosis}: ${statement}`;
                return statement || diagnosis;
            }
            return String(item ?? '').trim();
        }).filter(Boolean).join('\n\n').trim();
    };

    const normalizeDiagnosticSupportReferences = (value, client) => {
        const normalizeText = (text) => String(text ?? '')
            .replace(/\bthe\s+clients?\b/gi, match => match.toLowerCase().includes('clients') ? 'Cts' : 'Ct')
            .replace(/\bclients\b/gi, 'Cts')
            .replace(/\bclient\b/gi, 'Ct')
            .replace(/\bthe\s+clinicians?\b/gi, match => match.toLowerCase().includes('clinicians') ? 'Writers' : 'Writer')
            .replace(/\bclinicians\b/gi, 'Writers')
            .replace(/\bclinician\b/gi, 'Writer');

        if (typeof value === 'string') {
            const normalizedSections = value.split(/\n\s*\n/).map(section => {
                const separatorIndex = section.indexOf(':');
                if (separatorIndex <= 0) return normalizeText(section);
                const diagnosisLabel = section.slice(0, separatorIndex).trim();
                const statement = normalizeText(section.slice(separatorIndex + 1).trim());
                return statement ? `${diagnosisLabel}: ${statement}` : diagnosisLabel;
            }).join('\n\n');
            return normalizeCoupleCollectiveReferences(normalizedSections, client);
        }
        if (Array.isArray(value)) {
            return value.map(item => normalizeDiagnosticSupportReferences(item, client));
        }
        if (value && typeof value === 'object') {
            return Object.fromEntries(Object.entries(value).map(([key, item]) => [
                key,
                normalizeDiagnosticSupportReferences(item, client)
            ]));
        }
        return value;
    };

    const normalizeSoapSessionFocusFromAi = (aiPayload) => normalizeSupportValue(
        aiPayload?.session_focus
            ?? aiPayload?.sessionFocus
            ?? aiPayload?.session_focus_statement
            ?? aiPayload?.presenting_problem
            ?? aiPayload?.presentingProblem
            ?? aiPayload?.presenting_problem_statement
            ?? aiPayload?.problem
            ?? ''
    );

    const normalizeMedicalNecessityFromAi = (aiPayload) => normalizeSupportValue(
        aiPayload?.medical_necessity
            ?? aiPayload?.medicalNecessity
            ?? aiPayload?.medical_necessity_statement
            ?? aiPayload?.medicalNecessityStatement
            ?? aiPayload?.statement
            ?? ''
    );



    const getActiveTreatmentPlanNecessityContext = (client) => {
        const activeGoals = Array.isArray(client?.goals)
            ? client.goals.filter(goal => goal?.status === 'active' && String(goal.title || '').trim())
            : [];
        if (activeGoals.length === 0) return '- No active treatment goal documented';

        return activeGoals.map(goal => {
            const objectives = Array.isArray(goal.objectives)
                ? goal.objectives.filter(objective => !objective.completed && String(objective.text || '').trim())
                : [];
            const objectiveText = objectives.length > 0
                ? objectives.map(objective => `  - Objective: ${objective.text}`).join('\n')
                : '  - No active objective documented';
            return `- Goal: ${goal.title}\n${objectiveText}`;
        }).join('\n');
    };

    const fetchDiagnosticSupportFromAI = async (client, appointment) => {
        const diagnoses = getClientDiagnosisNames(client);
        if (diagnoses.length === 0) {
            throw new Error('Enter at least one client diagnosis before generating Diagnostic Support.');
        }

        const diagnosisContext = diagnoses.map((diagnosis, index) => `${index + 1}. ${diagnosis}`).join('\n');
        const systemPrompt = `You are a behavioral-health documentation assistant writing chart-ready Diagnostic Support. Use only facts explicitly documented in the supplied current-session record. Create one separate entry for every listed clinician-entered diagnosis and preserve each diagnosis label exactly as provided. Each entry must contain a sentences array with 3-4 concise, complete sentences in total when that much diagnosis-specific material is documented: include session-specific evidence only when explicitly documented, then describe the documented interventions, support, or treatment focus that addressed the diagnosis. If no specific evidence appeared in the session, omit the evidence sentence rather than inventing it or writing a filler statement about missing evidence. Do not pad with generic diagnostic descriptions. Do not diagnose, reassess, substantiate, validate, deny, or critique the diagnosis. Do not evaluate whether criteria are met. Do not mention missing duration, pervasiveness, somatic symptoms, bereavement, diagnostic sufficiency, or any other criteria gap. Never say the record is insufficient to substantiate a diagnosis. Do not invent symptoms, duration, severity, impairment, risk, treatment response, progress, intervention delivery, or client participation. If no diagnosis-specific intervention or support was documented, include only the shortest truthful diagnosis-specific content available instead of padding. Use the locked chart terms: refer to the client as "Ct" and the clinician as "Writer"; for couple sessions use assigned member names/pronouns and the collective grammar rule. Never write "the client," "client," "the clinician," or "clinician" in the generated support text. ${SOAP_SESSION_NOTE_PROSE_GUIDANCE} Return only JSON exactly as {"diagnostic_support":[{"diagnosis":"F01.01 Example Diagnosis","sentences":["...","...","..."]}]} .`;
        const userPrompt = `Documented diagnoses (treatment anchors):\n${diagnosisContext}\n\nComplete documented session record:\n${buildDiagnosticSupportSessionContext(client, appointment)}\n\nFor each diagnosis, write one separate Diagnostic Support entry with the diagnosis label and a sentences array. Aim for 3-4 total sentences per diagnosis using only documented session evidence and interventions/support; omit the evidence sentence when no specific evidence is documented, and do not add filler. Return only JSON in the required form.`;
        const aiPayload = await requestJsonObjectFromCurrentProvider(systemPrompt, userPrompt);
        const diagnosticSupport = normalizeDiagnosticSupportFromAi(aiPayload);
        if (!diagnosticSupport) {
            throw new Error('AI returned an empty Diagnostic Support statement.');
        }
        return diagnosticSupport;
    };

    const fetchMedicalNecessityFromAI = async (client, appointment) => {
        const diagnoses = getClientDiagnosisNames(client);
        if (diagnoses.length === 0) {
            throw new Error('Enter at least one client diagnosis before generating Medical Necessity.');
        }

        const diagnosisContext = diagnoses.map((diagnosis, index) => `${index + 1}. ${diagnosis}`).join('\n');
        const systemPrompt = `You are a behavioral-health documentation assistant writing one concise, chart-ready Medical Necessity statement. Use only facts explicitly documented in the supplied current-session record and treatment context. ${SOAP_SESSION_NOTE_PROSE_GUIDANCE} ${SOAP_MEDICAL_NECESSITY_GUIDANCE} Do not explain or assess diagnostic criteria or discuss whether a diagnosis is substantiated. Return only JSON exactly as {"medical_necessity":"..."}.`;
        const userPrompt = `Documented diagnoses (treatment anchors):\n${diagnosisContext}\n\nActive treatment plan context (not evidence that a goal was addressed today):\n${getActiveTreatmentPlanNecessityContext(client)}\n\nComplete documented session record:\n${buildDiagnosticSupportSessionContext(client, appointment)}\n\nApply the Medical Necessity guidance and return only JSON in the required form.`;
        const aiPayload = await requestJsonObjectFromCurrentProvider(systemPrompt, userPrompt);
        const medicalNecessity = normalizeMedicalNecessityFromAi(aiPayload);
        if (!medicalNecessity) {
            throw new Error('AI returned an empty Medical Necessity statement.');
        }
        return medicalNecessity;
    };

    const fetchSessionFocusFromAI = async (client, appointment) => {
        const documentedPresentingProblem = String(client?.presentingProblem || '').trim();
        const systemPrompt = `You are a behavioral-health documentation assistant writing one concise, chart-ready Session Focus statement for a SOAP note. Combine the documented presenting problem with the clinical problem evidenced in the complete current-session record. Describe how the presenting problem appeared in today\'s session using only explicitly documented facts. Do not diagnose, invent symptoms, severity, duration, impairment, risk, interventions, response, progress, or history. Do not list techniques or repeat the SOAP note. Keep it to 1-2 sentences, ideally 25-45 words and never more than 55 words. If the documented presenting problem is not reflected in today\'s record, state only the documented connection that is supported and do not imply unobserved symptoms. ${SOAP_SESSION_NOTE_PROSE_GUIDANCE} Return only JSON exactly as {"session_focus":"..."}.`;
        const userPrompt = `Documented Presenting Problem (treatment context):\n${documentedPresentingProblem || '- Not documented'}\n\nComplete documented session record:\n${buildDiagnosticSupportSessionContext(client, appointment)}\n\nWrite one concise Session Focus statement that describes the current session in the context of the documented presenting problem. Return only JSON in the required form.`;
        const aiPayload = await requestJsonObjectFromCurrentProvider(systemPrompt, userPrompt);
        const sessionFocus = normalizeSoapSessionFocusFromAi(aiPayload);
        if (!sessionFocus) {
            throw new Error('AI returned an empty Session Focus statement.');
        }
        return sessionFocus;
    };

    const fetchSupportFieldsFromAI = async (client, appointment, requestedFields = ['sessionFocus', 'diagnosticSupport', 'medicalNecessity']) => {
        const requested = new Set(Array.isArray(requestedFields) ? requestedFields : []);
        if (requested.size === 0) return {};
        const diagnoses = getClientDiagnosisNames(client);
        const diagnosisContext = diagnoses.length > 0
            ? diagnoses.map((diagnosis, index) => (index + 1) + '. ' + diagnosis).join('\n')
            : '- None documented';
        const fieldInstructions = [];
        if (requested.has('sessionFocus')) {
            fieldInstructions.push('For Session Focus, combine the documented presenting problem with the clinical problem evidenced in today\'s session; describe how that problem appeared in the session without inventing symptoms, severity, duration, impairment, risk, interventions, response, progress, or history. Keep it to 1-2 sentences, ideally 25-45 words and never more than 55 words.');
        }
        if (requested.has('diagnosticSupport')) {
            fieldInstructions.push('For Diagnostic Support, return one separate entry for every listed clinician-entered diagnosis, preserving each diagnosis label exactly as provided. Each entry must have a sentences array with 3-4 concise, complete sentences in total when supported by the record: include session-specific evidence only when explicitly documented, then describe the documented interventions, support, or treatment focus that addressed the diagnosis. If no specific evidence appeared in the session, omit that evidence sentence rather than inventing it or adding filler. Do not use generic diagnostic descriptions or pad the entry. Do not diagnose, reassess, substantiate, validate, deny, or critique the diagnosis, and do not discuss whether criteria are met. Use the locked chart terms: refer to the client as "Ct" and the clinician as "Writer"; for couple sessions use assigned member names/pronouns and the collective grammar rule. Never write "the client," "client," "the clinician," or "clinician" in Diagnostic Support.');
        }
        if (requested.has('medicalNecessity')) {
            fieldInstructions.push(SOAP_MEDICAL_NECESSITY_GUIDANCE);
        }
        const systemPrompt = `You are a behavioral-health documentation assistant writing only the requested chart-ready support fields. Use only facts explicitly documented in the supplied current-session record and treatment context. ${SOAP_SESSION_NOTE_PROSE_GUIDANCE} ${fieldInstructions.join(' ')} Diagnosis alone is not evidence; do not invent a symptom-diagnosis relationship. Do not list interventions, techniques, progress, response, or collateral events unless one is essential to explain the current need. Do not evaluate diagnostic criteria or explain why the diagnosis is valid. If no diagnosis is listed, return an empty diagnostic_support array and an empty medical_necessity string. Do not write or return fields that were not requested. For Diagnostic Support, use the exact JSON shape [{"diagnosis":"...","sentences":["...","..."]}] and use the locked chart terms Ct and Writer. Return only JSON with the requested keys using these names: session_focus, diagnostic_support, medical_necessity.`;
        const userPrompt = 'Documented diagnoses (treatment anchors):\n'
            + diagnosisContext
            + (requested.has('medicalNecessity')
                ? '\n\nActive treatment plan context (not evidence that a goal was addressed today):\n' + getActiveTreatmentPlanNecessityContext(client)
                : '')
            + '\n\nComplete documented session record:\n'
            + buildDiagnosticSupportSessionContext(client, appointment)
            + `\n\nRequested fields: ${[...requested].join(', ')}. Write only the requested fields, keep them separate, and return only the required JSON.`;
        const aiPayload = await requestJsonObjectFromCurrentProvider(systemPrompt, userPrompt);
        const result = {
            sessionFocus: requested.has('sessionFocus') ? normalizeSoapSessionFocusFromAi(aiPayload) : '',
            diagnosticSupport: requested.has('diagnosticSupport') ? normalizeDiagnosticSupportFromAi(aiPayload) : '',
            medicalNecessity: requested.has('medicalNecessity') ? normalizeMedicalNecessityFromAi(aiPayload) : ''
        };
        if (!Object.values(result).some(Boolean)) {
            throw new Error('AI returned empty requested SOAP support fields.');
        }
        return result;
    };

    const setSoapSupportRefreshState = (button, label, isLoading) => {
        if (!button) return;
        button.disabled = isLoading;
        button.classList.toggle('is-loading', isLoading);
        button.title = isLoading ? `Refreshing ${label}...` : `Refresh ${label}`;
        button.setAttribute('aria-label', button.title);
        button.setAttribute('aria-busy', String(isLoading));
    };

    const refreshDiagnosticSupport = async () => {
        const appointmentContext = getSelectedAppointmentContext();
        const appointment = getAppointmentFromContext(appointmentContext);
        const client = appointmentContext ? findClient(appointmentContext.clientId) : null;
        if (!client || !appointment) return;
        if (!isObjectiveOrganizeCompleted(appointment)) {
            alert('Review Objective and press Approve before generating Diagnostic Support.');
            return;
        }

        const refreshButton = document.getElementById('refreshDiagnosticSupportBtn');
        setSoapSupportRefreshState(refreshButton, 'Diagnostic Support', true);
        try {
            const diagnosticSupport = await fetchDiagnosticSupportFromAI(client, appointment);
            if (!appointment.soap) appointment.soap = { s: '', o: '', a: '', p: '' };
            appointment.soap.diagnosticSupport = normalizeDiagnosticSupportReferences(diagnosticSupport, client);
            delete appointment.auditCheck;
            markDirty();
            if (isCurrentAppointmentContext(appointmentContext)) renderSoap();
        } catch (error) {
            console.error('Diagnostic Support refresh error:', error);
            if (isCurrentAppointmentContext(appointmentContext)) alert(`Failed to refresh Diagnostic Support. ${error.message}`);
        } finally {
            if (refreshButton?.isConnected) setSoapSupportRefreshState(refreshButton, 'Diagnostic Support', false);
        }
    };

    const refreshSessionFocus = async () => {
        const appointmentContext = getSelectedAppointmentContext();
        const appointment = getAppointmentFromContext(appointmentContext);
        const client = appointmentContext ? findClient(appointmentContext.clientId) : null;
        if (!client || !appointment) return;
        if (!isObjectiveOrganizeCompleted(appointment)) {
            alert('Review Objective and press Approve before generating Session Focus.');
            return;
        }

        const isLegacyField = isLegacySoapPresentingProblem(appointment);
        const refreshButton = document.getElementById(isLegacyField ? 'refreshPresentingProblemBtn' : 'refreshSessionFocusBtn');
        const fieldLabel = isLegacyField ? 'Presenting Problem' : 'Session Focus';
        setSoapSupportRefreshState(refreshButton, fieldLabel, true);
        try {
            const sessionFocus = await fetchSessionFocusFromAI(client, appointment);
            if (!appointment.soap) appointment.soap = { s: '', o: '', a: '', p: '' };
            appointment.soap[isLegacyField ? 'presentingProblem' : 'sessionFocus'] = normalizeCoupleCollectiveReferences(sessionFocus, client);
            delete appointment.auditCheck;
            markDirty();
            if (isCurrentAppointmentContext(appointmentContext)) renderSoap();
        } catch (error) {
            console.error('Session Focus refresh error:', error);
            if (isCurrentAppointmentContext(appointmentContext)) alert(`Failed to refresh ${fieldLabel}. ${error.message}`);
        } finally {
            if (refreshButton?.isConnected) setSoapSupportRefreshState(refreshButton, fieldLabel, false);
        }
    };

    const refreshMedicalNecessity = async () => {
        const appointmentContext = getSelectedAppointmentContext();
        const appointment = getAppointmentFromContext(appointmentContext);
        const client = appointmentContext ? findClient(appointmentContext.clientId) : null;
        if (!client || !appointment) return;
        if (!isObjectiveOrganizeCompleted(appointment)) {
            alert('Review Objective and press Approve before generating Medical Necessity.');
            return;
        }

        const refreshButton = document.getElementById('refreshMedicalNecessityBtn');
        setSoapSupportRefreshState(refreshButton, 'Medical Necessity', true);
        try {
            const medicalNecessity = await fetchMedicalNecessityFromAI(client, appointment);
            if (!appointment.soap) appointment.soap = { s: '', o: '', a: '', p: '' };
            appointment.soap.medicalNecessity = normalizeCoupleCollectiveReferences(medicalNecessity, client);
            delete appointment.auditCheck;
            markDirty();
            if (isCurrentAppointmentContext(appointmentContext)) renderSoap();
        } catch (error) {
            console.error('Medical Necessity refresh error:', error);
            if (isCurrentAppointmentContext(appointmentContext)) alert(`Failed to refresh Medical Necessity. ${error.message}`);
        } finally {
            if (refreshButton?.isConnected) setSoapSupportRefreshState(refreshButton, 'Medical Necessity', false);
        }
    };

    const fetchObjectiveInterventionsFromAI = async (objectiveText, bank) => {
        if (!selectedModel) {
            throw new Error('Please connect to a provider and select a model in Settings.');
        }

        const allowedBank = Array.isArray(bank) ? bank.filter(Boolean) : [];
        const bankContext = allowedBank.length > 0
            ? allowedBank.map(item => `- ${item}`).join('\n')
            : '- None';
        const userPrompt = `Objective Section:\n${objectiveText || '- None'}\n\nAllowed Intervention Bank:\n${bankContext}\n\nReview the entire Objective section comprehensively. Choose the strongest interventions only. Return 8-${OBJECTIVE_INTERVENTION_MAX_COUNT} interventions when that many are directly or strongly supported. If fewer than ${OBJECTIVE_INTERVENTION_MAX_COUNT} are well supported, return fewer rather than padding with interpretive choices. Prefer the most specific allowed bank item over a broader duplicate unless both are independently clear in the Objective section. Order the list from strongest to weakest support.\n\nReturn only JSON in the form {"interventions":[{"name":"exact allowed bank item","support":"explicit|direct|strong|interpretive|stretch"}]}.`;
        const systemPrompt = `You are matching SOAP Objective content to an allowed intervention bank. Use clinical reasoning across the full Objective section, not simple keyword extraction. Include only interventions that are directly named, clearly described, or strongly evidenced by a concrete therapeutic action in the text. Exclude interventions that are merely possible, loosely related, modality-level padding, or a stretch. Aim for ${OBJECTIVE_INTERVENTION_MIN_TARGET}-${OBJECTIVE_INTERVENTION_MAX_COUNT} interventions when that many are truly supported, but return fewer when the remaining options would be interpretive. Prefer specificity over broad duplicates. Return exact allowed bank strings only.`;

        const aiPayload = await requestJsonObjectFromCurrentProvider(systemPrompt, userPrompt);
        const aiInterventions = Array.isArray(aiPayload?.interventions)
            ? aiPayload.interventions
            : Array.isArray(aiPayload?.matches)
                ? aiPayload.matches
                : [];
        return selectInterventionsFromBank(allowedBank, aiInterventions);
    };

    const generateGoalDrafts = async () => {
        const diagnosis = (goalDiagnosisInput.value || '').trim();
        const diagnosisEntries = parseTreatmentPlanDiagnosisEntries(diagnosis);
        const diagnosisSummary = diagnosisEntries.map(entry => entry.name).join('; ');
        const shorthand = (presentingProblemShorthandInput.value || '').trim();
        const goalCount = Math.max(1, Math.min(20, parseInt(goalCountInput.value, 10) || 1));
        const objectiveCount = Math.max(1, Math.min(20, parseInt(objectiveCountInput.value, 10) || 1));
        const objectivesPerGoal = !!objectivesPerGoalInput.checked;
        const format = objectiveStyleSelect.value === 'smart' ? 'smart' : 'action';
        const modalities = getGoalGenerationModalitiesContext();
        const generatorClientId = activeGoalGeneratorClientId;
        const requestId = ++goalGenerationRequestId;
        const generatorClient = findClient(generatorClientId);
        if (!generatorClient) return;
        saveClientGoalGenerationLens(generatorClientId);

        if (diagnosisEntries.length === 0) {
            alert('Please enter at least one diagnosis first.');
            return;
        }

        runGoalGeneratorBtn.disabled = true;
        runGoalGeneratorBtn.textContent = 'Generating...';

        try {
            const aiPayload = await fetchGoalDraftsFromAI(
                diagnosis,
                shorthand,
                goalCount,
                objectiveCount,
                format,
                modalities,
                objectivesPerGoal
            );
            if (activeGoalGeneratorClientId !== generatorClientId || goalGenerationRequestId !== requestId) return;
            generatedPresentingProblemDraft = normalizePresentingProblemFromAi(aiPayload, diagnosisSummary, shorthand);
            generatedGoalsDraft = normalizeGoalDraftsFromAi(
                aiPayload,
                diagnosisSummary,
                goalCount,
                objectiveCount,
                format,
                modalities,
                objectivesPerGoal
            );
            renderGeneratedGoalsReview();
        } catch (error) {
            if (activeGoalGeneratorClientId !== generatorClientId || goalGenerationRequestId !== requestId) return;
            console.error('Goal generation error:', error);
            alert(`Failed to generate goals/objectives with AI. ${error.message}`);
        } finally {
            if (goalGenerationRequestId === requestId) {
                runGoalGeneratorBtn.disabled = false;
                runGoalGeneratorBtn.textContent = 'Generate Draft';
            }
        }
    };

    const escapeGoalDraftHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const renderGeneratedGoalsReview = () => {
        if (!generatedGoalsReview) return;
        if (!generatedGoalsDraft.length && !generatedPresentingProblemDraft) {
            generatedGoalsReview.innerHTML = '<div class="no-selection">Generate a draft to review, edit, and save.</div>';
            applyGeneratedGoalsBtn.disabled = true;
            applyGeneratedGoalsBottomBtn.disabled = true;
            return;
        }

        generatedGoalsReview.innerHTML = `
            <div class="generator-card">
                <div class="generator-title">Presenting Problem</div>
                <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px;" for="draftPresentingProblem">Review and edit before saving</label>
                <textarea id="draftPresentingProblem" class="mini-input draft-presenting-problem" rows="5">${escapeGoalDraftHtml(generatedPresentingProblemDraft)}</textarea>
            </div>
        ` + generatedGoalsDraft.map((goal, goalIndex) => `
            <div class="generator-card" data-draft-goal-index="${goalIndex}">
                <div class="generator-title">Goal ${goalIndex + 1}</div>
                <div class="goal-draft-grid" style="display:grid;grid-template-columns:minmax(0,1fr) 100px 160px 120px;gap:8px;align-items:end;margin-bottom:8px;">
                    <div>
                        <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px;">Goal Text</label>
                        <textarea class="mini-input draft-goal-text" rows="2">${escapeGoalDraftHtml(goal.title)}</textarea>
                    </div>
                    <div>
                        <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px;">Timeline (mo)</label>
                        <select class="mini-input draft-goal-timeline">${getTreatmentPlanTimelineOptionsMarkup(goal.timelineMonths, DEFAULT_GOAL_TIMELINE_MONTHS)}</select>
                    </div>
                    <div class="draft-goal-start-date">
                        <label for="draftGoalStartDateInput${goalIndex}Month" style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:4px;">Start date</label>
                        ${renderSegmentedDateControlMarkup(`draftGoalStartDateInput${goalIndex}`, goal.startDate, true)}
                    </div>
                    <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;">
                        <input type="checkbox" class="draft-goal-approved" ${goal.approved ? 'checked' : ''}> Approve Goal
                    </label>
                </div>
                ${(goal.objectives || []).map((obj, objIndex) => `
                    <div class="objective-draft-grid" style="display:grid;grid-template-columns:minmax(0,1fr) 100px 160px 100px;gap:8px;align-items:end;margin:6px 0 0 0;" data-draft-objective-index="${objIndex}">
                        <div>
                            <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Objective ${objIndex + 1}</label>
                            <textarea class="mini-input draft-obj-text" rows="2">${escapeGoalDraftHtml(obj.text)}</textarea>
                        </div>
                        <div>
                            <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Timeline (mo)</label>
                            <select class="mini-input draft-obj-timeline">${getTreatmentPlanTimelineOptionsMarkup(obj.timelineMonths, DEFAULT_OBJECTIVE_TIMELINE_MONTHS)}</select>
                        </div>
                        <div class="draft-obj-start-date">
                            <label for="draftObjectiveStartDateInput${goalIndex}_${objIndex}Month" style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Start date</label>
                            ${renderSegmentedDateControlMarkup(`draftObjectiveStartDateInput${goalIndex}_${objIndex}`, obj.startDate, true)}
                        </div>
                        <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;white-space:nowrap;justify-self:end;">
                            <input type="checkbox" class="draft-obj-approved" ${obj.approved ? 'checked' : ''}> Approve
                        </label>
                    </div>
                `).join('')}
            </div>
        `).join('');

        initializeSegmentedDateInputs();
        Array.from(generatedGoalsReview.querySelectorAll('[data-draft-goal-index]')).forEach(card => {
            const goalIndex = parseInt(card.dataset.draftGoalIndex, 10);
            const draftGoal = generatedGoalsDraft[goalIndex];
            const markGoalDateEdited = () => {
                if (draftGoal) draftGoal.startDateManuallyEdited = true;
            };
            const goalDateControl = card.querySelector('.draft-goal-start-date .segmented-date-control');
            goalDateControl?.addEventListener('input', markGoalDateEdited);
            goalDateControl?.addEventListener('change', markGoalDateEdited);

            Array.from(card.querySelectorAll('[data-draft-objective-index]')).forEach(row => {
                const objIndex = parseInt(row.dataset.draftObjectiveIndex, 10);
                const draftObjective = draftGoal?.objectives?.[objIndex];
                const markObjectiveDateEdited = () => {
                    if (draftObjective) draftObjective.startDateManuallyEdited = true;
                };
                const objectiveDateControl = row.querySelector('.draft-obj-start-date .segmented-date-control');
                objectiveDateControl?.addEventListener('input', markObjectiveDateEdited);
                objectiveDateControl?.addEventListener('change', markObjectiveDateEdited);
            });
        });
        syncGeneratedGoalsFromReview();
    };

    const syncGeneratedGoalsFromReview = () => {
        const presentingProblemReview = generatedGoalsReview.querySelector('.draft-presenting-problem');
        if (presentingProblemReview) {
            generatedPresentingProblemDraft = presentingProblemReview.value.trim();
        }
        const goalCards = Array.from(generatedGoalsReview.querySelectorAll('[data-draft-goal-index]'));
        goalCards.forEach(card => {
            const goalIndex = parseInt(card.dataset.draftGoalIndex, 10);
            const draftGoal = generatedGoalsDraft[goalIndex];
            if (!draftGoal) return;

            draftGoal.title = (card.querySelector('.draft-goal-text')?.value || '').trim();
            draftGoal.timelineMonths = normalizeTreatmentPlanTimeline(card.querySelector('.draft-goal-timeline')?.value, DEFAULT_GOAL_TIMELINE_MONTHS);
            draftGoal.startDate = card.querySelector('.draft-goal-start-date input[type="date"]')?.value || '';
            draftGoal.approved = !!card.querySelector('.draft-goal-approved')?.checked;

            const objectiveRows = Array.from(card.querySelectorAll('[data-draft-objective-index]'));
            objectiveRows.forEach(row => {
                const objIndex = parseInt(row.dataset.draftObjectiveIndex, 10);
                const draftObj = draftGoal.objectives?.[objIndex];
                if (!draftObj) return;
                draftObj.text = (row.querySelector('.draft-obj-text')?.value || '').trim();
                draftObj.timelineMonths = normalizeTreatmentPlanTimeline(row.querySelector('.draft-obj-timeline')?.value, DEFAULT_OBJECTIVE_TIMELINE_MONTHS);
                draftObj.startDate = row.querySelector('.draft-obj-start-date input[type="date"]')?.value || '';
                draftObj.approved = !!row.querySelector('.draft-obj-approved')?.checked;
            });
        });

        applyGeneratedGoalsBtn.disabled = generatedGoalsDraft.length === 0;
        applyGeneratedGoalsBottomBtn.disabled = generatedGoalsDraft.length === 0;
    };

    const applyGeneratedGoals = () => {
        const client = findClient(activeGoalGeneratorClientId);
        if (!client) return;
        syncGeneratedGoalsFromReview();

        const approvedGoals = generatedGoalsDraft
            .filter(goal => goal.approved && (goal.title || '').trim())
            .map(goal => ({
                ...goal,
                objectives: (goal.objectives || []).filter(obj => obj.approved && (obj.text || '').trim())
            }));
        const approvedObjectiveCount = approvedGoals.reduce((count, goal) => count + goal.objectives.length, 0);

        if (!generatedPresentingProblemDraft.trim()) {
            alert('Review or enter a Presenting Problem before saving.');
            return;
        }
        if (approvedGoals.length === 0 || approvedObjectiveCount === 0) {
            alert('Approve at least one goal and one objective, then click Save.');
            return;
        }
        const addedOnDate = getLocalDateInputValue();
        const hasInvalidDates = approvedGoals.some(goal => !isValidDateInputValue(goal.startDateManuallyEdited ? goal.startDate : addedOnDate)
            || (goal.objectives || []).some(objective => !isValidDateInputValue(objective.startDateManuallyEdited ? objective.startDate : addedOnDate)));
        if (hasInvalidDates) {
            alert('Choose a valid start date for each approved goal and objective.');
            return;
        }

        client.presentingProblem = generatedPresentingProblemDraft.trim();
        if (!Array.isArray(client.goals)) client.goals = [];
        approvedGoals.forEach(draftGoal => {
            client.goals.push({
                id: crypto.randomUUID(),
                title: draftGoal.title,
                timelineMonths: normalizeTreatmentPlanTimeline(draftGoal.timelineMonths, DEFAULT_GOAL_TIMELINE_MONTHS),
                startDate: draftGoal.startDateManuallyEdited ? draftGoal.startDate : addedOnDate,
                status: 'active',
                objectives: (draftGoal.objectives || []).map(obj => ({
                    id: crypto.randomUUID(),
                    text: obj.text,
                    timelineMonths: normalizeTreatmentPlanTimeline(obj.timelineMonths, DEFAULT_OBJECTIVE_TIMELINE_MONTHS),
                    startDate: obj.startDateManuallyEdited ? obj.startDate : addedOnDate,
                    format: obj.format,
                    completed: false,
                    dateCreated: new Date().toISOString()
                })),
                dateCreated: new Date().toISOString()
            });
        });

        generatedGoalsDraft = [];
        generatedPresentingProblemDraft = '';
        renderGeneratedGoalsReview();
        goalGeneratorModal.classList.add('hidden');
        activeGoalGeneratorClientId = null;
        goalGenerationRequestId += 1;
        markDirty();
        if (selectedClientId !== client.id) {
            selectedClientId = client.id;
            selectedAppointmentId = null;
            selectedNoteId = null;
            selectedIntakeId = null;
        }
        fullRender();
    };
    
    // --- UI Rendering ---
    const {
        renderClients,
        renderAppointments,
        renderClientContactFields,
        updateRenderedClientContactValidation,
        renderClientDiagnoses
    } = createClientViews({
        getState: () => ({
            selectedClientId,
            selectedAppointmentId,
            selectedNoteId,
            selectedIntakeId,
            recordViewClearedForSelectedClient,
            clientSearchQuery,
            clients: data.clients
        }),
        normalizeClientData,
        getTodaySessionClients,
        getMainBankClients,
        findClient,
        ensureClientContactInfo,
        getClientContactEntryValue,
        isClientContactEntryLocked,
        getClientContactValidationMessage,
        getClientDiagnoses,
        escapeGoalDraftHtml,
        syncAppointmentDateInput,
        elements: {
            mainBankSearchInput,
            clearMainBankSearchBtn,
            todaySessionsCountEl,
            clearTodaySessionsBtn,
            mainBankCountEl,
            todaySessionsListEl,
            clientListEl,
            addAppointmentBtn,
            addIntakeBtn,
            addNoteBtn,
            appointmentListEl,
            noteNameInput,
            updateAppointmentDateBtn,
            renameNoteBtn,
            clientPhoneListEl,
            clientEmailListEl,
            addPhoneNumberBtn,
            addEmailAddressBtn,
            addDiagnosisBtn,
            clientDiagnosesListEl
        },
        contactIcons: CONTACT_ICON_SVGS
    });

    const renderDetails = () => {
        const client = recordViewClearedForSelectedClient ? null : findClient(selectedClientId);
        const appointment = client ? findAppointment(client, selectedAppointmentId) : null;
        const note = client ? findNote(client, selectedNoteId) : null;
        const intakeSession = client ? findIntakeSession(client, selectedIntakeId) : null;
        
        persistentNotesEl.contentEditable = client ? 'true' : 'false';
        persistentNotesEl.setAttribute('aria-disabled', String(!client));
        persistentNotesEl.dataset.placeholder = client ? "Enter persistent notes for this client..." : "Select a client to enter persistent notes...";
        setRichNoteEditorValue(persistentNotesEl, client ? client.persistentNotes || '' : '');
        nextSessionNotesEl.contentEditable = client ? 'true' : 'false';
        nextSessionNotesEl.setAttribute('aria-disabled', String(!client));
        nextSessionNotesEl.dataset.placeholder = client ? "Enter next session notes for this client..." : "Select a client to enter next session notes...";
        setRichNoteEditorValue(nextSessionNotesEl, client ? client.nextSessionNotes || '' : '');
        updateRichNoteToolbarStates();
        updateNotesTabUI();
        updateClientDetailsTabLabels();
        renderClientContactFields(client);

        renderClientDiagnoses(client);
        clientPresentingProblemEl.disabled = !client;
        clientPresentingProblemEl.value = client ? client.presentingProblem || '' : '';
        clientPresentingProblemEl.placeholder = client
            ? "Enter or generate the client's presenting problem..."
            : "Select a client to enter a presenting problem...";
        treatmentPlanStartDateInput.disabled = !client;
        const treatmentPlanStartDate = client ? getClientTreatmentPlanStartDate(client) : '';
        treatmentPlanStartDateInput.value = treatmentPlanStartDate;
        syncSegmentedDateInput('treatmentPlanStartDateInput', treatmentPlanStartDate);

        sessionInfoEl.disabled = !appointment && !note;
        sessionInfoEl.value = appointment
            ? appointment.sessionInfo || ''
            : (note ? note.sessionInfo || '' : '');
        syncAppointmentDateInput();
        noteNameInput.value = note ? note.name || '' : '';
        sessionInfoEl.placeholder = appointment
            ? "Enter session details..."
            : (note ? "Enter freeform note details..." : "Select an appointment or note to begin...");

        const isNoteMode = !appointment && !!note && !intakeSession;
        if (appointment || isNoteMode) {
            sessionInfoEl.rows = 20;
            sessionInfoEl.style.minHeight = '20lh';
            sessionInfoEl.style.resize = 'vertical';
            sessionInfoEl.style.width = '100%';
            sessionInfoEl.style.flex = isNoteMode ? '1 1 auto' : '0 0 auto';
        } else {
            sessionInfoEl.rows = 8;
            sessionInfoEl.style.minHeight = '';
            sessionInfoEl.style.resize = 'vertical';
            sessionInfoEl.style.width = '100%';
            sessionInfoEl.style.flex = '0 0 auto';
        }

        regularSessionFieldsEl.classList.toggle('hidden', !!intakeSession);
        intakeSessionBlockEl.classList.toggle('hidden', !intakeSession);
        copyIntakeSessionBtn.disabled = !intakeSession;
        auditProofingBlockEl.classList.toggle('hidden', !appointment);
        renderIntakeFields(intakeSession);

        const auditProofing = getAuditProofingData(appointment);
        [
            auditProofSymptomsEl,
            auditProofFunctionalEl,
            auditProofProgressEl,
            auditProofNecessityEl
        ].forEach(field => {
            field.disabled = !appointment;
        });
        auditProofSymptomsEl.value = appointment ? auditProofing.symptoms : '';
        auditProofFunctionalEl.value = appointment ? auditProofing.functionalImpact : '';
        auditProofProgressEl.value = appointment ? auditProofing.progressResponse : '';
        auditProofNecessityEl.value = appointment ? auditProofing.medicalNecessity : '';
        
        persistentInstructions = client ? client.persistentInstructions || '' : '';
        sessionInstructions = appointment ? appointment.sessionInstructions || '' : '';
        customInstructionsBtn.disabled = !client;
        
        updateAppointmentDateBtn.disabled = !appointment;
        addAppointmentBtn.disabled = !client;
        addIntakeBtn.disabled = !client;
        renameNoteBtn.disabled = !note;
        noteNameInput.disabled = !client;
        generateGoalsBtn.disabled = !client;

        renderGoals();
        renderSoap();
        
        updateGenerateNoteButtonState();
    };

    const {
        addClientContactEntry,
        updateClientContactEntry,
        setClientContactLock,
        editClientContactEntry,
        copyClientContactEntry,
        removeClientContactEntry,
        addClientDiagnosis,
        removeClientDiagnosis,
        updateClientDiagnosis,
        updateClientDiagnosisSubstantiation
    } = createClientRecordEditor({
        getState: () => ({ selectedClientId, recordViewClearedForSelectedClient }),
        findClient,
        ensureClientContactInfo,
        getClientContactEntryValue,
        getClientContactValidationMessage,
        isClientContactEntryLocked,
        getClientDiagnoses,
        syncLegacyDiagnosisText,
        updateRenderedClientContactValidation,
        markDirty,
        renderDetails,
        clientDiagnosesListEl,
        contactIcons: CONTACT_ICON_SVGS
    });

    const getGoalStatusLabel = (status) => {
        const normalizedStatus = String(status || 'active');
        return normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
    };

    const getPlanCopyButtonMarkup = (label, className, datasetAttributes) => `
        <button type="button" class="copy-btn plan-copy-btn ${className}" ${datasetAttributes} title="Copy ${label}" aria-label="Copy ${label}">
            <span class="plan-copy-icon">${SOAP_ICON_SVGS.copy}</span>
            <span>Copy</span>
        </button>`;

    const formatGoalCopyText = (goal) => String(goal.title || '').trim();

    const formatObjectiveCopyText = (objective) => String(objective.text || '').trim();

    const formatDiagnosisWithSubstantiationText = (client) => getClientDiagnoses(client)
        .map(diagnosis => {
            const name = String(diagnosis?.name || '').trim();
            const substantiation = String(diagnosis?.substantiation || '').trim();
            if (!name) return '';
            return substantiation ? `${name}: ${substantiation}` : name;
        })
        .filter(Boolean)
        .join('\n\n');

    const formatDiagnosisWithoutSubstantiationText = (client) => getClientDiagnosisNames(client)
        .join('\n');

    const getActiveTreatmentPlanGoals = (client) => Array.isArray(client?.goals)
        ? client.goals.filter(goal => goal?.status === 'active' && formatGoalCopyText(goal))
        : [];

    const formatTreatmentPlanCopyText = (client) => getActiveTreatmentPlanGoals(client)
        .map(goal => {
            const objectiveText = (goal.objectives || [])
                .map(formatObjectiveCopyText)
                .filter(Boolean)
                .map(text => `• ${text}`);
            return [formatGoalCopyText(goal), ...objectiveText].join('\n');
        })
        .join('\n\n');

    const renderSoapTreatmentPlanItems = (client) => {
        const activeGoals = getActiveTreatmentPlanGoals(client);
        if (activeGoals.length === 0) {
            return '<div class="no-selection">No active treatment plan goals recorded.</div>';
        }

        return activeGoals.map((goal, goalIndex) => {
            const objectiveRows = (goal.objectives || []).map(objective => {
                const objectiveText = formatObjectiveCopyText(objective);
                if (!objectiveText) return '';
                return `
                    <div class="soap-treatment-plan-objective">
                        <span class="soap-treatment-plan-objective-text">${escapeGoalDraftHtml(objectiveText)}</span>
                        ${getPlanCopyButtonMarkup('Objective', 'soap-treatment-plan-copy-btn', `data-soap-plan-copy-type="objective" data-goal-id="${escapeGoalDraftHtml(goal.id)}" data-objective-id="${escapeGoalDraftHtml(objective.id)}"`)}
                    </div>
                `;
            }).join('');
            return `
                <div class="soap-treatment-plan-goal" data-soap-plan-goal-id="${escapeGoalDraftHtml(goal.id)}">
                    <div class="soap-treatment-plan-item-header">
                        <span>Goal ${goalIndex + 1}</span>
                        ${getPlanCopyButtonMarkup('Goal', 'soap-treatment-plan-copy-btn', `data-soap-plan-copy-type="goal" data-goal-id="${escapeGoalDraftHtml(goal.id)}"`)}
                    </div>
                    <div>${escapeGoalDraftHtml(formatGoalCopyText(goal))}</div>
                    ${objectiveRows ? `<div class="soap-treatment-plan-objectives">${objectiveRows}</div>` : ''}
                </div>
            `;
        }).join('');
    };

    const setPlanCopyButtonFeedback = (button, label, copied) => {
        if (!button) return;
        button.classList.toggle('is-copied', copied);
        button.innerHTML = copied
            ? '<span aria-hidden="true">✓</span><span>Copied</span>'
            : `<span class="plan-copy-icon">${SOAP_ICON_SVGS.copy}</span><span>Copy</span>`;
        button.title = copied ? `${label} copied` : `Copy ${label}`;
        button.setAttribute('aria-label', button.title);
    };

    const copyPlanItem = async (goalId, objectiveId, button) => {
        const client = findClient(selectedClientId);
        const goal = client?.goals?.find(item => item.id === goalId);
        const objective = goal && objectiveId
            ? (goal.objectives || []).find(item => item.id === objectiveId)
            : null;
        if (!goal || (objectiveId && !objective)) return;

        const label = objective ? 'Objective' : 'Goal';
        const text = objective ? formatObjectiveCopyText(objective) : formatGoalCopyText(goal);
        try {
            await navigator.clipboard.writeText(text);
            setPlanCopyButtonFeedback(button, label, true);
            window.setTimeout(() => {
                if (button.isConnected) setPlanCopyButtonFeedback(button, label, false);
            }, 2000);
        } catch (error) {
            console.error(`Failed to copy ${label.toLowerCase()}:`, error);
            setPlanCopyButtonFeedback(button, label, false);
            alert(`Could not copy the ${label.toLowerCase()} to the clipboard.`);
        }
    };

    const renderGoals = () => {
        const client = recordViewClearedForSelectedClient ? null : findClient(selectedClientId);
        addGoalBtnInTab.disabled = !client;
        generateGoalsBtn.disabled = !client;
        
        if (!client) {
            goalsListInTabEl.innerHTML = recordViewClearedForSelectedClient ? '' : '<div class="no-selection">Select a client to manage goals</div>';
            return;
        }

        if (!client.goals) {
            client.goals = [];
        }

        if (client.goals.length === 0) {
            goalsListInTabEl.innerHTML = '<div class="no-selection">Click + to add a treatment goal</div>';
            return;
        }

        goalsListInTabEl.innerHTML = client.goals.map((goal, goalIndex) => `
            <div class="goal-item" data-goal-id="${goal.id}">
                <div class="goal-header">
                    <div class="goal-heading">
                        <div class="goal-kicker">Goal ${goalIndex + 1}</div>
                        <div class="goal-title">${escapeGoalDraftHtml(goal.title)}</div>
                    </div>
                    <div class="goal-header-right">
                        <div class="goal-meta">
                            <div class="goal-status">${goal.timelineMonths || DEFAULT_GOAL_TIMELINE_MONTHS} mo</div>
                            <div class="goal-status ${goal.status || 'active'}">${getGoalStatusLabel(goal.status)}</div>
                        </div>
                        ${renderTreatmentPlanDateRange(getGoalTreatmentPlanStartDate(client, goal), goal.timelineMonths || DEFAULT_GOAL_TIMELINE_MONTHS)}
                        <div class="goal-header-actions">
                            ${getPlanCopyButtonMarkup('Goal', 'goal-copy-btn', 'data-copy-type="goal"')}
                            <div class="goal-actions">
                                <button class="action-btn edit-btn" title="Edit Goal, Start Date, and Timeline" aria-label="Edit Goal, Start Date, and Timeline">✏️</button>
                                <button class="action-btn archive-btn" title="Change Status">⚡</button>
                                <button class="action-btn delete-btn" title="Delete Goal">×</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="objective-list">
                    <div class="objective-list-heading">
                        <span>Objectives</span>
                        <span class="objective-count">${(goal.objectives || []).length} total</span>
                    </div>
                    ${(goal.objectives || []).map((obj, objectiveIndex) => `
                        <div class="objective-item" data-objective-id="${obj.id}">
                            <input type="checkbox" class="objective-checkbox" aria-label="Mark objective ${objectiveIndex + 1} complete" ${obj.completed ? 'checked' : ''}>
                            <div class="objective-main">
                                <div class="objective-label">Objective ${objectiveIndex + 1}</div>
                                <span class="objective-text ${obj.completed ? 'completed' : ''}">${escapeGoalDraftHtml(obj.text)}</span>
                            </div>
                            <div class="objective-controls">
                                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                                    <span class="goal-status">${obj.timelineMonths || DEFAULT_OBJECTIVE_TIMELINE_MONTHS} mo</span>
                                    ${renderTreatmentPlanDateRange(getObjectiveTreatmentPlanStartDate(client, goal, obj), obj.timelineMonths || DEFAULT_OBJECTIVE_TIMELINE_MONTHS)}
                                </div>
                                ${getPlanCopyButtonMarkup('Objective', 'objective-copy-btn', 'data-copy-type="objective"')}
                                <div class="objective-actions">
                                    <button class="action-btn edit-objective-btn" title="Edit Objective, Start Date, and Timeline" aria-label="Edit Objective, Start Date, and Timeline" style="width: 16px; height: 16px; font-size: 10px; background:#3498db;">✏️</button>
                                    <button class="action-btn delete-btn" title="Delete Objective" style="width: 16px; height: 16px; font-size: 10px;">×</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    <button class="add-objective-btn" data-goal-id="${goal.id}">+ Add Objective</button>
                </div>
            </div>
        `).join('');
    };
    
    const renderSoap = () => {
        if (recordViewClearedForSelectedClient) {
            soapContentEl.innerHTML = '';
            return;
        }

        const client = findClient(selectedClientId);
        const appointment = client ? findAppointment(client, selectedAppointmentId) : null;
        const note = client ? findNote(client, selectedNoteId) : null;
        const intakeSession = client ? findIntakeSession(client, selectedIntakeId) : null;

        if (!appointment) {
            if (intakeSession) {
                soapContentEl.innerHTML = '<div class="no-selection">Selected item is an Intake Session. Intake sessions do not qualify for generated SOAP notes.</div>';
                return;
            }
            if (note) {
                soapContentEl.innerHTML = '<div class="no-selection">Selected item is a Note. SOAP note generation and SOAP editing are disabled for Notes.</div>';
                return;
            }
            soapContentEl.innerHTML = '<div class="no-selection">Select an appointment to begin</div>';
            return;
        }

        const soapData = appointment.soap || { s: '', o: '', a: '', p: '' };
        const legacyPresentingProblem = isLegacySoapPresentingProblem(appointment);
        const clientPresentingProblemText = legacyPresentingProblem
            ? ''
            : (Object.prototype.hasOwnProperty.call(soapData, 'clientPresentingProblem')
                ? soapData.clientPresentingProblem
                : String(client?.presentingProblem || ''));
        if (!Array.isArray(appointment.selectedInterventions)) appointment.selectedInterventions = [];
        const missingSoapRequirements = getMissingSoapClientRequirements(client);
        const objectiveOrganized = isObjectiveOrganizeCompleted(appointment);
        const appointmentContext = { clientId: client.id, appointmentId: appointment.id, appointment };
        const objectiveOrganizing = isObjectiveOrganizationInFlight(appointmentContext);
        const objectiveReviewPreparing = isObjectiveReviewPreparationInFlight(appointmentContext);
        const objectiveDerivedInterventions = objectiveOrganized
            ? getObjectiveDerivedInterventions(appointment, client)
            : [];
        const interventions = objectiveOrganized
            ? formatInterventionsByModality(objectiveDerivedInterventions)
            : '';
        const auditResult = appointment.auditCheck || null;
        const objectiveReviewPending = Boolean(getObjectiveRedundancyReview(appointment));
        const objectiveBusy = objectiveOrganizing || objectiveReviewPreparing;
        soapContentEl.innerHTML = `
            <div class="soap-section" data-soap-section-key="s">
                <div class="soap-header"><span>Subjective</span>${renderSoapCopyButton('soapS', 'Subjective')}</div>
                <textarea id="soapS" class="soap-textarea" placeholder="• " autocorrect="off" autocapitalize="off" spellcheck="true">${soapData.s || ''}</textarea>
                ${(soapData.s_suggestion || []).map((s, i) => renderSuggestionBox('s', s, i)).join('')}
            </div>
            <div class="soap-section" data-soap-section-key="o">
                <div class="soap-header">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span>Objective</span>
                        ${objectiveReviewPreparing ? '<span class="soap-processing-status"><span class="soap-action-spinner" aria-hidden="true"></span>Grouping options...</span>' : ''}
                    </div>
                    ${objectiveReviewPending || objectiveReviewPreparing ? '' : renderSoapCopyButton('soapO', 'Objective')}
                </div>
                ${objectiveReviewPending ? '' : `<textarea id="soapO" class="soap-textarea" placeholder="• " autocorrect="off" autocapitalize="off" spellcheck="true"${objectiveBusy ? ' disabled' : ''}>${escapeGoalDraftHtml(soapData.o || '')}</textarea>`}
                ${renderObjectiveRedundancySuggestions(appointment)}
                ${renderObjectiveRedundancyReview(appointment, objectiveOrganizing)}
            </div>
            <div class="soap-section" data-soap-section-key="interventions">
                <div class="soap-header">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span>Interventions</span>
                        <button id="generateInterventionsBtn" type="button" class="copy-btn soap-icon-btn" title="Press Approve in Objective first" aria-label="Press Approve in Objective first"${objectiveOrganized ? '' : ' disabled'}>${SOAP_ICON_SVGS.refresh}</button>
                    </div>
                    <div class="soap-action-group">
                        <button id="selectInterventionsBtn" type="button" class="copy-btn soap-icon-btn" title="Open Intervention Bank" aria-label="Open Intervention Bank">${SOAP_ICON_SVGS.bank}</button>
                        ${renderSoapCopyButton('interventions', 'Interventions')}
                    </div>
                </div>
            <textarea id="interventions" class="soap-textarea" readonly autocorrect="off" autocapitalize="off" spellcheck="true">${interventions}</textarea>
            </div>
            <div class="soap-section" data-soap-section-key="a">
                <div class="soap-header"><span>Assessment</span>${renderSoapCopyButton('soapA', 'Assessment')}</div>
                <textarea id="soapA" class="soap-textarea" placeholder="• " autocorrect="off" autocapitalize="off" spellcheck="true">${soapData.a || ''}</textarea>
                ${(soapData.a_suggestion || []).map((s, i) => renderSuggestionBox('a', s, i)).join('')}
            </div>
            <div class="soap-section" data-soap-section-key="p">
                <div class="soap-header"><span>Plan</span>${renderSoapCopyButton('soapP', 'Plan')}</div>
                <textarea id="soapP" class="soap-textarea" placeholder="• " autocorrect="off" autocapitalize="off" spellcheck="true">${soapData.p || ''}</textarea>
                ${(soapData.p_suggestion || []).map((s, i) => renderSuggestionBox('p', s, i)).join('')}
            </div>
            <div class="soap-support-block" data-soap-section-key="diagnosisWithSubstantiation">
                <div class="soap-support-header">
                    <span>Diagnosis with substantiation</span>
                    ${renderSoapCopyButton('soapDiagnosisWithSubstantiation', 'Diagnosis with substantiation')}
                </div>
                <textarea id="soapDiagnosisWithSubstantiation" class="soap-textarea soap-static-textarea" readonly autocorrect="off" autocapitalize="off" spellcheck="true">${escapeGoalDraftHtml(formatDiagnosisWithSubstantiationText(client))}</textarea>
            </div>
            <div class="soap-support-block" data-soap-section-key="diagnosisWithoutSubstantiation">
                <div class="soap-support-header">
                    <span>Diagnosis without substantiation</span>
                    ${renderSoapCopyButton('soapDiagnosisWithoutSubstantiation', 'Diagnosis without substantiation')}
                </div>
                <textarea id="soapDiagnosisWithoutSubstantiation" class="soap-textarea soap-static-textarea" readonly autocorrect="off" autocapitalize="off" spellcheck="true">${escapeGoalDraftHtml(formatDiagnosisWithoutSubstantiationText(client))}</textarea>
            </div>
            ${legacyPresentingProblem ? `
            <div class="soap-support-block" data-soap-section-key="presentingProblem">
                <div class="soap-support-header">
                    <span>Presenting Problem</span>
                    <div class="soap-action-group">
                        <button id="refreshPresentingProblemBtn" type="button" class="copy-btn soap-icon-btn" title="${objectiveOrganized ? 'Refresh Presenting Problem' : 'Press Approve in Objective first'}" aria-label="${objectiveOrganized ? 'Refresh Presenting Problem' : 'Press Approve in Objective first'}"${objectiveOrganized ? '' : ' disabled'}>${SOAP_ICON_SVGS.refresh}</button>
                        ${renderSoapCopyButton('presentingProblem', 'Presenting Problem')}
                    </div>
                </div>
                <textarea id="presentingProblem" class="soap-textarea soap-support-textarea" placeholder="Press Approve in Objective to generate the session focus." autocorrect="off" autocapitalize="off" spellcheck="true">${escapeGoalDraftHtml(soapData.presentingProblem || '')}</textarea>
            </div>` : `
            <div class="soap-support-block" data-soap-section-key="presentingProblem">
                <div class="soap-support-header">
                    <span>Presenting Problem</span>
                    ${renderSoapCopyButton('soapClientPresentingProblem', 'Presenting Problem')}
                </div>
                <textarea id="soapClientPresentingProblem" class="soap-textarea soap-static-textarea" readonly autocorrect="off" autocapitalize="off" spellcheck="true">${escapeGoalDraftHtml(clientPresentingProblemText || '')}</textarea>
            </div>`}
            <div class="soap-support-block" data-soap-section-key="sessionFocus">
                <div class="soap-support-header">
                    <span>Session Focus</span>
                    <div class="soap-action-group">
                        <button id="refreshSessionFocusBtn" type="button" class="copy-btn soap-icon-btn" title="${objectiveOrganized ? 'Refresh Session Focus' : 'Press Approve in Objective first'}" aria-label="${objectiveOrganized ? 'Refresh Session Focus' : 'Press Approve in Objective first'}"${objectiveOrganized ? '' : ' disabled'}>${SOAP_ICON_SVGS.refresh}</button>
                        ${renderSoapCopyButton('sessionFocus', 'Session Focus')}
                    </div>
                </div>
                <textarea id="sessionFocus" class="soap-textarea soap-support-textarea" placeholder="Press Approve in Objective to generate a session focus." autocorrect="off" autocapitalize="off" spellcheck="true">${escapeGoalDraftHtml(soapData.sessionFocus || '')}</textarea>
            </div>
            <div class="soap-support-block" data-soap-section-key="treatmentPlan">
                <div class="soap-support-header">
                    <span>Treatment Plan</span>
                    ${renderSoapCopyButton('soapTreatmentPlan', 'Treatment Plan')}
                </div>
                <textarea id="soapTreatmentPlan" class="soap-textarea soap-static-textarea" readonly autocorrect="off" autocapitalize="off" spellcheck="true">${escapeGoalDraftHtml(formatTreatmentPlanCopyText(client))}</textarea>
                <div class="soap-treatment-plan-items">
                    ${renderSoapTreatmentPlanItems(client)}
                </div>
            </div>
            <div class="soap-support-block" data-soap-section-key="diagnosticSupport">
                <div class="soap-support-header">
                    <span>Diagnostic Support</span>
                    <div class="soap-action-group">
                        <button id="refreshDiagnosticSupportBtn" type="button" class="copy-btn soap-icon-btn" title="${objectiveOrganized ? 'Refresh Diagnostic Support' : 'Press Approve in Objective first'}" aria-label="${objectiveOrganized ? 'Refresh Diagnostic Support' : 'Press Approve in Objective first'}"${objectiveOrganized ? '' : ' disabled'}>${SOAP_ICON_SVGS.refresh}</button>
                        ${renderSoapCopyButton('diagnosticSupport', 'Diagnostic Support')}
                    </div>
                </div>
                <textarea id="diagnosticSupport" class="soap-textarea soap-support-textarea" placeholder="Press Approve in Objective to generate a separate 3-4 sentence section for each diagnosis." autocorrect="off" autocapitalize="off" spellcheck="true">${escapeGoalDraftHtml(soapData.diagnosticSupport || '')}</textarea>
            </div>
            <div class="soap-support-block" data-soap-section-key="medicalNecessity">
                <div class="soap-support-header">
                    <span>Medical Necessity</span>
                    <div class="soap-action-group">
                        <button id="refreshMedicalNecessityBtn" type="button" class="copy-btn soap-icon-btn" title="${objectiveOrganized ? 'Refresh Medical Necessity' : 'Press Approve in Objective first'}" aria-label="${objectiveOrganized ? 'Refresh Medical Necessity' : 'Press Approve in Objective first'}"${objectiveOrganized ? '' : ' disabled'}>${SOAP_ICON_SVGS.refresh}</button>
                        ${renderSoapCopyButton('medicalNecessity', 'Medical Necessity')}</div>
                </div>
                <textarea id="medicalNecessity" class="soap-textarea soap-support-textarea" placeholder="Press Approve in Objective to generate a medical necessity statement." autocorrect="off" autocapitalize="off" spellcheck="true">${escapeGoalDraftHtml(soapData.medicalNecessity || getAuditProofingData(appointment).medicalNecessity || '')}</textarea>
            </div>
            <div class="soap-section" data-soap-section-key="auditCheck">
                <div class="soap-header"><span>Audit Check</span><button id="runSoapAuditBtn" class="copy-btn">Audit</button></div>
                ${renderAuditResults(auditResult)}
            </div>`;

        const renderedSoapSections = Array.from(soapContentEl.children);
        const soapSectionsByKey = new Map();
        renderedSoapSections.forEach(sectionElement => {
            const sectionKey = sectionElement.dataset.soapSectionKey;
            if (sectionKey) soapSectionsByKey.set(sectionKey, sectionElement);
        });
        const configuredSoapSections = getSoapPlatformSectionKeysForAppointment(client, appointment);
        soapContentEl.replaceChildren(
            ...configuredSoapSections.map(sectionKey => soapSectionsByKey.get(sectionKey)).filter(Boolean)
        );
        if (missingSoapRequirements.length > 0) {
            const platformWarning = document.createElement('div');
            platformWarning.className = 'no-selection';
            platformWarning.textContent = getSoapGenerationRequirementMessage(missingSoapRequirements);
            soapContentEl.prepend(platformWarning);
        }
        
        // After rendering, resize all textareas
        soapContentEl.querySelectorAll('.soap-textarea').forEach(el => {
            if (!el.readOnly) { // Don't auto-resize the read-only interventions box
                autoResizeTextarea(el);
            }
        });
        soapContentEl.querySelectorAll('.objective-review-editor').forEach(autoResizeObjectiveReviewEditor);

        const interventionsTextarea = document.getElementById('interventions');
        if (interventionsTextarea) {
            interventionsTextarea.style.height = 'auto';
            autoResizeTextarea(interventionsTextarea);
        }

        const generateInterventionsBtn = document.getElementById('generateInterventionsBtn');
        if (generateInterventionsBtn) {
            generateInterventionsBtn.addEventListener('click', () => {
                void generateObjectiveInterventions();
            });
        }

        refreshObjectiveActionButtons(appointment);
        setSoapPostObjectiveProcessingState(objectiveOrganizing);
    };

    const renderSuggestionBox = (type, suggestion, index) => {
        if (!suggestion) return '';

        let suggestionTitle;
        let suggestionContent;
        let actionsHtml;

        const isReplacement = typeof suggestion === 'object' && suggestion.original && suggestion.suggested;

        if (isReplacement) {
            suggestionTitle = 'Clinical Language Suggestion:';
            suggestionContent = `
                <div><strong>Original:</strong> ${suggestion.original}</div>
                <div style="margin-top: 4px;"><strong>Suggested:</strong> ${suggestion.suggested}</div>
            `;
            actionsHtml = `
                <button class="suggestion-decline">Keep Original</button>
                <button class="suggestion-accept-replace">Use Suggestion</button>
            `;
        } else { // It's a new suggestion (string)
            suggestionTitle = 'Suggestion for Addition:';
            suggestionContent = `<strong>${suggestionTitle}</strong> ${suggestion}`;
            actionsHtml = `
                <button class="suggestion-accept">Accept</button>
                <button class="suggestion-decline">Decline</button>
            `;
        }

        return `
            <div class="suggestion-box" data-suggestion-type="${type}" data-suggestion-index="${index}">
                <button class="suggestion-close" title="Decline both" aria-label="Decline both original and suggestion">X</button>
                <div class="suggestion-text">${suggestionContent}</div>
                <div class="suggestion-actions">
                    ${actionsHtml}
                </div>
            </div>
        `;
    };

    const syncObjectiveRedundancySelectionsFromDom = (review) => {
        const container = document.getElementById('objectiveRedundancyReview');
        if (!review || !container) return;
        if (container.dataset.reviewId && review.reviewId && container.dataset.reviewId !== review.reviewId) return;
        const selections = new Map();
        container.querySelectorAll('.objective-redundancy-checkbox').forEach(checkbox => {
            const index = Number.parseInt(checkbox.dataset.itemIndex, 10);
            if (!Number.isInteger(index)) return;
            selections.set(index, Boolean(selections.get(index) || checkbox.checked));
        });
        selections.forEach((checked, index) => setObjectiveRedundancyItemSelected(review, index, checked));
        container.querySelectorAll('.objective-review-editor').forEach(editor => {
            if (editor.matches('.objective-manual-note-editor')) return;
            const index = Number.parseInt(editor.dataset.itemIndex, 10);
            const item = getObjectiveRedundancyItemsForReview(review)[index];
            if (!item) return;
            item.editedText = String(editor.value || '').replace(/\s*\n+\s*/g, ' ').trim();
        });
        const manualNoteEditor = container.querySelector('.objective-manual-note-editor');
        if (manualNoteEditor && (!manualNoteEditor.dataset.reviewId || manualNoteEditor.dataset.reviewId === review.reviewId)) {
            review.manualObjectiveNote = String(manualNoteEditor.value || '').replace(/\s*\n+\s*/g, ' ').trim();
        }
    };

    const renderObjectiveRedundancyItem = (item, itemIndex, selectedIndexes, groupId = '', reviewId = '', isBusy = false) => {
        return `
            <div class="objective-redundancy-item">
                <input type="checkbox" class="objective-redundancy-checkbox" data-review-id="${escapeGoalDraftHtml(reviewId)}" data-group-id="${escapeGoalDraftHtml(groupId)}" data-item-index="${itemIndex}" aria-label="Keep option ${itemIndex + 1}" ${selectedIndexes.has(itemIndex) ? 'checked' : ''}${isBusy ? ' disabled' : ''}>
                <textarea class="objective-review-editor" data-review-id="${escapeGoalDraftHtml(reviewId)}" data-item-index="${itemIndex}" aria-label="Edit option ${itemIndex + 1}" rows="3" spellcheck="true"${isBusy ? ' disabled' : ''}>${escapeGoalDraftHtml(item.editedText ?? item.text)}</textarea>
            </div>
        `;
    };

    const renderObjectiveRedundancySuggestions = (appointment) => {
        if (!appointment?.soap || isObjectiveOrganizeCompleted(appointment)) return '';
        if (getObjectiveRedundancyReview(appointment)) return '';
        const client = findClient(selectedClientId);
        const context = client ? { clientId: client.id, appointmentId: appointment.id } : null;
        if (isObjectiveReviewPreparationInFlight(context)) return '';
        const suggestions = Array.isArray(appointment.soap.o_suggestion)
            ? appointment.soap.o_suggestion
            : [];
        return suggestions.map((suggestion, index) => renderSuggestionBox('o', suggestion, index)).join('');
    };

    const renderObjectiveRedundancyReview = (appointment, isBusy = false) => {
        const review = getObjectiveRedundancyReview(appointment);
        if (!review) return '';
        const reviewItems = getObjectiveRedundancyItemsForReview(review);
        const groups = review.groups.map((group, groupIndex) => ({
            group,
            groupIndex,
            itemIndexes: Array.isArray(group?.itemIndexes)
                ? group.itemIndexes.filter(index => index >= 0 && index < reviewItems.length)
                : []
        })).filter(entry => entry.itemIndexes.length > 0);
        if (groups.length === 0) return '';
        const selectedIndexes = getSelectedObjectiveRedundancyItemIndexes(review);

        return `
            <div id="objectiveRedundancyReview" class="objective-redundancy-review" data-review-id="${escapeGoalDraftHtml(review.reviewId || '')}">
                <div class="objective-redundancy-groups">${groups.map(entry => {
                    const groupId = String(entry.group.id || `topic-${entry.groupIndex + 1}`);
                    return `
                        <section class="objective-redundancy-group objective-redundancy-group-container" data-redundancy-group-id="${escapeGoalDraftHtml(groupId)}" aria-label="${escapeGoalDraftHtml(entry.group.label)}">
                            <div class="objective-redundancy-group-title">${escapeGoalDraftHtml(entry.group.label || 'Related Topics')}</div>
                            ${entry.itemIndexes.map(index => renderObjectiveRedundancyItem(reviewItems[index], index, selectedIndexes, groupId, review.reviewId, isBusy)).join('')}
                        </section>
                    `;
                }).join('')}</div>
                <section class="objective-redundancy-group objective-manual-note-section">
                    <div class="objective-redundancy-group-title">Additional Objective Note</div>
                    <textarea class="objective-review-editor objective-manual-note-editor" data-review-id="${escapeGoalDraftHtml(review.reviewId || '')}" aria-label="Additional Objective note" rows="3" placeholder="Add a session detail to include in Objective when you approve." spellcheck="true"${isBusy ? ' disabled' : ''}>${escapeGoalDraftHtml(review.manualObjectiveNote || '')}</textarea>
                </section>
                <div class="objective-redundancy-actions">
                    <button type="button" id="approveObjectiveRedundancyBtn" class="objective-redundancy-apply"${isBusy ? ' disabled' : ''}>Approve</button>
                    <button type="button" id="dismissObjectiveRedundancyBtn"${isBusy ? ' disabled' : ''}>Dismiss</button>
                </div>
            </div>
        `;
    };

    const renderDeletedLists = () => {
        deletedClientsListEl.innerHTML = '';
        clearDeletedClientsBtn.classList.toggle('hidden', deletedItems.clients.length === 0);
        deletedItems.clients.forEach(client => {
            const div = document.createElement('div');
            div.className = 'deleted-item';
            div.innerHTML = `<span>${client.name}</span><button class="restore-btn" data-id="${client.id}">Restore</button>`;
            deletedClientsListEl.appendChild(div);
        });

        deletedAppointmentsListEl.innerHTML = '';
        if (!selectedClientId || recordViewClearedForSelectedClient) {
            clearDeletedAppointmentsBtn.classList.add('hidden');
            return;
        }

        const deletedAppointmentsForClient = deletedItems.appointments.filter(appt => appt.clientId === selectedClientId);
        const deletedNotesForClient = deletedItems.notes.filter(note => note.clientId === selectedClientId);
        const deletedIntakesForClient = deletedItems.intakes.filter(intake => intake.clientId === selectedClientId);
        clearDeletedAppointmentsBtn.classList.toggle('hidden', (deletedAppointmentsForClient.length + deletedNotesForClient.length + deletedIntakesForClient.length) === 0);

        deletedAppointmentsForClient.forEach(appt => {
            const div = document.createElement('div');
            div.className = 'deleted-item';
            div.innerHTML = `<span>Appt: ${new Date(appt.date).toLocaleDateString()}</span><button class="restore-btn" data-type="appointment" data-id="${appt.id}">Restore</button>`;
            deletedAppointmentsListEl.appendChild(div);
        });

        deletedIntakesForClient.forEach(intake => {
            const div = document.createElement('div');
            div.className = 'deleted-item';
            div.innerHTML = `<span>Intake: ${new Date(intake.createdAt).toLocaleDateString()}</span><button class="restore-btn" data-type="intake" data-id="${intake.id}">Restore</button>`;
            deletedAppointmentsListEl.appendChild(div);
        });

        deletedNotesForClient.forEach(note => {
            const div = document.createElement('div');
            div.className = 'deleted-item';
            div.innerHTML = `<span>Note: ${note.name || 'Untitled Note'}</span><button class="restore-btn" data-type="note" data-id="${note.id}">Restore</button>`;
            deletedAppointmentsListEl.appendChild(div);
        });
    };

    const renderArchivedClients = () => {
        archivedClientsListEl.innerHTML = '';
        (data.archivedClients || []).forEach(client => {
             const div = document.createElement('div');
             div.className = 'deleted-item';
             div.innerHTML = `<span>${client.name}</span><button class="restore-btn" data-id="${client.id}">Unarchive</button>`;
             archivedClientsListEl.appendChild(div);
        });
    };

    const fullRender = () => {
        renderClients();
        renderAppointments();
        renderDetails();
        renderDeletedLists();
        renderArchivedClients();
    };

    // --- Event Handlers & Actions ---
    const selectClient = (id) => {
        selectedClientId = id;
        selectedAppointmentId = null;
        selectedNoteId = null;
        selectedIntakeId = null;
        recordViewClearedForSelectedClient = false;
        fullRender();
    };

    const selectAppointment = (id) => {
        selectedAppointmentId = id;
        selectedNoteId = null;
        selectedIntakeId = null;
        recordViewClearedForSelectedClient = false;
        fullRender();
    };

    const selectNote = (id) => {
        selectedNoteId = id;
        selectedAppointmentId = null;
        selectedIntakeId = null;
        recordViewClearedForSelectedClient = false;
        fullRender();
    };

    const selectIntakeSession = (id) => {
        selectedIntakeId = id;
        selectedAppointmentId = null;
        selectedNoteId = null;
        recordViewClearedForSelectedClient = false;
        fullRender();
    };

    const clearSelectedRecordView = () => {
        selectedAppointmentId = null;
        selectedNoteId = null;
        selectedIntakeId = null;
        recordViewClearedForSelectedClient = true;
        noteNameInput.value = '';
    };

    const addGoal = () => {
        const client = findClient(selectedClientId);
        if (!client) return;
        
        showGoalEditorModal('Add Goal', '', DEFAULT_GOAL_TIMELINE_MONTHS).then(result => {
            if (!result) return;
            
            const newGoal = {
                id: crypto.randomUUID(),
                title: result.text,
                timelineMonths: result.timelineMonths,
                startDate: result.startDate,
                status: 'active',
                objectives: [],
                dateCreated: new Date().toISOString()
            };
            
            if (!client.goals) client.goals = [];
            client.goals.push(newGoal);
            markDirty();
            renderGoals();
        });
    };

    const addObjective = (goalId) => {
        const client = findClient(selectedClientId);
        if (!client) return;
        
        const goal = client.goals.find(g => g.id === goalId);
        if (!goal) return;

        showObjectiveEditorModal('Add Objective', '', DEFAULT_OBJECTIVE_TIMELINE_MONTHS).then(result => {
            if (!result) return;
            
            const newObjective = {
                id: crypto.randomUUID(),
                text: result.text,
                timelineMonths: result.timelineMonths,
                startDate: result.startDate,
                format: 'action',
                completed: false,
                dateCreated: new Date().toISOString()
            };
            
            if (!goal.objectives) goal.objectives = [];
            goal.objectives.push(newObjective);
            markDirty();
            renderGoals();
        });
    };

    const toggleObjective = (goalId, objectiveId) => {
        const client = findClient(selectedClientId);
        if (!client) return;
        
        const goal = client.goals.find(g => g.id === goalId);
        if (!goal) return;
        
        const objective = goal.objectives.find(o => o.id === objectiveId);
        if (!objective) return;
        
        objective.completed = !objective.completed;
        if (objective.completed) {
            objective.dateCompleted = new Date().toISOString();
        } else {
            delete objective.dateCompleted;
        }
        
        markDirty();
        renderGoals();
    };

    const deleteGoal = (goalId) => {
        const client = findClient(selectedClientId);
        if (!client) return;
        
        const goalIndex = client.goals.findIndex(g => g.id === goalId);
        if (goalIndex === -1) return;
        
        const goal = client.goals[goalIndex];
        if (confirm(`Are you sure you want to delete the goal "${goal.title}"?`)) {
            client.goals.splice(goalIndex, 1);
            markDirty();
            renderGoals();
        }
    };

    const deleteObjective = (goalId, objectiveId) => {
        const client = findClient(selectedClientId);
        if (!client) return;
        
        const goal = client.goals.find(g => g.id === goalId);
        if (!goal) return;
        
        const objIndex = goal.objectives.findIndex(o => o.id === objectiveId);
        if (objIndex === -1) return;
        
        goal.objectives.splice(objIndex, 1);
        markDirty();
        renderGoals();
    };

    const changeGoalStatus = (goalId) => {
        const client = findClient(selectedClientId);
        if (!client) return;
        
        const goal = client.goals.find(g => g.id === goalId);
        if (!goal) return;
        
        const statuses = ['active', 'completed', 'discontinued'];
        const currentIndex = statuses.indexOf(goal.status);
        const nextIndex = (currentIndex + 1) % statuses.length;
        
        goal.status = statuses[nextIndex];
        if (goal.status === 'completed') {
            goal.dateCompleted = new Date().toISOString();
        } else {
            delete goal.dateCompleted;
        }
        
        markDirty();
        renderGoals();
    };

    const editGoal = (goalId) => {
        const client = findClient(selectedClientId);
        if (!client) return;
        
        const goal = client.goals.find(g => g.id === goalId);
        if (!goal) return;
        
        const currentStartDate = isValidDateInputValue(goal.startDate)
            ? goal.startDate
            : (getClientTreatmentPlanStartDate(client) || getLocalDateInputValue());
        showGoalEditorModal('Edit Goal', goal.title, goal.timelineMonths, currentStartDate).then(result => {
            if (!result) return;
            goal.title = result.text;
            goal.timelineMonths = result.timelineMonths;
            goal.startDate = result.startDate;
            markDirty();
            renderGoals();
        });
    };

    const editObjective = (goalId, objectiveId) => {
        const client = findClient(selectedClientId);
        if (!client) return;
        const goal = client.goals.find(g => g.id === goalId);
        if (!goal) return;
        const objective = goal.objectives.find(o => o.id === objectiveId);
        if (!objective) return;

        const currentStartDate = isValidDateInputValue(objective.startDate)
            ? objective.startDate
            : (getGoalTreatmentPlanStartDate(client, goal) || getLocalDateInputValue());
        showObjectiveEditorModal('Edit Objective', objective.text, objective.timelineMonths, currentStartDate).then(result => {
            if (!result) return;
            objective.text = result.text;
            objective.timelineMonths = result.timelineMonths;
            objective.startDate = result.startDate;
            markDirty();
            renderGoals();
        });
    };

    const createClient = (name) => {
        if (!name || !name.trim()) return;
        const newClient = {
            id: crypto.randomUUID(),
            name: name.trim(),
            contactInfo: {
                phones: [],
                emails: []
            },
            persistentNotes: '',
            nextSessionNotes: '',
            diagnoses: [],
            diagnosis: '',
            presentingProblem: '',
            persistentInstructions: '',
            soapPlatformId: '',
            treatmentPlanStartDate: '',
            sessionType: 'individual',
            sessionTypeAssigned: false,
            preferredPronouns: {
                value: '',
                subject: '',
                object: '',
                possessive: ''
            },
            sessionMembers: [],
            appointments: [],
            intakeSessions: [],
            notes: [],
            goals: [],
            goalGenerationLens: {
                modalities: [...DEFAULT_GUIDING_MODALITIES],
                other: ''
            }
        };
        data.clients.push(newClient);
        selectClient(newClient.id);
        markDirty();
    };

    const openAddClientModal = () => {
        addClientNameInput.value = '';
        addClientModal.classList.remove('hidden');
        setTimeout(() => addClientNameInput.focus(), 0);
    };

    const closeAddClientModal = () => {
        addClientModal.classList.add('hidden');
    };

    const addClient = () => {
        const name = (addClientNameInput.value || '').trim();
        if (!name) return;
        createClient(name);
        closeAddClientModal();
    };

    const addAppointment = () => {
        const client = findClient(selectedClientId);
        if (!client) return;
        const date = appointmentDateInput.value;
        if (!date) {
            alert('Please select a date for the appointment.');
            return;
        }
        const dateObj = new Date(date);
        const utcDate = new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate());

        const newAppointment = {
            id: crypto.randomUUID(),
            date: utcDate.toISOString(),
            sessionInfo: '',
            sessionInstructions: '',
            selectedInterventions: [],
            soap: { s: '', o: '', a: '', p: '', supportFieldsVersion: 2 }
        };
        client.appointments.push(newAppointment);
        selectAppointment(newAppointment.id);
        markDirty();
    };

    const addNote = () => {
        const client = findClient(selectedClientId);
        if (!client) return;

        const name = noteNameInput.value.trim();
        if (!name) {
            alert('Please enter a note name.');
            return;
        }

        if (!Array.isArray(client.notes)) client.notes = [];
        const newNote = {
            id: crypto.randomUUID(),
            name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        client.notes.push(newNote);
        noteNameInput.value = '';
        selectNote(newNote.id);
        markDirty();
    };

    const addIntakeSession = () => {
        const client = findClient(selectedClientId);
        if (!client) return;

        if (!Array.isArray(client.intakeSessions)) client.intakeSessions = [];
        const newIntakeSession = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            fields: {}
        };

        client.intakeSessions.push(newIntakeSession);
        selectIntakeSession(newIntakeSession.id);
        markDirty();
    };

    const renameSelectedNote = () => {
        const client = findClient(selectedClientId);
        const note = findNote(client, selectedNoteId);
        if (!note) {
            alert('Select a note to rename.');
            return;
        }

        const proposedName = noteNameInput.value.trim();
        if (proposedName && proposedName !== note.name) {
            note.name = proposedName;
            note.updatedAt = new Date().toISOString();
            noteNameInput.value = note.name;
            markDirty();
            fullRender();
            return;
        }
        showRenameModal('Rename note', note.name).then(newName => {
            if (!newName || !newName.trim()) return;
            note.name = newName.trim();
            note.updatedAt = new Date().toISOString();
            noteNameInput.value = note.name;
            markDirty();
            fullRender();
        });
    };
    
    const handleClientListClick = (e) => {
        const clientItem = e.target.closest('.client-item');
        if (!clientItem) return;

        const clientId = clientItem.dataset.clientId;

        if (e.target.closest('.today-session-btn')) {
            const movingFromTodaySessions = isClientInTodaySessions(clientId);
            if (movingFromTodaySessions) {
                removeClientFromTodaySessions(clientId);
            } else {
                moveClientToTodaySessionsEnd(clientId);
            }
            markDirty();
            if (movingFromTodaySessions && selectedClientId === clientId) {
                clearSelectedRecordView();
                fullRender();
            } else {
                renderClients();
            }
        } else if (e.target.closest('.delete-btn')) {
             const client = findClient(clientId);
             if (confirm(`Are you sure you want to delete ${client.name}?`)) {
                const clientIndex = data.clients.findIndex(c => c.id === clientId);
                if (clientIndex === -1) return;
                const [removedClient] = data.clients.splice(clientIndex, 1);
                    removeClientFromTodaySessions(clientId);
                    if (removedClient.appointments) {
                        deletedItems.appointments.push(...removedClient.appointments.map(a => ({...a, clientId})));
                    }
                    if (removedClient.intakeSessions) {
                        deletedItems.intakes.push(...removedClient.intakeSessions.map(intake => ({...intake, clientId})));
                    }
                deletedItems.clients.push(removedClient);
                if (selectedClientId === clientId) {
                    selectedClientId = null;
                    selectedAppointmentId = null;
                    selectedNoteId = null;
                    selectedIntakeId = null;
                }
                markDirty();
                fullRender();
             }
        } else if (e.target.closest('.archive-btn')) {
            const clientIndex = data.clients.findIndex(c => c.id === clientId);
            if (clientIndex === -1) return;
            const [client] = data.clients.splice(clientIndex, 1);
            removeClientFromTodaySessions(clientId);
            if (!data.archivedClients) data.archivedClients = [];
            data.archivedClients.push(client);
            if (selectedClientId === clientId) {
                selectedClientId = null;
                selectedAppointmentId = null;
                selectedNoteId = null;
                selectedIntakeId = null;
            }
            markDirty();
            fullRender();
        } else if (e.target.closest('.edit-btn')) {
            const client = findClient(clientId);
            if (!client) return;
            showRenameModal(`Rename client`, client.name).then(newName => {
                if (newName && newName.trim() && newName.trim() !== client.name) {
                    client.name = newName.trim();
                    markDirty();
                    fullRender();
                }
            });
        } else {
            selectClient(clientId);
        }
    };

    clientListEl.addEventListener('click', handleClientListClick);
    todaySessionsListEl.addEventListener('click', handleClientListClick);

    // --- Rename Modal Helper ---
    function showRenameModal(title, currentValue) {
        return new Promise((resolve) => {
            const modal = document.getElementById('renameModal');
            const input = document.getElementById('renameModalInput');
            const titleEl = document.getElementById('renameModalTitle');
            const confirmBtn = document.getElementById('renameModalConfirm');
            const cancelBtn = document.getElementById('renameModalCancel');
            
            titleEl.textContent = title;
            input.value = currentValue;
            modal.classList.remove('hidden');
            setTimeout(() => { input.focus(); input.select(); }, 50);
            
            function cleanup() {
                modal.classList.add('hidden');
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                input.removeEventListener('keydown', onKeydown);
            }
            function onConfirm() { cleanup(); resolve(input.value); }
            function onCancel() { cleanup(); resolve(null); }
            function onKeydown(e) {
                if (e.key === 'Enter') { e.preventDefault(); onConfirm(); }
                if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
            }
            confirmBtn.addEventListener('click', onConfirm);
            cancelBtn.addEventListener('click', onCancel);
            input.addEventListener('keydown', onKeydown);
        });
    }

    const showPlanItemEditorModal = (
        itemLabel,
        title,
        currentText = '',
        currentTimeline = DEFAULT_OBJECTIVE_TIMELINE_MONTHS,
        fallbackTimeline = DEFAULT_OBJECTIVE_TIMELINE_MONTHS,
        currentStartDate = null
    ) => new Promise((resolve) => {
        const modal = document.getElementById('objectiveEditorModal');
        const titleEl = document.getElementById('objectiveEditorModalTitle');
        const textLabel = document.getElementById('objectiveEditorTextLabel');
        const textInput = document.getElementById('objectiveEditorTextInput');
        const startDateInput = document.getElementById('planItemStartDateInput');
        const timelineSelect = document.getElementById('objectiveEditorTimelineSelect');
        const confirmBtn = document.getElementById('objectiveEditorModalConfirm');
        const cancelBtn = document.getElementById('objectiveEditorModalCancel');
        if (!modal || !titleEl || !textLabel || !textInput || !startDateInput || !timelineSelect || !confirmBtn || !cancelBtn) {
            resolve(null);
            return;
        }

        titleEl.textContent = title;
        textLabel.textContent = itemLabel;
        textInput.value = currentText || '';
        startDateInput.value = isValidDateInputValue(currentStartDate) ? currentStartDate : getLocalDateInputValue();
        syncSegmentedDateInput('planItemStartDateInput', startDateInput.value);
        timelineSelect.value = String(normalizeTreatmentPlanTimeline(currentTimeline, fallbackTimeline));
        modal.classList.remove('hidden');
        const startDateControl = getSegmentedDateControl('planItemStartDateInput');
        let startDateManuallyEdited = false;
        const markStartDateManuallyEdited = () => { startDateManuallyEdited = true; };
        startDateControl?.addEventListener('input', markStartDateManuallyEdited);
        startDateControl?.addEventListener('change', markStartDateManuallyEdited);

        const cleanup = () => {
            modal.classList.add('hidden');
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
            modal.removeEventListener('keydown', onKeydown);
            startDateControl?.removeEventListener('input', markStartDateManuallyEdited);
            startDateControl?.removeEventListener('change', markStartDateManuallyEdited);
        };
        const onConfirm = () => {
            const text = textInput.value.trim();
            if (!text) {
                textInput.focus();
                return;
            }
            const startDate = !isValidDateInputValue(currentStartDate) && !startDateManuallyEdited
                ? getLocalDateInputValue()
                : startDateInput.value;
            if (!isValidDateInputValue(startDate)) {
                alert('Enter a valid start date.');
                document.getElementById('planItemStartDateInputMonth')?.focus();
                return;
            }
            const result = {
                text,
                startDate,
                timelineMonths: normalizeTreatmentPlanTimeline(timelineSelect.value, fallbackTimeline)
            };
            cleanup();
            resolve(result);
        };
        const onCancel = () => {
            cleanup();
            resolve(null);
        };
        const onKeydown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCancel();
            } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                onConfirm();
            }
        };

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
        modal.addEventListener('keydown', onKeydown);
        setTimeout(() => {
            textInput.focus();
            textInput.setSelectionRange(textInput.value.length, textInput.value.length);
        }, 50);
    });

    const showObjectiveEditorModal = (title, currentText = '', currentTimeline = DEFAULT_OBJECTIVE_TIMELINE_MONTHS, currentStartDate = null) =>
        showPlanItemEditorModal('Objective', title, currentText, currentTimeline, DEFAULT_OBJECTIVE_TIMELINE_MONTHS, currentStartDate);

    const showGoalEditorModal = (title, currentText = '', currentTimeline = DEFAULT_GOAL_TIMELINE_MONTHS, currentStartDate = null) =>
        showPlanItemEditorModal('Goal', title, currentText, currentTimeline, DEFAULT_GOAL_TIMELINE_MONTHS, currentStartDate);

    // --- Drag and Drop Client Reordering (mouse events) ---
    let dragState = null; // { clientId, sourceListType, startY, element, ghost: null, threshold: false, dropListType, targetClientId, insertAfter }

    const getClientDragLists = () => [todaySessionsListEl, clientListEl].filter(Boolean);

    const clearClientDropIndicators = () => {
        getClientDragLists().forEach(listEl => {
            listEl.classList.remove('client-list-drop-target');
            listEl.querySelectorAll('.client-item').forEach(item => {
                item.classList.remove('drag-over-above', 'drag-over-below');
            });
        });
    };

    function cleanupDrag() {
        if (dragState) {
            dragState.element.classList.remove('dragging');
            if (dragState.ghost) {
                dragState.ghost.remove();
            }
        }
        document.body.style.cursor = '';
        document.body.classList.remove('dragging-active');
        clearClientDropIndicators();
        dragState = null;
        document.removeEventListener('mousemove', onDragMouseMove);
        document.removeEventListener('mouseup', onDragMouseUp);
    }

    function createDragGhost(sourceEl, x, y) {
        const ghost = sourceEl.cloneNode(true);
        const rect = sourceEl.getBoundingClientRect();
        ghost.className = 'client-item drag-ghost';
        ghost.style.width = rect.width + 'px';
        ghost.style.left = (x - rect.width / 2) + 'px';
        ghost.style.top = (y - rect.height / 2) + 'px';
        ghost.style.background = getComputedStyle(sourceEl).background;
        ghost.style.color = getComputedStyle(sourceEl).color;
        ghost.style.padding = getComputedStyle(sourceEl).padding;
        ghost.style.borderLeft = getComputedStyle(sourceEl).borderLeft;
        // Hide action buttons on ghost
        const btns = ghost.querySelector('.action-buttons');
        if (btns) btns.style.display = 'none';
        document.body.appendChild(ghost);
        return ghost;
    }

    function onDragMouseMove(e) {
        if (!dragState) return;
        const dy = Math.abs(e.clientY - dragState.startY);
        // Require 5px of movement before starting drag (avoids interfering with clicks)
        if (!dragState.threshold) {
            if (dy < 5) return;
            dragState.threshold = true;
            dragState.element.classList.add('dragging');
            dragState.ghost = createDragGhost(dragState.element, e.clientX, e.clientY);
            document.body.style.cursor = 'grabbing';
            document.body.classList.add('dragging-active');
        }
        e.preventDefault(); // prevent text selection while dragging
        // Move ghost
        if (dragState.ghost) {
            const ghostRect = dragState.ghost.getBoundingClientRect();
            dragState.ghost.style.left = (e.clientX - ghostRect.width / 2) + 'px';
            dragState.ghost.style.top = (e.clientY - ghostRect.height / 2) + 'px';
        }
        dragState.dropListType = null;
        dragState.targetClientId = null;
        dragState.insertAfter = false;
        clearClientDropIndicators();

        const items = document.querySelectorAll('#todaySessionsList .client-item, #clientList .client-item');
        for (const item of items) {
            if (item.dataset.clientId === dragState.clientId && item.dataset.listType === dragState.sourceListType) continue;
            const rect = item.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) continue;

            const midY = rect.top + rect.height / 2;
            dragState.insertAfter = e.clientY >= midY;
            dragState.dropListType = item.dataset.listType;
            dragState.targetClientId = item.dataset.clientId;
            item.classList.add(dragState.insertAfter ? 'drag-over-below' : 'drag-over-above');
            return;
        }

        for (const listEl of getClientDragLists()) {
            const rect = listEl.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) continue;

            listEl.classList.add('client-list-drop-target');
            dragState.dropListType = listEl.dataset.listType;
            const listItems = listEl.querySelectorAll('.client-item');
            if (listItems.length > 0) {
                const lastItem = listItems[listItems.length - 1];
                dragState.targetClientId = lastItem.dataset.clientId;
                dragState.insertAfter = true;
            }
            return;
        }
    }

    function onDragMouseUp(e) {
        if (!dragState) return;
        const { clientId: sourceId, sourceListType, threshold, dropListType, targetClientId, insertAfter } = dragState;
        cleanupDrag();

        if (!threshold || !dropListType) return;

        if (sourceListType === 'today' && dropListType === 'today') {
            const reorderedTodayIds = moveIdWithinArray(data.todaySessionClientIds || [], sourceId, targetClientId, insertAfter);
            data.todaySessionClientIds = reorderedTodayIds;
        } else if (sourceListType === 'main' && dropListType === 'main') {
            const reorderedMainIds = moveIdWithinArray(getMainBankClients().map(client => client.id), sourceId, targetClientId, insertAfter);
            reorderVisibleClientSlots(reorderedMainIds);
        } else if (sourceListType === 'main' && dropListType === 'today') {
            data.todaySessionClientIds = moveIdWithinArray(data.todaySessionClientIds || [], sourceId, targetClientId, insertAfter);
        } else if (sourceListType === 'today' && dropListType === 'main') {
            removeClientFromTodaySessions(sourceId);
            const reorderedMainIds = moveIdWithinArray(getMainBankClients().map(client => client.id), sourceId, targetClientId, insertAfter);
            reorderVisibleClientSlots(reorderedMainIds);
        } else {
            return;
        }

        markDirty();
        renderClients();
    }

    const handleClientDragStart = (e) => {
        const clientItem = e.target.closest('.client-item');
        // Don't initiate drag on row buttons
        if (!clientItem || e.target.closest('button')) return;
        dragState = {
            clientId: clientItem.dataset.clientId,
            sourceListType: clientItem.dataset.listType,
            startY: e.clientY,
            element: clientItem,
            threshold: false,
            ghost: null,
            dropListType: null,
            targetClientId: null,
            insertAfter: false
        };
        document.addEventListener('mousemove', onDragMouseMove);
        document.addEventListener('mouseup', onDragMouseUp);
    };

    clientListEl.addEventListener('mousedown', handleClientDragStart);
    todaySessionsListEl.addEventListener('mousedown', handleClientDragStart);

    appointmentListEl.addEventListener('click', (e) => {
         const appointmentItem = e.target.closest('.appointment-item');
         const intakeItem = e.target.closest('.intake-item');
         const noteItem = e.target.closest('.note-item');
         if (!appointmentItem && !noteItem && !intakeItem) {
             selectedAppointmentId = null;
             selectedNoteId = null;
             selectedIntakeId = null;
             fullRender();
             return;
         }

         if (intakeItem) {
            const intakeId = intakeItem.dataset.intakeId;
            const client = findClient(selectedClientId);
            if (!client) return;

            if (e.target.closest('.delete-btn')) {
                const intakeIndex = (client.intakeSessions || []).findIndex(i => i.id === intakeId);
                if (intakeIndex > -1 && confirm('Delete this intake session?')) {
                    const [removedIntake] = client.intakeSessions.splice(intakeIndex, 1);
                    deletedItems.intakes.push({ ...removedIntake, clientId: client.id });
                    if (selectedIntakeId === intakeId) selectedIntakeId = null;
                    markDirty();
                    fullRender();
                }
                return;
            }

            selectIntakeSession(intakeId);
            return;
         }

         if (noteItem) {
            const noteId = noteItem.dataset.noteId;
            const client = findClient(selectedClientId);
            if (!client) return;

            if (e.target.closest('.delete-btn')) {
                const noteIndex = (client.notes || []).findIndex(n => n.id === noteId);
                if (noteIndex > -1 && confirm('Delete this note?')) {
                    const [removedNote] = client.notes.splice(noteIndex, 1);
                    deletedItems.notes.push({ ...removedNote, clientId: client.id });
                    if (selectedNoteId === noteId) selectedNoteId = null;
                    markDirty();
                    fullRender();
                }
                return;
            }

            if (e.target.closest('.edit-btn')) {
                const note = findNote(client, noteId);
                if (!note) return;
                showRenameModal('Rename note', note.name).then(newName => {
                    if (newName && newName.trim() && newName.trim() !== note.name) {
                        note.name = newName.trim();
                        note.updatedAt = new Date().toISOString();
                        noteNameInput.value = note.name;
                        markDirty();
                        fullRender();
                    }
                });
                return;
            }

            selectNote(noteId);
            const selectedNote = findNote(client, noteId);
            noteNameInput.value = selectedNote?.name || '';
            return;
         }

         const appointmentId = appointmentItem.dataset.appointmentId;
         
         if (e.target.closest('.delete-btn')) {
            const client = findClient(selectedClientId);
            if (!client) return;
            const apptIndex = client.appointments.findIndex(a => a.id === appointmentId);
            if (apptIndex > -1) {
                const [appt] = client.appointments.splice(apptIndex, 1);
                deletedItems.appointments.push({ ...appt, clientId: client.id });
                if (selectedAppointmentId === appointmentId) {
                    selectedAppointmentId = null;
                }
                markDirty();
                fullRender();
            }
         } else {
             selectAppointment(appointmentId);
         }
    });
    
    updateAppointmentDateBtn.addEventListener('click', () => {
        const client = findClient(selectedClientId);
        const appointment = findAppointment(client, selectedAppointmentId);
        const newDateStr = appointmentDateInput.value;

        if (client && appointment && newDateStr) {
            const dateObj = new Date(newDateStr);
            const utcDate = new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate());
            appointment.date = utcDate.toISOString();
            markDirty();
            renderAppointments(); // Just re-render appointments to see the change
            alert('Appointment date updated.');
        } else {
            alert('Could not update date. Ensure a client, appointment, and date are selected.');
        }
    });

    deletedClientsListEl.addEventListener('click', e => {
        if (e.target.classList.contains('restore-btn')) {
            const id = e.target.dataset.id;
            const clientIndex = deletedItems.clients.findIndex(c => c.id === id);
            if (clientIndex === -1) return;
            const [client] = deletedItems.clients.splice(clientIndex, 1);
            data.clients.push(client);
            markDirty();
            fullRender();
        }
    });

    archivedClientsListEl.addEventListener('click', e => {
        if (e.target.classList.contains('restore-btn')) {
            const id = e.target.dataset.id;
            if (!data.archivedClients) return;
            const clientIndex = data.archivedClients.findIndex(c => c.id === id);
            if (clientIndex === -1) return;
            const [client] = data.archivedClients.splice(clientIndex, 1);
            data.clients.push(client);
            markDirty();
            fullRender();
        }
    });

    deletedAppointmentsListEl.addEventListener('click', e => {
         if (e.target.classList.contains('restore-btn')) {
            const id = e.target.dataset.id;
            const type = e.target.dataset.type || 'appointment';

            if (type === 'note') {
                const noteIndex = deletedItems.notes.findIndex(n => n.id === id);
                if (noteIndex === -1) return;

                const [note] = deletedItems.notes.splice(noteIndex, 1);
                const client = findClient(note.clientId);
                if (client) {
                    if (!client.notes) client.notes = [];
                    client.notes.push(note);
                    markDirty();
                    fullRender();
                } else {
                    deletedItems.notes.push(note);
                    alert('Cannot restore. Client not found.');
                }
                return;
            }

            const intakeIndex = deletedItems.intakes.findIndex(intake => intake.id === id);
            if (intakeIndex > -1) {
                const [intake] = deletedItems.intakes.splice(intakeIndex, 1);
                const client = findClient(intake.clientId);
                if (client) {
                    if (!Array.isArray(client.intakeSessions)) client.intakeSessions = [];
                    client.intakeSessions.push(intake);
                    markDirty();
                    fullRender();
                } else {
                    deletedItems.intakes.push(intake);
                    alert('Cannot restore. Client not found.');
                }
                return;
            }

            const apptIndex = deletedItems.appointments.findIndex(a => a.id === id);
            if (apptIndex === -1) return;

            const [appt] = deletedItems.appointments.splice(apptIndex, 1);
            const client = findClient(appt.clientId);
            if (client) {
                if (!client.appointments) client.appointments = [];
                client.appointments.push(appt);
                markDirty();
                fullRender();
            } else {
                deletedItems.appointments.push(appt);
                alert('Cannot restore. Client not found.');
            }
         }
    });
    
    clearDeletedClientsBtn.addEventListener('click', () => {
        if(confirm('Permanently delete all recently deleted clients?')) {
            deletedItems.clients = [];
            markDirty();
            fullRender();
        }
    });
    clearDeletedAppointmentsBtn.addEventListener('click', () => {
         if (!selectedClientId) return;
         if(confirm('Permanently delete all recently deleted appointments, notes, and intake sessions for this client?')) {
            deletedItems.appointments = deletedItems.appointments.filter(appt => appt.clientId !== selectedClientId);
            deletedItems.notes = deletedItems.notes.filter(note => note.clientId !== selectedClientId);
            deletedItems.intakes = deletedItems.intakes.filter(intake => intake.clientId !== selectedClientId);
            markDirty();
            fullRender();
        }
    });
    
    persistentNotesEl.addEventListener('input', () => {
         const client = findClient(selectedClientId);
         if (client) {
             client.persistentNotes = getRichNoteEditorValue(persistentNotesEl);
             markDirty();
         }
    });
    persistentNotesEl.addEventListener('keydown', handleRichNoteShortcut);
    nextSessionNotesEl.addEventListener('focus', () => {
        saveRichNoteSelection(nextSessionNotesEl);
        updateRichNoteToolbarState(nextSessionNotesEl);
    });
    persistentNotesEl.addEventListener('focus', () => {
        saveRichNoteSelection(persistentNotesEl);
        updateRichNoteToolbarState(persistentNotesEl);
    });
    [persistentNotesEl, nextSessionNotesEl].forEach(editor => {
        editor.addEventListener('mouseup', () => saveRichNoteSelection(editor));
        editor.addEventListener('keyup', () => {
            saveRichNoteSelection(editor);
            updateRichNoteToolbarState(editor);
        });
    });
    document.addEventListener('selectionchange', () => {
        const activeEditor = [persistentNotesEl, nextSessionNotesEl]
            .find(editor => document.activeElement === editor);
        if (activeEditor) {
            saveRichNoteSelection(activeEditor);
            updateRichNoteToolbarState(activeEditor);
        }
    });
    document.querySelectorAll('[data-rich-note-toolbar]').forEach(toolbar => {
        const editor = document.getElementById(toolbar.dataset.editorId);
        if (!editor) return;

        toolbar.addEventListener('mousedown', (event) => {
            const commandButton = event.target.closest('[data-rich-note-command]');
            if (commandButton) {
                saveRichNoteSelection(editor);
                event.preventDefault();
                return;
            }
            if (event.target.closest('[data-rich-note-color]')) {
                saveRichNoteSelection(editor);
            }
        });
        toolbar.addEventListener('click', (event) => {
            const commandButton = event.target.closest('[data-rich-note-command]');
            if (!commandButton) return;
            executeRichNoteCommand(editor, commandButton.dataset.richNoteCommand);
        });
        toolbar.querySelector('[data-rich-note-color]')?.addEventListener('change', (event) => {
            updateRichNoteColorSwatch(event.currentTarget);
            executeRichNoteCommand(editor, 'foreColor', event.currentTarget.value);
        });
    });
    updateRichNoteToolbarStates();
    addPhoneNumberBtn?.addEventListener('click', () => {
        addClientContactEntry('phones');
    });
    addEmailAddressBtn?.addEventListener('click', () => {
        addClientContactEntry('emails');
    });
    contactContentEl.addEventListener('input', (e) => {
        if (!e.target.matches('.client-contact-input')) return;
        const type = e.target.dataset.contactType;
        const index = parseInt(e.target.dataset.contactIndex || '-1', 10);
        if (!type || index < 0) return;
        const value = type === 'phones'
            ? formatClientPhoneInput(e.target.value)
            : e.target.value;
        if (e.target.value !== value) e.target.value = value;
        updateClientContactEntry(type, index, value);
        updateRenderedClientContactValidation(type, index, value);
    });
    contactContentEl.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('.client-contact-copy-btn');
        if (copyBtn) {
            const type = copyBtn.dataset.contactType;
            const index = parseInt(copyBtn.dataset.contactIndex || '-1', 10);
            if (!type || index < 0) return;
            void copyClientContactEntry(type, index, copyBtn);
            return;
        }
        const editBtn = e.target.closest('.client-contact-edit-btn');
        if (editBtn) {
            const type = editBtn.dataset.contactType;
            const index = parseInt(editBtn.dataset.contactIndex || '-1', 10);
            if (!type || index < 0) return;
            editClientContactEntry(type, index);
            return;
        }
        const lockBtn = e.target.closest('.client-contact-lock-btn');
        if (lockBtn) {
            const type = lockBtn.dataset.contactType;
            const index = parseInt(lockBtn.dataset.contactIndex || '-1', 10);
            if (!type || index < 0) return;
            setClientContactLock(type, index, true);
            return;
        }
        const removeBtn = e.target.closest('.client-contact-remove-btn');
        if (!removeBtn) return;
        const type = removeBtn.dataset.contactType;
        const index = parseInt(removeBtn.dataset.contactIndex || '-1', 10);
        if (!type || index < 0) return;
        removeClientContactEntry(type, index);
    });
    nextSessionNotesEl.addEventListener('input', () => {
         const client = findClient(selectedClientId);
         if (client) {
             client.nextSessionNotes = getRichNoteEditorValue(nextSessionNotesEl);
             markDirty();
         }
    });
    nextSessionNotesEl.addEventListener('keydown', handleRichNoteShortcut);
    clientDetailsTabBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeNotesTab = 'clientDetails';
        updateNotesTabUI();
    });
    contactTabBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeNotesTab = 'contact';
        updateNotesTabUI();
    });
    nextSessionTabBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeNotesTab = 'nextSession';
        updateNotesTabUI();
    });

    addDiagnosisBtn.addEventListener('click', addClientDiagnosis);
    clientDiagnosesListEl.addEventListener('input', (event) => {
        const input = event.target.closest?.('.client-diagnosis-input');
        if (input) {
            updateClientDiagnosis(input.dataset.diagnosisId, input.value);
            return;
        }
        const substantiation = event.target.closest?.('.client-diagnosis-substantiation');
        if (substantiation) {
            updateClientDiagnosisSubstantiation(substantiation.dataset.diagnosisId, substantiation.value);
        }
    });
    clientDiagnosesListEl.addEventListener('click', (event) => {
        const removeButton = event.target.closest?.('.remove-client-diagnosis-btn');
        if (!removeButton) return;
        removeClientDiagnosis(removeButton.dataset.diagnosisId);
    });
    clientPresentingProblemEl.addEventListener('input', () => {
        const client = findClient(selectedClientId);
        if (client) {
            client.presentingProblem = clientPresentingProblemEl.value;
            markDirty();
        }
    });

    const autoResizeTextarea = (el) => {
        // Only resize if the user hasn't manually resized it.
        // We check if the style.height is not set or is 'auto'.
        if (!el.style.height || el.style.height === 'auto') {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        }
    };

    const autoResizeObjectiveReviewEditor = (textarea) => {
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    };

    window.addEventListener('resize', () => {
        soapContentEl.querySelectorAll('.objective-review-editor').forEach(autoResizeObjectiveReviewEditor);
    });

    // --- Generic Bullet Point Handlers ---
    const formatBulletPoints = (text) => {
        if (Array.isArray(text)) {
            text = text.join('\n');
        }
        if (typeof text !== 'string') {
            text = String(text || '');
        }
        // Split text into individual bullet points and ensure each is on its own line
        let content = text.trim();
        if (!content) return '';
        
        // Replace any bullet points that are not at the start of a line
        content = content.replace(/([^\n])\s*•\s*/g, '$1\n• ');
        
        // Split into lines and process each one
        let lines = content.split('\n');
        let newLines = lines.map(line => {
            let trimmedLine = line.trim();
            if (trimmedLine.length > 0) {
                if (!trimmedLine.startsWith('•')) {
                    return '• ' + trimmedLine;
                } else {
                    // Ensure proper spacing after bullet
                    return trimmedLine.replace(/^•\s*/, '• ');
                }
            }
            return line; // Keep empty lines as-is
        });
        
        // Filter out consecutive empty lines but keep single empty lines
        let result = [];
        let lastWasEmpty = false;
        for (let line of newLines) {
            let isEmpty = line.trim().length === 0;
            if (!isEmpty || !lastWasEmpty) {
                result.push(line);
            }
            lastWasEmpty = isEmpty;
        }
        
        return result.join('\n');
    };

    const handleBulletedInput = (e, saveDataCallback) => {
        const textarea = e.target;

        const shouldAutoResize = textarea.id !== 'sessionInfo';
        if (shouldAutoResize) {
            textarea.style.height = 'auto';
        }
        
        // If textarea is empty or doesn't start with a bullet, add one
        if (textarea.value.length > 0 && !textarea.value.startsWith('•')) {
            const cursorPos = textarea.selectionStart;
            textarea.value = '• ' + textarea.value;
            textarea.selectionStart = textarea.selectionEnd = cursorPos + 2;
        }
        
        if (shouldAutoResize) {
            autoResizeTextarea(textarea);
        }

        // Save changes using the provided callback
        saveDataCallback(textarea, true);
    };
    
    const handleBulletedKeyDown = (e) => {
        const textarea = e.target;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;

        if (e.key === 'Enter') {
            e.preventDefault();
            
            const currentLineStart = text.lastIndexOf('\n', start - 1) + 1;
            const currentLine = text.substring(currentLineStart, start);
            const restOfLine = text.substring(start, text.indexOf('\n', start) === -1 ? text.length : text.indexOf('\n', start));

            // Check if current line is just bullet with optional spaces
            const isJustBullet = currentLine.match(/^•\s*$/);
            
            // NEW: Check if cursor is right after bullet+space with content following
            const hasBulletAndSpace = currentLine.match(/^•\s+$/);
            const hasContentAfter = restOfLine.trim() !== '';

            if (isJustBullet && !hasContentAfter) {
                // Empty bullet point line with nothing after - remove it
                textarea.value = text.substring(0, currentLineStart) + text.substring(end);
                textarea.selectionStart = textarea.selectionEnd = currentLineStart;
            } else if (currentLineStart === 0 && currentLine.trim() === '') {
                // At very beginning with no content - just add bullet
                textarea.value = '• ' + text.substring(end);
                textarea.selectionStart = textarea.selectionEnd = 2;
            } else if (hasBulletAndSpace && hasContentAfter) {
                // User is at "• |content" - insert new bullet above
                textarea.value = text.substring(0, currentLineStart) + '• \n' + text.substring(currentLineStart);
                textarea.selectionStart = textarea.selectionEnd = currentLineStart + 3;
            } else {
                // Normal case - create new line with bullet point
                textarea.value = text.substring(0, start) + '\n• ' + text.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 3;
            }
            
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            return;
        }

        if (e.key === 'Backspace' && start === end) {
            const currentLineStart = text.lastIndexOf('\n', start - 1) + 1;
            const lineText = text.substring(currentLineStart, start);
            
            if (lineText.trim() === '•' && start > 0) {
                e.preventDefault();
                const prevLineEnd = currentLineStart > 0 ? currentLineStart - 1 : 0;
                textarea.value = text.substring(0, prevLineEnd) + text.substring(start);
                textarea.selectionStart = textarea.selectionEnd = prevLineEnd;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    };

    // --- Specific Save Callbacks ---
    const saveSessionInfo = (textarea) => {
        const client = findClient(selectedClientId);
        const appointment = findAppointment(client, selectedAppointmentId);
        const note = findNote(client, selectedNoteId);
        if (appointment) {
            appointment.sessionInfo = textarea.value;
            delete appointment.auditCheck;
            markDirty();
        } else if (note) {
            note.sessionInfo = textarea.value;
            note.updatedAt = new Date().toISOString();
            markDirty();
        }
        updateGenerateNoteButtonState();
    };

    const saveGeneratedSoapSupport = (textarea) => {
        const client = findClient(selectedClientId);
        const appointment = findAppointment(client, selectedAppointmentId);
        if (!appointment) return;
        if (!appointment.soap) appointment.soap = { s: '', o: '', a: '', p: '' };
        const fieldKey = ({
            medicalNecessity: 'medicalNecessity',
            presentingProblem: 'presentingProblem',
            sessionFocus: 'sessionFocus'
        })[textarea.id] || 'diagnosticSupport';
        appointment.soap[fieldKey] = textarea.value;
        delete appointment.auditCheck;
        markDirty();
    };

    const saveSoapNote = (textarea, isManualEdit = true) => {
        const client = findClient(selectedClientId);
        const appointment = findAppointment(client, selectedAppointmentId);
        if (appointment) {
            if (!appointment.soap) appointment.soap = {s:'', o:'', a:'', p:''};
            
            if (textarea.id === 'interventions') {
                updateSoapInterventionsValue(appointment, textarea.value);
            } else {
                const key = textarea.id.slice(-1).toLowerCase();
                if (key === 'o') {
                    updateSoapFieldValue(appointment, key, textarea.value);
                } else {
                    appointment.soap[key] = textarea.value;
                }
                if (SOAP_SORT_SECTION_KEYS.includes(key) && isManualEdit) {
                    setSoapSectionOrderOverride(appointment.soap, key, true);
                }
            }
            delete appointment.auditCheck;
            markDirty();
        }
    };

    // --- Attach Bullet Point Handlers ---
    sessionInfoEl.addEventListener('input', (e) => {
        const client = findClient(selectedClientId);
        const appointment = findAppointment(client, selectedAppointmentId);
        if (appointment) {
            handleBulletedInput(e, saveSessionInfo);
        } else {
            saveSessionInfo(e.target);
        }
    });
    sessionInfoEl.addEventListener('keydown', (e) => {
        const client = findClient(selectedClientId);
        const appointment = findAppointment(client, selectedAppointmentId);
        if (appointment) {
            handleBulletedKeyDown(e);
        }
    });
    sessionInfoEl.addEventListener('focus', (e) => {
        const client = findClient(selectedClientId);
        const appointment = findAppointment(client, selectedAppointmentId);
        if (!appointment) return;
        const textarea = e.target;
        if (textarea.value.length === 0) {
            textarea.value = '• ';
            textarea.selectionStart = textarea.selectionEnd = 2;
        }
    });

    auditProofSymptomsEl.addEventListener('input', () => saveAuditProofingField('symptoms', auditProofSymptomsEl.value));
    auditProofFunctionalEl.addEventListener('input', () => saveAuditProofingField('functionalImpact', auditProofFunctionalEl.value));
    auditProofProgressEl.addEventListener('input', () => saveAuditProofingField('progressResponse', auditProofProgressEl.value));
    auditProofNecessityEl.addEventListener('input', () => saveAuditProofingField('medicalNecessity', auditProofNecessityEl.value));

    guidingModalitiesListEl.addEventListener('change', (e) => {
        if (!e.target.matches('.modality-select')) return;
        saveGuidingModalities();
    });
    guidingModalitiesListEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-modality-btn')) {
            goalGeneratorModalities.push(DEFAULT_GUIDING_MODALITIES[0]);
            renderGuidingModalities();
            return;
        }
        if (e.target.classList.contains('remove-modality-btn')) {
            if (goalGeneratorModalities.length <= 1) return;
            const row = e.target.closest('.modality-row');
            const index = row ? parseInt(row.dataset.modalityIndex, 10) : -1;
            if (index >= 0) {
                goalGeneratorModalities.splice(index, 1);
                if (!goalGeneratorModalities.includes('Other (Specify)')) {
                    goalGeneratorModalityOther = '';
                }
                renderGuidingModalities();
            }
        }
    });
    guidingModalityOtherEl.addEventListener('input', () => {
        goalGeneratorModalityOther = guidingModalityOtherEl.value;
        saveClientGoalGenerationLens();
    });

    intakeFieldsContainerEl.addEventListener('input', (e) => {
        if (!e.target.matches('.intake-field-input')) return;

        const client = findClient(selectedClientId);
        const intakeSession = findIntakeSession(client, selectedIntakeId);
        if (!intakeSession) return;

        if (!intakeSession.fields || typeof intakeSession.fields !== 'object') {
            intakeSession.fields = {};
        }

        intakeSession.fields[e.target.dataset.intakeKey] = e.target.value;
        markDirty();
    });

    copyIntakeSessionBtn.addEventListener('click', async () => {
        const client = findClient(selectedClientId);
        const intakeSession = findIntakeSession(client, selectedIntakeId);
        const text = formatIntakeSessionForCopy(intakeSession);
        if (!text) {
            alert('Enter intake information before copying.');
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            const originalText = copyIntakeSessionBtn.textContent;
            copyIntakeSessionBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyIntakeSessionBtn.textContent = originalText;
            }, 2000);
        } catch (error) {
            console.error('Failed to copy intake session:', error);
            alert('Could not copy the intake session to the clipboard.');
        }
    });

    soapContentEl.addEventListener('input', (e) => {
        if (e.target.matches('.objective-review-editor')) {
            autoResizeObjectiveReviewEditor(e.target);
            const client = findClient(selectedClientId);
            const appointment = findAppointment(client, selectedAppointmentId);
            const review = getObjectiveRedundancyReview(appointment);
            if (!review || (e.target.dataset.reviewId && e.target.dataset.reviewId !== review.reviewId)) return;
            if (e.target.matches('.objective-manual-note-editor')) {
                review.manualObjectiveNote = String(e.target.value || '').replace(/\s*\n+\s*/g, ' ').trim();
                markDirty();
                return;
            }
            const itemIndex = Number.parseInt(e.target.dataset.itemIndex, 10);
            const item = getObjectiveRedundancyItemsForReview(review)[itemIndex];
            if (!item) return;
            item.editedText = String(e.target.value || '').replace(/\s*\n+\s*/g, ' ').trim();
            markDirty();
            return;
        }
        if (e.target.matches('.soap-textarea')) {
            if (e.target.id === 'diagnosticSupport' || e.target.id === 'medicalNecessity' || e.target.id === 'presentingProblem' || e.target.id === 'sessionFocus') {
                saveGeneratedSoapSupport(e.target);
                return;
            }
            handleBulletedInput(e, saveSoapNote);
            if (e.target.id === 'soapO') {
                const generateInterventionsBtn = document.getElementById('generateInterventionsBtn');
                if (generateInterventionsBtn) {
                    generateInterventionsBtn.disabled = !e.target.value.trim();
                }
                const client = findClient(selectedClientId);
                refreshObjectiveActionButtons(findAppointment(client, selectedAppointmentId));
            }
        }
    });
    soapContentEl.addEventListener('keydown', (e) => {
        if (e.target.matches('.soap-textarea')) {
            if (e.target.id !== 'diagnosticSupport' && e.target.id !== 'medicalNecessity' && e.target.id !== 'presentingProblem' && e.target.id !== 'sessionFocus') {
                handleBulletedKeyDown(e);
            }
        }
    });
    soapContentEl.addEventListener('focus', (e) => {
        if (e.target.matches('.soap-textarea')) {
            if (e.target.id === 'diagnosticSupport' || e.target.id === 'medicalNecessity' || e.target.id === 'presentingProblem' || e.target.id === 'sessionFocus') return;
            const textarea = e.target;
            if (textarea.value.length === 0) {
                textarea.value = '• ';
                textarea.selectionStart = textarea.selectionEnd = 2;
            }
        }
    });
    soapContentEl.addEventListener('change', (e) => {
        if (!e.target.matches('.objective-redundancy-checkbox')) return;
        const client = findClient(selectedClientId);
        const appointment = findAppointment(client, selectedAppointmentId);
        const review = getObjectiveRedundancyReview(appointment);
        const itemIndex = Number.parseInt(e.target.dataset.itemIndex, 10);
        if (!review || (e.target.dataset.reviewId && e.target.dataset.reviewId !== review.reviewId)
            || !setObjectiveRedundancyItemSelected(review, itemIndex, e.target.checked)) return;
        // Older saved reviews can display the same item in multiple groups.
        soapContentEl.querySelectorAll('.objective-redundancy-checkbox').forEach(checkbox => {
            if (Number.parseInt(checkbox.dataset.itemIndex, 10) === itemIndex) checkbox.checked = e.target.checked;
        });
        markDirty();
    });
    soapContentEl.addEventListener('click', (e) => {
         const clickedButton = e.target.closest?.('button');
         if (clickedButton?.id === 'approveObjectiveRedundancyBtn') {
             const client = findClient(selectedClientId);
             const appointment = findAppointment(client, selectedAppointmentId);
             const review = getObjectiveRedundancyReview(appointment);
             if (!review) {
                 alert('These Objective options are out of date. Regenerate the note review before approving.');
                 renderSoap();
                 return;
             }
             if (!applyObjectiveRedundancyDecision(appointment, review, client)) return;
             markDirty();
             void organizeObjectiveContent();
             return;
         }
         if (clickedButton?.id === 'dismissObjectiveRedundancyBtn') {
             const client = findClient(selectedClientId);
             const appointment = findAppointment(client, selectedAppointmentId);
             const review = getObjectiveRedundancyReview(appointment);
             if (!appointment?.soap || !review) return;
             if (!confirm('Dismiss all Objective review options? The current Objective text will remain unchanged.')) return;
             appointment.soap.o_suggestion = [];
             delete appointment.soap.objectiveRedundancyReview;
             refreshObjectiveSuggestionInterventionMatches(appointment, client);
             markDirty();
             renderSoap();
             return;
         }
         if (clickedButton?.id === 'runSoapAuditBtn') {
             const client = findClient(selectedClientId);
             const appointment = findAppointment(client, selectedAppointmentId);
             if (!client || !appointment) {
                alert('Select an appointment before running an audit check.');
                return;
             }
             appointment.auditCheck = runSoapAuditCheck(client, appointment);
             markDirty();
             renderSoap();
             return;
         }
         if (e.target.classList.contains('audit-manual-check')) {
             const client = findClient(selectedClientId);
             const appointment = findAppointment(client, selectedAppointmentId);
             if (!appointment || !appointment.auditCheck) return;
             if (!appointment.auditCheck.manualOverrides || typeof appointment.auditCheck.manualOverrides !== 'object') {
                 appointment.auditCheck.manualOverrides = {};
             }
             appointment.auditCheck.manualOverrides[e.target.dataset.checkLabel] = e.target.checked;
             markDirty();
             renderSoap();
             return;
         }
         if (clickedButton?.id === 'refreshDiagnosticSupportBtn') {
             void refreshDiagnosticSupport();
             return;
         }
         if (clickedButton?.id === 'refreshPresentingProblemBtn' || clickedButton?.id === 'refreshSessionFocusBtn') {
             void refreshSessionFocus();
             return;
         }
         if (clickedButton?.id === 'refreshMedicalNecessityBtn') {
             void refreshMedicalNecessity();
             return;
         }
         if (clickedButton?.id === 'selectInterventionsBtn') {
             const client = findClient(selectedClientId);
             const appointment = findAppointment(client, selectedAppointmentId);
             if (!appointment) return;
             renderInterventionPicker();
             interventionPickerModal.classList.remove('hidden');
             return;
         }
         if (clickedButton?.classList.contains('soap-treatment-plan-copy-btn')) {
             const goalId = clickedButton.dataset.goalId || '';
             const objectiveId = clickedButton.dataset.objectiveId || '';
             void copyPlanItem(goalId, objectiveId || null, clickedButton);
             return;
         }
         const copyButton = clickedButton?.classList.contains('copy-btn') ? clickedButton : null;
         if (copyButton) {
             const targetId = copyButton.dataset.target;
             if (!targetId) return;
             const textarea = document.getElementById(targetId);
             if (!textarea) return;
             navigator.clipboard.writeText(textarea.value).then(() => {
                 const originalHtml = copyButton.innerHTML;
                 const originalLabel = copyButton.getAttribute('aria-label') || `Copy ${targetId}`;
                 copyButton.innerHTML = SOAP_ICON_SVGS.check;
                 copyButton.title = 'Copied';
                 copyButton.setAttribute('aria-label', `${originalLabel} (copied)`);
                 setTimeout(() => {
                     if (!copyButton.isConnected) return;
                     copyButton.innerHTML = originalHtml;
                     copyButton.title = originalLabel;
                     copyButton.setAttribute('aria-label', originalLabel);
                 }, 2000);
             }).catch(err => {
                 console.error('Failed to copy text: ', err);
                 alert('Could not copy text to clipboard.');
             });
         }
         if (e.target.classList.contains('suggestion-accept')) {
            handleSuggestion(e.target, true);
         }
         if (e.target.classList.contains('suggestion-accept-replace')) {
            handleSuggestion(e.target, true);
         }
         if (e.target.classList.contains('suggestion-decline')) {
            handleSuggestion(e.target, false);
         }
              if (e.target.classList.contains('suggestion-close')) {
                  handleSuggestion(e.target, false, true);
              }
    });

        const handleSuggestion = (button, isAccepted, skipAppend = false) => {
        const suggestionBox = button.closest('.suggestion-box');
        const type = suggestionBox.dataset.suggestionType;
        const index = parseInt(suggestionBox.dataset.suggestionIndex, 10);
        const client = findClient(selectedClientId);
        const appointment = findAppointment(client, selectedAppointmentId);

        if (!appointment || !appointment.soap) return;

        const soapPanelContent = document.getElementById('soapContent');
        const scrollTop = soapPanelContent.scrollTop;

        const suggestionKey = `${type}_suggestion`;
        const suggestionData = appointment.soap[suggestionKey]?.[index];
        if (!suggestionData) return;
        const sectionKey = type.toLowerCase();
        const previousRedundancyReview = getObjectiveRedundancyReview(appointment);

        const textarea = document.getElementById(`soap${type.toUpperCase()}`);
        const sectionViewportOffset = textarea
            ? textarea.offsetTop - soapPanelContent.scrollTop
            : null;
        const isReplacement = typeof suggestionData === 'object' && suggestionData.original && suggestionData.suggested;
        let textToAdd = '';

        if (!skipAppend) {
            if (isAccepted) {
                if (isReplacement) {
                    // User clicked "Use Suggestion"
                    textToAdd = suggestionData.suggested;
                } else {
                    // User clicked "Accept" for a new suggestion (string)
                    textToAdd = suggestionData;
                }
            } else { // Declined
                if (isReplacement) {
                    // User clicked "Keep Original"
                    textToAdd = suggestionData.original;
                }
                // If it's a new suggestion (string) and user clicks decline, textToAdd remains empty, which is correct.
            }
        }

        if (textToAdd) {
            if (sectionKey === 'o') textToAdd = normalizeObjectiveLine(textToAdd);
            const currentText = textarea.value.trim();
            // Ensure the text to add is a proper bullet point.
            const newText = `• ${textToAdd.replace(/^•\s*/, '')}`;

            if (currentText.length === 0 || currentText === '•') {
                textarea.value = newText;
            } else {
                textarea.value = `${currentText}\n${newText}`;
            }
            
            // Manually update the data model since we're not dispatching the 'input' event before re-rendering
            if (sectionKey === 'o') {
                updateSoapFieldValue(appointment, sectionKey, textarea.value);
            } else {
                appointment.soap[sectionKey] = textarea.value;
            }
        }

        // Remove the suggestion that was just handled.
        if (Array.isArray(appointment.soap[suggestionKey])) {
            appointment.soap[suggestionKey].splice(index, 1);
        }
        if (isAccepted && textToAdd && !skipAppend && SOAP_SORT_SECTION_KEYS.includes(sectionKey)) {
            const overrides = ensureSoapSectionOrderOverrides(appointment.soap);
            const skipSections = new Set(SOAP_SORT_SECTION_KEYS.filter(key => overrides[key]));
            if (!isSoapSectionOrderOverridden(appointment.soap, sectionKey)) {
                alignSoapSectionsByObjectiveOrder(appointment.soap, { skipSections });
            }
        }
        reconcileObjectiveRedundancyReview(appointment, previousRedundancyReview);
        refreshObjectiveSuggestionInterventionMatches(appointment, client);
        markDirty();
        renderSoap();

        requestAnimationFrame(() => {
            const rerenderedTextarea = document.getElementById(`soap${type.toUpperCase()}`);
            if (rerenderedTextarea && sectionViewportOffset !== null) {
                soapPanelContent.scrollTop = Math.max(0, rerenderedTextarea.offsetTop - sectionViewportOffset);
                return;
            }
            soapPanelContent.scrollTop = scrollTop;
        });
    };


    const normalizeSoapPlatforms = () => {
        const normalized = normalizeSoapPlatformList(data.soapPlatforms);
        data.soapPlatforms = normalized.platforms;
        return normalized.changed;
    };

    const getSoapPlatformById = (platformId) => findSoapPlatformById(data.soapPlatforms, platformId);
    const getClientSoapPlatform = (client) => findClientSoapPlatform(data.soapPlatforms, client);
    const getDefaultSoapPlatformId = () => findDefaultSoapPlatformId(data.soapPlatforms);
    const getSoapPlatformSectionKeys = (client, useDefaultWhenUnassigned = true) =>
        getSoapPlatformSectionKeysFromList(data.soapPlatforms, client, useDefaultWhenUnassigned);
    const isSoapPlatformSectionEnabled = (client, sectionKey) =>
        isSoapPlatformSectionEnabledInList(data.soapPlatforms, client, sectionKey);
    const getSoapPlatformSectionDefinition = (sectionKey) => getSoapPlatformSectionDefinitionByKey(sectionKey);
    const getSoapPlatformSectionKeysForAppointment = (client, appointment) =>
        getSoapPlatformSectionKeysForAppointmentFromList(data.soapPlatforms, client, appointment);
    const captureSoapPlatformSnapshot = (appointment, client) => {
        const platform = getClientSoapPlatform(client);
        if (appointment && platform) appointment.soapPlatformSnapshot = createSoapPlatformSnapshot(platform);
    };

    const getActiveSoapPlatform = () => getSoapPlatformById(activeSoapPlatformId);

    const reorderSoapPlatformSections = (platform, draggedKey, targetKey) => {
        if (!platform || !draggedKey || !targetKey || draggedKey === targetKey) return false;
        const fromIndex = platform.sections.findIndex(item => item.key === draggedKey);
        const toIndex = platform.sections.findIndex(item => item.key === targetKey);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return false;
        const [movedSection] = platform.sections.splice(fromIndex, 1);
        platform.sections.splice(platform.sections.findIndex(item => item.key === targetKey), 0, movedSection);
        markDirty();
        renderSoapPlatformConfiguration();
        renderSoap();
        return true;
    };

    const renderClientSoapPlatformOptions = (selectedId = null) => {
        if (!clientSoapPlatformSelect) return;
        const requestedId = selectedId === null ? clientSoapPlatformSelect.value || '' : selectedId;
        clientSoapPlatformSelect.innerHTML = '';

        const unassignedOption = document.createElement('option');
        unassignedOption.value = '';
        unassignedOption.textContent = 'Select a SOAP platform (required)';
        clientSoapPlatformSelect.appendChild(unassignedOption);

        (data.soapPlatforms || []).forEach(platform => {
            const option = document.createElement('option');
            option.value = platform.id;
            option.textContent = platform.name;
            clientSoapPlatformSelect.appendChild(option);
        });

        clientSoapPlatformSelect.value = getSoapPlatformById(requestedId)?.id || '';
    };

    const renderSoapPlatformConfiguration = () => {
        const normalized = normalizeSoapPlatforms();
        if (normalized) markDirty();
        if (!getSoapPlatformById(activeSoapPlatformId)) {
            activeSoapPlatformId = getDefaultSoapPlatformId();
        }

        const activePlatform = getActiveSoapPlatform();
        if (!activePlatform) return;

        soapPlatformSelect.innerHTML = '';
        (data.soapPlatforms || []).forEach(platform => {
            const option = document.createElement('option');
            option.value = platform.id;
            option.textContent = platform.name;
            soapPlatformSelect.appendChild(option);
        });
        soapPlatformSelect.value = activePlatform.id;
        soapPlatformNameInput.value = activePlatform.name;
        deleteSoapPlatformBtn.disabled = (data.soapPlatforms || []).length <= 1;

        soapPlatformSectionsList.innerHTML = '';
        activePlatform.sections.forEach(section => {
            const definition = getSoapPlatformSectionDefinition(section.key);
            if (!definition) return;

            const row = document.createElement('div');
            row.className = `soap-config-section-row${section.enabled ? '' : ' is-disabled'}`;
            row.draggable = true;
            row.dataset.sectionKey = section.key;

            const dragHandle = document.createElement('span');
            dragHandle.className = 'soap-config-drag-handle';
            dragHandle.textContent = '⋮⋮';
            dragHandle.setAttribute('aria-hidden', 'true');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = section.enabled;
            checkbox.className = 'soap-config-section-toggle';
            checkbox.setAttribute('aria-label', `Enable ${definition.label}`);
            checkbox.addEventListener('change', () => {
                section.enabled = checkbox.checked;
                row.classList.toggle('is-disabled', !section.enabled);
                markDirty();
                renderSoap();
            });

            const textWrap = document.createElement('div');
            textWrap.className = 'soap-config-section-label';
            const label = document.createElement('strong');
            label.textContent = definition.label;
            const description = document.createElement('span');
            description.className = 'soap-config-section-description';
            description.textContent = definition.description;
            textWrap.append(label, description);

            row.append(dragHandle, checkbox, textWrap);
            row.addEventListener('dragstart', event => {
                draggedSoapPlatformSectionKey = section.key;
                row.classList.add('dragging');
                if (event.dataTransfer) {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', section.key);
                }
            });
            row.addEventListener('dragend', () => {
                draggedSoapPlatformSectionKey = null;
                row.classList.remove('dragging');
                soapPlatformSectionsList.querySelectorAll('.drop-target').forEach(target => target.classList.remove('drop-target'));
            });
            row.addEventListener('dragover', event => {
                event.preventDefault();
                if (draggedSoapPlatformSectionKey && draggedSoapPlatformSectionKey !== section.key) {
                    row.classList.add('drop-target');
                }
            });
            row.addEventListener('dragleave', event => {
                if (!row.contains(event.relatedTarget)) row.classList.remove('drop-target');
            });
            row.addEventListener('drop', event => {
                event.preventDefault();
                const draggedKey = draggedSoapPlatformSectionKey || event.dataTransfer?.getData('text/plain');
                if (!draggedKey || draggedKey === section.key) return;
                reorderSoapPlatformSections(activePlatform, draggedKey, section.key);
            });
            row.addEventListener('pointerdown', event => {
                if (!event.isPrimary || event.button !== 0 || event.target.closest?.('input, button')) return;
                event.preventDefault();
                soapPlatformPointerDragState = {
                    platformId: activePlatform.id,
                    draggedKey: section.key,
                    pointerId: event.pointerId,
                    row,
                    startX: event.clientX,
                    startY: event.clientY,
                    active: false,
                    targetKey: null
                };
                row.setPointerCapture?.(event.pointerId);
            });
            row.addEventListener('pointermove', event => {
                const dragState = soapPlatformPointerDragState;
                if (!dragState || dragState.pointerId !== event.pointerId || dragState.row !== row) return;
                const distance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
                if (!dragState.active && distance < 4) return;
                dragState.active = true;
                row.classList.add('dragging');
                soapPlatformSectionsList.querySelectorAll('.drop-target').forEach(target => target.classList.remove('drop-target'));
                const targetRow = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.soap-config-section-row');
                if (targetRow && soapPlatformSectionsList.contains(targetRow) && targetRow.dataset.sectionKey !== dragState.draggedKey) {
                    dragState.targetKey = targetRow.dataset.sectionKey;
                    targetRow.classList.add('drop-target');
                } else {
                    dragState.targetKey = null;
                }
            });
            const finishPointerDrag = event => {
                const dragState = soapPlatformPointerDragState;
                if (!dragState || dragState.pointerId !== event.pointerId || dragState.row !== row) return;
                row.releasePointerCapture?.(event.pointerId);
                soapPlatformPointerDragState = null;
                row.classList.remove('dragging');
                soapPlatformSectionsList.querySelectorAll('.drop-target').forEach(target => target.classList.remove('drop-target'));
                if (!dragState.active || !dragState.targetKey) return;
                const platform = getSoapPlatformById(dragState.platformId);
                reorderSoapPlatformSections(platform, dragState.draggedKey, dragState.targetKey);
            };
            row.addEventListener('pointerup', finishPointerDrag);
            row.addEventListener('pointercancel', finishPointerDrag);
            soapPlatformSectionsList.appendChild(row);
        });
    };

    const createSoapPlatformId = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return `soap-platform-${crypto.randomUUID()}`;
        }
        return `soap-platform-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    };

    let systemPrompt = DEFAULT_SOAP_SYSTEM_PROMPT;
    goalGenerationSystemPrompt = DEFAULT_GOAL_GENERATION_SYSTEM_PROMPT;

    const generateSoapNote = async () => {
        if (selectedNoteId || selectedIntakeId) {
            alert('SOAP note generation is only available for appointments, not Notes or Intake Sessions.');
            return;
        }
        const client = findClient(selectedClientId);
        if (!client) {
            alert('Select a client and complete the required SOAP assignments in Instructions before generating a SOAP note.');
            return;
        }
        const missingSoapRequirements = getMissingSoapClientRequirements(client);
        if (missingSoapRequirements.length > 0) {
            alert(getSoapGenerationRequirementMessage(missingSoapRequirements));
            return;
        }
        if (!selectedModel) {
            alert('Please connect to a provider and select a model in Settings.');
            return;
        }
        const taskKey = getAppointmentTaskKey(client.id, selectedAppointmentId);
        if (soapNoteGenerationInFlight.has(taskKey)
            || objectiveOrganizationInFlight.has(taskKey)
            || objectiveReviewPreparationInFlight.has(taskKey)) return;
        soapNoteGenerationInFlight.add(taskKey);
        updateGenerateNoteButtonState();

        try {
            if (apiProvider === 'openwebui') {
                await generateSoapNoteWithOpenWebUI();
            } else if (apiProvider === 'vertex') {
                await generateSoapNoteWithVertex();
            } else if (apiProvider === 'openai') {
                await generateSoapNoteWithOpenAI();
            } else if (apiProvider === 'ollama') {
                await generateSoapNoteWithOllama();
            } else {
                alert('Invalid API provider selected.');
            }
        } finally {
            soapNoteGenerationInFlight.delete(taskKey);
            updateGenerateNoteButtonState();
        }
    };
    
    const processAndStoreSoapData = (soapData, appointment, client = null) => {
        soapData = normalizeCoupleCollectiveReferences(soapData, client);
         if (!appointment.soap) appointment.soap = {};
        captureSoapPlatformSnapshot(appointment, client);
          delete appointment.auditCheck;
          const auditProofing = getAuditProofingData(appointment);
        const previousObjectiveText = String(appointment.soap.o || '');

        // Support fields and intervention matches are deliberately generated only after
        // the clinician completes Objective and presses Organize. Clear stale generated
        // values when a new core SOAP note replaces the current one.
        appointment.soap.supportFieldsVersion = 2;
        appointment.soap.clientPresentingProblem = String(client?.presentingProblem || '');
        delete appointment.soap.diagnosticSupport;
        delete appointment.soap.medicalNecessity;
        delete appointment.soap.presentingProblem;
        delete appointment.soap.sessionFocus;
        delete appointment.soap.objectiveRedundancyReview;
        appointment.soap.objectiveInterventionMatches = [];
        const objectiveActionState = ensureSoapObjectiveActionState(appointment);
        objectiveActionState.organizedRevision = null;
        objectiveActionState.readObjectiveRevision = null;
        objectiveActionState.readInterventionsRevision = null;

          ensureSoapSectionOrderOverrides(appointment.soap);
          SOAP_SORT_SECTION_KEYS.forEach(sectionKey => setSoapSectionOrderOverride(appointment.soap, sectionKey, false));

         ['s', 'o', 'a', 'p'].forEach(key => {
             const suggestionKey = `${key}_suggestion`;
             let suggestions = soapData[suggestionKey] || [];
             let fullText = soapData[key] ? formatBulletPoints(soapData[key]) : '';

             if (key === 'o') {
                 fullText = normalizeObjectiveSection(fullText);
                 suggestions = normalizeObjectiveSuggestions(suggestions);
             }

             const suggestionComparisonTexts = getSuggestionComparisonTexts(suggestions);

             // FIXED: Only add content that's NOT part of suggestions
             // All suggestion content (both replacements and new additions) should be presented for user approval
             if (suggestions.length === 0) {
                 // No suggestions - use all the generated content
                 appointment.soap[key] = fullText;
             } else {
                 // Split the full generated text into bullet points
                 const allBulletPoints = fullText.split('\n').map(line => line.trim()).filter(line => line !== '');

                 // Only include bullet points that are NOT part of any pending suggestion
                 const immediateTextPoints = allBulletPoints.filter(point => {
                     const trimmedPoint = normalizeSuggestionComparableText(point);
                     return !suggestionComparisonTexts.some(suggestionText => suggestionText === trimmedPoint);
                 });

                 appointment.soap[key] = immediateTextPoints.join('\n');
             }

            if (key === 's') {
                // Symptoms belong in Subjective
                if (!hasPendingSuggestionForText(suggestions, auditProofing.symptoms)) {
                    appointment.soap[key] = appendAuditFieldToSection(appointment.soap[key], 'Symptom Pattern / Severity Context', auditProofing.symptoms);
                }
            }
            if (key === 'a') {
                // Functional Impact and progress belong in Assessment; Medical Necessity has its own box.
                if (!hasPendingSuggestionForText(suggestions, auditProofing.functionalImpact)) {
                    appointment.soap[key] = appendAuditFieldToSection(appointment.soap[key], 'Functional Impact', auditProofing.functionalImpact);
                }
                if (!hasPendingSuggestionForText(suggestions, auditProofing.progressResponse)) {
                    appointment.soap[key] = appendAuditFieldToSection(appointment.soap[key], 'Progress / Response to Treatment', auditProofing.progressResponse);
                }
            }
             
             // Always store the full list of suggestions for user approval
             appointment.soap[suggestionKey] = suggestions;
         });

         alignSoapSectionsByObjectiveOrder(appointment.soap);

         refreshObjectiveSuggestionInterventionMatches(appointment, client);
        if (previousObjectiveText !== String(appointment.soap.o || '')) {
            const actionState = ensureSoapObjectiveActionState(appointment);
            actionState.objectiveRevision += 1;
        }
     };

    const completeGeneratedSoapNote = async (soapData, appointment, client) => {
        processAndStoreSoapData(soapData, appointment, client);
        const taskKey = getAppointmentTaskKey(client?.id, appointment?.id);
        objectiveReviewPreparationInFlight.add(taskKey);
        const appointmentContext = { clientId: client?.id, appointmentId: appointment?.id, appointment };
        try {
            if (isCurrentAppointmentContext(appointmentContext)) renderSoap();
            await prepareObjectiveRedundancyReview(appointment, client);
        } catch (error) {
            console.warn('Objective topic grouping failed; using local topic groups.', error);
            const reviewData = buildObjectiveRedundancyReviewData(appointment);
            if (reviewData.items.length > 0) {
                const groups = limitObjectiveReviewDefaults(completeObjectiveTopicGroups(reviewData.items, []));
                appointment.soap.objectiveRedundancyReview = {
                    reviewId: `objective-review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    ...reviewData,
                    selectedItemIndexes: [...new Set(groups.flatMap(group => group.selectedItemIndexes || []))],
                    groups,
                    manualObjectiveNote: ''
                };
            }
        } finally {
            objectiveReviewPreparationInFlight.delete(taskKey);
        }
        markDirty();
        if (isCurrentAppointmentContext(appointmentContext)) renderSoap();
    };

    const applyObjectiveRedundancyDecision = (appointment, review, client = null) => {
        if (!appointment?.soap || !review) return false;
        syncObjectiveRedundancySelectionsFromDom(review);
        const decision = getObjectiveRedundancyDecision(review);
        if (decision.selectedEmptyCount > 0) {
            alert('Each checked option needs text. Add text or uncheck the empty option before approving.');
            return false;
        }
        if (decision.objectiveItems.length === 0) {
            alert('Check at least one option or add an Objective note before approving.');
            return false;
        }

        updateSoapFieldValue(appointment, 'o', joinSoapBulletItems(decision.objectiveItems));
        appointment.soap.o_suggestion = [];
        delete appointment.soap.objectiveRedundancyReview;
        refreshObjectiveSuggestionInterventionMatches(appointment, client);
        return true;
    };

    const organizeObjectiveContent = async () => {
        const appointmentContext = getSelectedAppointmentContext();
        const appointment = getAppointmentFromContext(appointmentContext);
        if (!appointment) return;
        const client = findClient(appointmentContext.clientId);
        const taskKey = getAppointmentTaskKey(appointmentContext.clientId, appointmentContext.appointmentId);
        if (objectiveOrganizationInFlight.has(taskKey)
            || soapNoteGenerationInFlight.has(taskKey)
            || objectiveReviewPreparationInFlight.has(taskKey)) return;

        let objectiveText = (appointment.soap?.o || '').trim();
        let objectiveItems = splitSoapBulletItems(objectiveText);
        const pendingRedundancyReview = getObjectiveRedundancyReview(appointment);
        let pendingRedundancyDecision = null;
        if (pendingRedundancyReview) {
            syncObjectiveRedundancySelectionsFromDom(pendingRedundancyReview);
            pendingRedundancyDecision = getObjectiveRedundancyDecision(pendingRedundancyReview);
            if (pendingRedundancyDecision.selectedEmptyCount > 0) {
                alert('Each checked option needs text. Add text or uncheck the empty option before approving.');
                return;
            }
            if (pendingRedundancyDecision.objectiveItems.length === 0) {
                alert('Check at least one option or add an Objective note before approving.');
                return;
            }
            objectiveItems = pendingRedundancyDecision.objectiveItems;
            objectiveText = joinSoapBulletItems(objectiveItems);
        }
        if (objectiveItems.length === 0) {
            alert('Please add Objective content before approving.');
            return;
        }
        objectiveOrganizationInFlight.add(taskKey);

        const approveObjectiveRedundancyBtn = document.getElementById('approveObjectiveRedundancyBtn');
        if (approveObjectiveRedundancyBtn?.isConnected && isCurrentAppointmentContext(appointmentContext)) {
            approveObjectiveRedundancyBtn.disabled = true;
            setSoapActionButtonContent(approveObjectiveRedundancyBtn, 'Organizing', false, true);
        }
        const objectiveRedundancyReview = document.getElementById('objectiveRedundancyReview');
        objectiveRedundancyReview?.querySelectorAll('input, textarea, button').forEach(control => {
            control.disabled = true;
        });
        if (isCurrentAppointmentContext(appointmentContext)) setSoapPostObjectiveProcessingState(true);

        const supportErrors = [];
        try {
            let organizedObjective;
            try {
                organizedObjective = await fetchOrganizedObjectiveFromAI(objectiveText);
            } catch (error) {
                console.warn('Objective organization AI failed; falling back to local topic grouping.', error);
                organizedObjective = organizeObjectiveContentLocally(objectiveText);
            }

            updateSoapFieldValue(appointment, 'o', organizedObjective || objectiveText);
            appointment.soap.o_suggestion = [];
            delete appointment.soap.objectiveRedundancyReview;
            delete appointment.soap.o_suggestion_intervention_matches;
            setSoapSectionOrderOverride(appointment.soap, 'o', true);
            markObjectiveOrganizeCompleted(appointment);
            delete appointment.auditCheck;
            markDirty();
            const interventionsEnabled = isSoapPlatformSectionEnabled(client, 'interventions');
            if (interventionsEnabled) {
                await generateObjectiveInterventions({
                    objectiveTextOverride: appointment.soap.o,
                    appointmentContext,
                    renderAfter: false,
                    suppressEmptyAlert: true
                });
            } else {
                appointment.soap.objectiveInterventionMatches = [];
                appointment.soap.interventions = '';
            }

            const diagnoses = getClientDiagnosisNames(client);
            const requestedSupportFields = ['sessionFocus', 'diagnosticSupport', 'medicalNecessity']
                .filter(sectionKey => isSoapPlatformSectionEnabled(client, sectionKey));
            let supportFields = null;
            if (requestedSupportFields.length > 0) {
                try {
                    if (requestedSupportFields.length === 3) {
                        supportFields = await fetchSupportFieldsFromAI(client, appointment);
                    } else {
                        supportFields = await fetchSupportFieldsFromAI(client, appointment, requestedSupportFields);
                    }
                    if (requestedSupportFields.includes('sessionFocus')) {
                        if (supportFields.sessionFocus) {
                            appointment.soap.sessionFocus = normalizeCoupleCollectiveReferences(supportFields.sessionFocus, client);
                        } else {
                            supportErrors.push('Session Focus was not returned.');
                        }
                    }
                    if (requestedSupportFields.includes('diagnosticSupport')) {
                        if (supportFields.diagnosticSupport) {
                            appointment.soap.diagnosticSupport = normalizeDiagnosticSupportReferences(supportFields.diagnosticSupport, client);
                        } else {
                            supportErrors.push('Diagnostic Support was not returned.');
                        }
                    }
                    if (requestedSupportFields.includes('medicalNecessity')) {
                        if (supportFields.medicalNecessity) {
                            appointment.soap.medicalNecessity = normalizeCoupleCollectiveReferences(supportFields.medicalNecessity, client);
                        } else {
                            supportErrors.push('Medical Necessity was not returned.');
                        }
                    }
                    const diagnosisSupportRequested = requestedSupportFields.some(field => ['diagnosticSupport', 'medicalNecessity'].includes(field));
                    if (diagnosisSupportRequested && diagnoses.length === 0) {
                        supportErrors.push('no client diagnosis is recorded');
                    }
                } catch (error) {
                    const requestedLabels = requestedSupportFields
                        .map(field => getSoapPlatformSectionDefinition(field)?.label || field)
                        .join(', ');
                    supportErrors.push(`${requestedLabels} could not be generated: ${error?.message || error}`);
                    console.warn('Combined support-field AI generation failed.', error);
                }
            }
            delete appointment.auditCheck;
            markDirty();

            if (supportErrors.length > 0) {
                alert(`Objective approved and organized, but support fields need attention: ${supportErrors.join('; ')}.`);
            }
        } catch (error) {
            console.error('Objective organization error:', error);
            alert(`Failed to approve and organize Objective content. ${error.message}`);
        } finally {
            objectiveOrganizationInFlight.delete(taskKey);
            if (isCurrentAppointmentContext(appointmentContext)) {
                setSoapPostObjectiveProcessingState(false);
                renderSoap();
            }
        }
    };

    const generateObjectiveInterventions = async ({ objectiveTextOverride = null, appointmentContext = null, renderAfter = true, suppressEmptyAlert = false } = {}) => {
        const resolvedAppointmentContext = appointmentContext || getSelectedAppointmentContext();
        const appointment = getAppointmentFromContext(resolvedAppointmentContext);
        if (!appointment) return false;
        const client = resolvedAppointmentContext ? findClient(resolvedAppointmentContext.clientId) : null;

        const objectiveText = String(objectiveTextOverride ?? appointment.soap?.o ?? '').trim();
        if (!objectiveText) {
            if (!suppressEmptyAlert) {
                alert('Please enter Objective content before generating interventions.');
            }
            if (renderAfter && isCurrentAppointmentContext(resolvedAppointmentContext)) {
                renderSoap();
            }
            return false;
        }
        if (!isObjectiveOrganizeCompleted(appointment)) {
            if (!suppressEmptyAlert) {
                alert('Review Objective and press Approve before generating interventions.');
            }
            return false;
        }

        const generateInterventionsBtn = document.getElementById('generateInterventionsBtn');
        if (generateInterventionsBtn) {
            generateInterventionsBtn.disabled = true;
            setSoapActionButtonContent(generateInterventionsBtn, 'Refresh', false, true);
        }

        const bank = getInterventionBankNames(client);
        let success = false;

        try {
            let interventions = [];
            try {
                interventions = await fetchObjectiveInterventionsFromAI(objectiveText, bank);
            } catch (error) {
                console.warn('Objective intervention AI generation failed; falling back to direct matching.', error);
                interventions = extractInterventionsFromObjective(objectiveText, client).slice(0, OBJECTIVE_INTERVENTION_MAX_COUNT);
            }

            appointment.soap.objectiveInterventionMatches = interventions;
            updateSoapInterventionsValue(appointment, formatInterventionsByModality(interventions));
            markObjectiveReadCompleted(appointment);
            delete appointment.auditCheck;
            markDirty();
            success = true;
        } catch (error) {
            console.error('Objective intervention generation error:', error);
            alert(`Failed to generate interventions from Objective text. ${error.message}`);
        } finally {
            if (generateInterventionsBtn?.isConnected) {
                generateInterventionsBtn.disabled = false;
                setSoapActionButtonContent(generateInterventionsBtn, 'Refresh', isObjectiveReadCompleted(appointment));
            }
            if (renderAfter && isCurrentAppointmentContext(resolvedAppointmentContext)) {
                renderSoap();
            } else if (!renderAfter && isCurrentAppointmentContext(resolvedAppointmentContext)) {
                refreshObjectiveActionButtons(appointment);
            }
        }
        return success;
    };

    const {
        generateSoapNoteWithOpenAI,
        generateSoapNoteWithVertex,
        generateSoapNoteWithOpenWebUI,
        generateSoapNoteWithOllama
    } = createSoapProviderController({
        getProviderState: () => ({
            selectedModel,
            openaiApiKey,
            vertexServiceAccount,
            vertexLocation,
            selectedClientId,
            selectedAppointmentId,
            systemPrompt,
            apiKey,
            serverAddress,
            ollamaAddress: ollamaAddressInput.value
        }),
        findClient,
        findAppointment,
        hasAppointmentGenerationInput,
        getTreatmentGoalsContext,
        getCandidateObjectivesContext,
        getInterventionContext,
        getInterventionBankContext,
        getSelectedInterventionContext,
        getClientSoapModalityContext,
        getInstructionsContext,
        getSoapAuditProofingContext,
        tauriFetch,
        completeGeneratedSoapNote,
        updateGenerateNoteButtonState,
        getGoogleAccessToken,
        buildVertexCachedSoapPayload,
        buildVertexDirectSoapPayload,
        buildVertexSoapCacheMaterial,
        getOrCreateVertexSoapContextCache,
        invalidateVertexContextCache,
        rememberVertexEffectiveLocation,
        requestVertexGenerateContent
    });

    const connectToServer = async () => {
        apiProvider = apiProviderSelect.value;
        if (apiProvider === 'openwebui') {
            await connectToOpenWebUI();
        } else if (apiProvider === 'ollama') {
            await connectToOllama();
        } else if (apiProvider === 'vertex') {
            await connectToVertex();
        } else if (apiProvider === 'openai') {
            await connectToOpenAI();
        }
    };
    
    const verifyApiConnection = async () => {
        if (!apiProvider) {
            alert('Please connect to an API provider first.');
            return;
        }

        apiStatus.textContent = 'Verifying...';
        apiStatus.style.color = 'orange';

        try {
            if (apiProvider === 'vertex') {
                if (!vertexServiceAccount || !vertexLocation || !selectedModel) {
                    throw new Error('Vertex Service Account/location/model not configured.');
                }
                
                const accessToken = await getGoogleAccessToken(vertexServiceAccount);
                const credentials = JSON.parse(vertexServiceAccount);
                const projectId = credentials.project_id;
                
                const request = await requestVertexGenerateContent({
                    accessToken,
                    errorPrefix: 'API test failed',
                    location: vertexLocation,
                    modelId: selectedModel,
                    payload: {
                        contents: [{ role: "user", parts: [{ text: 'Reply with OK' }] }],
                        generationConfig: { temperature: 0 }
                    },
                    projectId
                });
                rememberVertexEffectiveLocation(request.location);
                apiStatus.textContent = 'Verified ✓';
                apiStatus.style.color = 'green';
            } else if (apiProvider === 'openai') {
                if (!openaiApiKey || !selectedModel) {
                    throw new Error('OpenAI API key or model not configured.');
                }
                const response = await tauriFetch('https://api.openai.com/v1/models/' + selectedModel, {
                    headers: { 'Authorization': `Bearer ${openaiApiKey}` }
                });
                if (!response.ok) {
                    throw new Error(`API test failed: ${response.status}`);
                }
                apiStatus.textContent = 'Verified ✓';
                apiStatus.style.color = 'green';
            } else if (apiProvider === 'openwebui') {
                if (!serverAddress) {
                    throw new Error('Server address not configured.');
                }
                const response = await tauriFetch(`${serverAddress}/api/models`);
                if (!response.ok) {
                    throw new Error(`API test failed: ${response.status}`);
                }
                apiStatus.textContent = 'Verified ✓';
                apiStatus.style.color = 'green';
            } else if (apiProvider === 'ollama') {
                const address = (ollamaAddressInput.value || '').trim();
                if (!address) {
                    throw new Error('Ollama address not configured.');
                }
                const base = address.endsWith('/') ? address.slice(0, -1) : address;
                const response = await tauriFetch(`${base}/v1/models`, { method: 'GET' });
                if (!response.ok) {
                    throw new Error(`API test failed: ${response.status}`);
                }
                apiStatus.textContent = 'Verified ✓';
                apiStatus.style.color = 'green';
            }
        } catch (error) {
            console.error('API verification error (raw):', error);
            apiStatus.textContent = 'Verification Failed';
            apiStatus.style.color = 'red';

            // Normalize the error into a readable string so we never show "undefined"
            let message;
            if (error instanceof Error && error.message) {
                message = error.message;
            } else if (typeof error === 'string') {
                message = error;
            } else if (error && typeof error.message === 'string') {
                message = error.message;
            } else {
                try {
                    message = JSON.stringify(error);
                } catch (_) {
                    message = String(error);
                }
            }

            if (
                apiProvider === 'vertex' &&
                message &&
                (message.toLowerCase().includes('load failed') || message.toLowerCase().includes('failed to fetch'))
            ) {
                alert(`API verification failed: ${message}\n\nThis usually means the browser could not complete the network request (often CORS/network policy). Try serving this app over http://localhost and verify outbound access to *.googleapis.com.`);
            } else {
                alert(`API verification failed: ${message}`);
            }
        }
    };

    const VERTEX_MODEL_CACHE_VERSION = 2;
    const getVertexModelCacheKey = (projectId, location) =>
        `vertexGeminiModelCatalog:v${VERTEX_MODEL_CACHE_VERSION}:${projectId}:${location}`;

    const loadCachedVertexModels = (projectId, location) => {
        try {
            const rawCache = localStorage.getItem(getVertexModelCacheKey(projectId, location));
            if (!rawCache) return null;

            const cache = JSON.parse(rawCache);
            if (cache?.version !== VERTEX_MODEL_CACHE_VERSION
                || !Array.isArray(cache.models)
                || !cache.models.every(model => model && typeof model.id === 'string')) {
                return null;
            }
            return cache;
        } catch (error) {
            console.warn('Failed to load the cached Vertex model catalog.', error);
            return null;
        }
    };

    const saveCachedVertexModels = (projectId, location, models, refreshedAt) => {
        try {
            localStorage.setItem(getVertexModelCacheKey(projectId, location), JSON.stringify({
                version: VERTEX_MODEL_CACHE_VERSION,
                refreshedAt,
                models
            }));
        } catch (error) {
            console.warn('Failed to cache the Vertex model catalog.', error);
        }
    };

    const formatVertexRefreshTime = (value) => {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? 'an earlier refresh' : date.toLocaleString();
    };

    const renderVertexModelCatalog = (models, preferredModelId) => {
        vertexModelInput.innerHTML = '';
        const availableIds = new Set(models.map(model => model.id));
        const missingPreferredModel = preferredModelId && !availableIds.has(preferredModelId);

        if (missingPreferredModel) {
            const unavailableGroup = document.createElement('optgroup');
            unavailableGroup.label = 'Unavailable previous selection';
            const unavailableOption = document.createElement('option');
            unavailableOption.value = preferredModelId;
            unavailableOption.textContent = `${preferredModelId} (unavailable)`;
            unavailableOption.disabled = true;
            unavailableOption.selected = true;
            unavailableGroup.appendChild(unavailableOption);
            vertexModelInput.appendChild(unavailableGroup);
        }

        const addModelGroup = (label, category) => {
            const categoryModels = models.filter(model => model.category === category);
            if (categoryModels.length === 0) return;

            const group = document.createElement('optgroup');
            group.label = label;
            categoryModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.id;
                group.appendChild(option);
            });
            vertexModelInput.appendChild(group);
        };

        addModelGroup('Stable', 'stable');
        addModelGroup('Preview / Experimental', 'preview');

        vertexModelCatalog = models;
        vertexModelInput.disabled = models.length === 0;

        if (missingPreferredModel) {
            selectedModel = null;
            return { missingPreferredModel: true, selectedModel: null };
        }

        const nextModel = models.find(model => model.id === preferredModelId)
            || choosePreferredVertexModel(models);
        selectedModel = nextModel?.id || null;
        if (selectedModel) {
            vertexModelInput.value = selectedModel;
            localStorage.setItem('vertexModel', selectedModel);
        }

        return { missingPreferredModel: false, selectedModel };
    };

    const refreshVertexModelCatalog = async ({ serviceAccount, location, preferredModelId }) => {
        const accessToken = await getGoogleAccessToken(serviceAccount);
        const credentials = JSON.parse(serviceAccount);
        const projectId = credentials.project_id;
        const cachedCatalog = loadCachedVertexModels(projectId, location);

        try {
            const models = await fetchVertexGeminiModelCatalog({
                accessToken,
                fetchImpl: tauriFetch,
                location
            });
            const refreshedAt = new Date().toISOString();
            saveCachedVertexModels(projectId, location, models, refreshedAt);
            const selection = renderVertexModelCatalog(models, preferredModelId);
            return { ...selection, models, refreshedAt, source: 'live' };
        } catch (error) {
            if (!cachedCatalog?.models?.length) {
                throw error;
            }

            const selection = renderVertexModelCatalog(cachedCatalog.models, preferredModelId);
            return {
                ...selection,
                models: cachedCatalog.models,
                refreshedAt: cachedCatalog.refreshedAt,
                source: 'cache',
                warning: error
            };
        }
    };

    const connectToVertex = async ({ isRefresh = false } = {}) => {
        const serviceAccount = vertexServiceAccountInput.value.trim();
        const location = normalizeVertexLocation(vertexLocationInput.value);

        if (!serviceAccount) {
            alert('Please provide a Google Cloud Service Account JSON.');
            return;
        }
        if (!location) {
            alert('Please provide a Vertex location.');
            return;
        }

        vertexLocationInput.value = location;
        vertexLocation = location;
        apiStatus.textContent = isRefresh ? 'Refreshing models...' : 'Connecting...';
        apiStatus.style.color = 'orange';
        vertexModelInput.innerHTML = '<option>Loading models...</option>';
        vertexModelInput.disabled = true;
        refreshVertexModelsBtn.disabled = true;
        refreshVertexModelsBtn.textContent = 'Refreshing...';
        vertexModelStatus.textContent = 'Requesting the current Gemini catalog from Google...';
        vertexModelStatus.style.color = 'var(--text-color-secondary)';

        try {
            vertexServiceAccount = serviceAccount;
            const preferredModelId = isRefresh
                && vertexModelCatalog.some(model => model.id === selectedModel)
                ? selectedModel
                : localStorage.getItem('vertexModel');
            const catalogResult = await refreshVertexModelCatalog({
                serviceAccount,
                location,
                preferredModelId
            });

            localStorage.setItem('apiProvider', 'vertex');
            localStorage.setItem('vertexServiceAccount', vertexServiceAccount);
            localStorage.setItem('vertexLocation', vertexLocation);
            if (selectedModel) {
                localStorage.setItem('vertexModel', selectedModel);
            }

            const refreshTime = formatVertexRefreshTime(catalogResult.refreshedAt);
            const modelCountLabel = `${catalogResult.models.length} compatible model${catalogResult.models.length === 1 ? '' : 's'}`;
            const unavailableMessage = catalogResult.missingPreferredModel
                ? ' The previous selection is no longer available; choose a current model.'
                : '';

            if (catalogResult.source === 'cache') {
                apiStatus.textContent = 'Connected (cached model list)';
                apiStatus.style.color = '#e67e22';
                vertexModelStatus.textContent = `Using ${modelCountLabel} cached from ${refreshTime}; Google refresh failed.${unavailableMessage}`;
                vertexModelStatus.style.color = '#e67e22';
                console.warn('Vertex model refresh failed; using the last successful catalog.', catalogResult.warning);
            } else {
                apiStatus.textContent = 'Connected';
                apiStatus.style.color = 'green';
                vertexModelStatus.textContent = `${modelCountLabel} updated ${refreshTime}.${unavailableMessage}`;
                vertexModelStatus.style.color = catalogResult.missingPreferredModel
                    ? '#e67e22'
                    : 'var(--text-color-secondary)';
            }
            verifyApiBtn.classList.toggle('hidden', !selectedModel);
        } catch (error) {
            console.error('Vertex connection error:', error);
            apiStatus.textContent = 'Failed';
            apiStatus.style.color = 'red';
            vertexModelInput.innerHTML = '<option>Connection Failed</option>';
            vertexServiceAccount = null;
            vertexLocation = 'global';
            vertexModelCatalog = [];
            selectedModel = null;
            vertexModelStatus.textContent = 'No current model catalog is available. Check the credentials, location, and network connection.';
            vertexModelStatus.style.color = '#e74c3c';
            alert(`Failed to ${isRefresh ? 'refresh models from' : 'connect to'} Vertex AI. Check your Service Account JSON, location, and network connection.\nError: ${error.message}`);
        } finally {
            refreshVertexModelsBtn.disabled = !vertexServiceAccountInput.value.trim();
            refreshVertexModelsBtn.textContent = 'Refresh Models';
            fullRender();
        }
    };
    
    const connectToOpenAI = async () => {
        const key = openaiApiKeyInput.value.trim();
        if (!key) {
            alert('Please provide an OpenAI API Key.');
            return;
        }

        apiStatus.textContent = 'Connecting...';
        apiStatus.style.color = 'orange';
        openaiModelInput.innerHTML = '<option>Loading models...</option>';
        openaiModelInput.disabled = true;

        try {
            const response = await tauriFetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${key}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to fetch models: ${response.status} - ${errorData.error.message}`);
            }
            const data = await response.json();

            const models = data.data
                .filter(m => m.id.includes('gpt') && m.id.includes('instruct') === false) // Filter for chat models
                .sort((a, b) => a.id.localeCompare(b.id)) // Sort them
                .map(m => m.id);

            if (models.length === 0) {
                throw new Error("No compatible GPT models found.");
            }

            openaiModelInput.innerHTML = '';
            models.forEach(modelId => {
                const option = document.createElement('option');
                option.value = modelId;
                option.textContent = modelId;
                openaiModelInput.appendChild(option);
            });

            openaiApiKey = key;
            
            const savedModel = localStorage.getItem('openaiModel');
            if (savedModel && models.includes(savedModel)) {
                openaiModelInput.value = savedModel;
            } else if (models.includes('gpt-4o')) { // Prefer gpt-4o
                openaiModelInput.value = 'gpt-4o';
            } else if (models.includes('gpt-3.5-turbo')) {
                openaiModelInput.value = 'gpt-3.5-turbo';
            } else {
                openaiModelInput.value = models[0]; // Fallback
            }
            
            selectedModel = openaiModelInput.value;
            openaiModelInput.disabled = false;

            localStorage.setItem('apiProvider', 'openai');
            localStorage.setItem('openaiApiKey', openaiApiKey);
            localStorage.setItem('openaiModel', selectedModel);

            apiStatus.textContent = 'Connected';
            apiStatus.style.color = 'green';
            verifyApiBtn.classList.remove('hidden');

        } catch (error) {
            console.error('OpenAI connection error:', error);
            apiStatus.textContent = 'Failed';
            apiStatus.style.color = 'red';
            openaiModelInput.innerHTML = '<option>Connection Failed</option>';
            openaiApiKey = null;
            selectedModel = null;
            alert(`Failed to connect to OpenAI. Check your API key and network connection.\nError: ${error.message}`);
        } finally {
            fullRender();
        }
    };

    const connectToOpenWebUI = async () => {
        const address = serverAddressInput.value.trim();
        if (!address) {
            alert('Please enter an Open WebUI address.');
            return;
        }
        serverAddress = address.endsWith('/') ? address.slice(0, -1) : address;
        apiKey = apiKeyInput.value.trim();

        // Save settings to local storage immediately
        localStorage.setItem('apiProvider', 'openwebui');
        localStorage.setItem('serverAddress', serverAddress);
        if (apiKey) {
            localStorage.setItem('apiKey', apiKey);
        } else {
            localStorage.removeItem('apiKey');
        }

        apiStatus.textContent = 'Connecting...';
        apiStatus.style.color = 'orange';
        modelSelect.innerHTML = '<option>Loading models...</option>';
        modelSelect.disabled = true;

        try {
            const headers = new Headers();
            if (apiKey) {
                headers.append('Authorization', `Bearer ${apiKey}`);
            }
            const response = await tauriFetch(`${serverAddress}/api/v1/models`, { headers, mode: 'cors' });
            if (!response.ok) {
                const error = new Error(`Failed to connect to Open WebUI. Status: ${response.status}`);
                error.response = response;
                throw error;
            }
            const data = await response.json();
            
            apiStatus.textContent = 'Connected';
            apiStatus.style.color = 'green';
            
            // localStorage.setItem('serverAddress', serverAddress);
            // if (apiKey) localStorage.setItem('apiKey', apiKey);
            // else localStorage.removeItem('apiKey');
            
            modelSelect.innerHTML = '';
            const models = data.data;

            if (models && models.length > 0) {
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                                                 option.textContent = model.id;
                    modelSelect.appendChild(option);
                });

                let autoSelectedModelId = null;
                const llamaModel = models.find(m => m.id === 'llama3.2:3b');
                const deepseekModel = models.find(m => m.id === 'deepseek-r1:1.5b');

                if (llamaModel) {
                    autoSelectedModelId = llamaModel.id;
                } else if (deepseekModel) {
                    autoSelectedModelId = deepseekModel.id;
                } else {
                    const fallbackModel = models.find(m => 
                        m.id !== 'arena-model' && 
                        !m.id.toLowerCase().includes('coder') && 
                        !m.id.toLowerCase().includes('coding')
                    );
                    if (fallbackModel) {
                        autoSelectedModelId = fallbackModel.id;
                    }
                }

                if (autoSelectedModelId) {
                    modelSelect.value = autoSelectedModelId;
                } else if (models.length > 0) {
                    modelSelect.value = models[0].id;
                }

                selectedModel = modelSelect.value;
                modelSelect.disabled = false;
                
            } else {

                modelSelect.innerHTML = '<option>No models found</option>';
                selectedModel = null;
                modelSelect.disabled = true;
            }

        } catch (error) {
            console.error('API connection error:', error);
            apiStatus.textContent = 'Failed';
            apiStatus.style.color = 'red';
            serverAddress = null;
            modelSelect.innerHTML = '<option>Connection failed</option>';
            
                                
            let alertMessage = `Connection to "${address}" failed.`;
            
            if (error.response?.status === 401) {
                 alertMessage += `\n\nError: Authentication failed (401 Unauthorized). Please check if your API Key is correct and has the necessary permissions. Some servers require an API key even if it's optional in the UI.`;
            } else if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
                alertMessage = `Network Error: Failed to fetch.

This is the most common error and is almost always caused by one of two things:

1.  **CORS Policy:** Your browser is blocking the request for security reasons. The Open WebUI server must be configured to allow requests from this webpage.
    *SOLUTION:* In your Open WebUI settings, find the "Allowed Origins" configuration and add the URL of this page. You can often just add "*" to allow all origins, but this is less secure.

2.  **Server Not Reachable:** The address "${address}" is incorrect, or the Open WebUI server is not running. Please double-check the address and ensure the server is active.

This error cannot be fixed within this application's code; it requires a configuration change on the server you are trying to connect to.`;
            } else {
                 alertMessage += `\n\nError: ${error.message}`;
            }
            alert(alertMessage);

        } finally {
            fullRender();
        }
    };

    const connectToOllama = async () => {
        const address = (ollamaAddressInput.value || '').trim();
        if (!address) {
            alert('Please enter an Ollama address.');
            return;
        }

        const base = address.endsWith('/') ? address.slice(0, -1) : address;
        ollamaAddress = base;

        // Save settings to local storage
        localStorage.setItem('apiProvider', 'ollama');
        localStorage.setItem('ollamaAddress', ollamaAddress);

        apiStatus.textContent = 'Connecting...';
        apiStatus.style.color = 'orange';
        modelSelect.innerHTML = '<option>Loading models...</option>';
        modelSelect.disabled = true;

        try {
            const response = await tauriFetch(`${ollamaAddress}/v1/models`, { method: 'GET' });
            if (!response.ok) {
                const error = new Error(`Failed to connect to Ollama. Status: ${response.status}`);
                error.response = response;
                throw error;
            }

            const data = await response.json();
            const rawModels = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.models) ? data.models : (Array.isArray(data) ? data : []));

            apiStatus.textContent = 'Connected';
            apiStatus.style.color = 'green';

            modelSelect.innerHTML = '';

            if (rawModels && rawModels.length > 0) {
                rawModels.forEach(model => {
                    const id = model.id || model.name || model.model;
                    if (!id) return;
                    const option = document.createElement('option');
                    option.value = id;
                    option.textContent = id;
                    modelSelect.appendChild(option);
                });

                const savedOllamaModel = localStorage.getItem('ollamaModel');
                if (savedOllamaModel && Array.from(modelSelect.options).some(opt => opt.value === savedOllamaModel)) {
                    modelSelect.value = savedOllamaModel;
                } else if (rawModels.length > 0) {
                    modelSelect.value = rawModels[0].id || rawModels[0].name || rawModels[0].model;
                }

                selectedModel = modelSelect.value;
                modelSelect.disabled = false;
            } else {
                modelSelect.innerHTML = '<option>No models found</option>';
                selectedModel = null;
                modelSelect.disabled = true;
            }
        } catch (error) {
            console.error('Ollama connection error:', error);
            apiStatus.textContent = 'Failed';
            apiStatus.style.color = 'red';
            ollamaAddress = null;
            modelSelect.innerHTML = '<option>Connection failed</option>';
            // Normalize error into a readable message so we never show "undefined"
            let message;
            if (error instanceof Error && error.message) {
                message = error.message;
            } else if (typeof error === 'string') {
                message = error;
            } else if (error && typeof error.message === 'string') {
                message = error.message;
            } else {
                try {
                    message = JSON.stringify(error);
                } catch (_) {
                    message = String(error);
                }
            }

            let alertMessage = `Connection to "${address}" failed.`;
            if (error?.response?.status === 401) {
                alertMessage += '\n\nError: Authentication failed (401 Unauthorized). Please check your Ollama configuration.';
            } else if (message && message.toLowerCase().includes('failed to fetch')) {
                alertMessage = `Network Error: Failed to fetch.\n\nThis usually means the runtime could not reach \"${address}\".\n\nPlease check:\n- That the Ollama server is running and listening on this address/port.\n- That the Tauri HTTP plugin allowlist (in src-tauri/tauri.conf.json) includes this host/port.\n- Any local firewall or VPN that might be blocking localhost connections.`;
            } else {
                alertMessage += `\n\nError: ${message}`;
            }
            alert(alertMessage);
        } finally {
            fullRender();
        }
    };


    // --- Data Persistence (Save/Load/AutoSave) ---
    const updateSaveStatus = (message, isGood = true, duration = 0) => {
        autoSaveIndicator.style.opacity = '1';
        saveStatus.textContent = message;
        saveStatus.style.color = isGood ? 'white' : '#f1c40f'; // Gold for warning
        if (duration > 0) {
            setTimeout(() => {
                if (saveStatus.textContent === message) {
                    autoSaveIndicator.style.opacity = '0';
                }
            }, duration);
        }
    }

    const markDirty = () => {
        if (!isDirty) {
            isDirty = true;
            updateSaveStatus('Unsaved changes...', false);
        }
        debouncedAutoSave();
    };

    const saveDataToLocalStorage = async () => {
        try {
            const state = { data, deletedItems, selectedClientId, selectedAppointmentId, selectedNoteId, selectedIntakeId };

            const saved = await saveEncryptedState({
                state,
                databaseReady: isDatabaseInitialized(),
                saveDatabaseState: saveState,
                legacyStorage: localStorage
            });
            if (!saved) {
                console.warn('Chart save skipped because the encrypted database is locked.');
                return false;
            }

            isDirty = false;
            await persistEncryptedAutoBackup();
            return true;
        } catch (e) {
            console.error("Failed to save data", e);
            updateSaveStatus('Save failed!', false, 3000);
            return false;
        }
    };

    const loadDataFromLocalStorage = async () => {
        try {
            const state = await loadEncryptedStateWithLegacyMigration({
                databaseReady: isDatabaseInitialized(),
                loadDatabaseState: loadState,
                saveDatabaseState: saveState,
                legacyStorage: localStorage
            });

            if (state) {
                data = state.data || getInitialData();
                if (!data.archivedClients) data.archivedClients = [];
                deletedItems = state.deletedItems || { clients: [], appointments: [], notes: [], intakes: [] };
                selectedClientId = null;
                selectedAppointmentId = null;
                selectedNoteId = null;
                selectedIntakeId = null;
                const soapGuidanceMigrated = normalizeClientData();
                if (soapGuidanceMigrated) markDirty();

                // Load API settings
                const savedProvider = localStorage.getItem('apiProvider');
                if (savedProvider) {
                    apiProvider = savedProvider;
                    apiProviderSelect.value = apiProvider;
                    toggleProviderSettings();
                }
                serverAddressInput.value = localStorage.getItem('serverAddress') || '';
                apiKeyInput.value = localStorage.getItem('apiKey') || '';
                if (ollamaAddressInput) {
                    ollamaAddressInput.value = localStorage.getItem('ollamaAddress') || '';
                }
                vertexServiceAccountInput.value = localStorage.getItem('vertexServiceAccount') || '';
                if (vertexServiceAccountInput.value) {
                    vertexKeyStatus.textContent = 'Key loaded from storage';
                    vertexKeyStatus.style.color = '#27ae60';
                    clearVertexKeyBtn.classList.remove('hidden');
                }
                vertexLocationInput.value = localStorage.getItem('vertexLocation') || 'global';
                openaiApiKeyInput.value = localStorage.getItem('openaiApiKey') || '';
            }

            loadAutoBackupPathFromStorage();
        } catch (e) {
            console.error("Failed to load data", e);
            loadAutoBackupPathFromStorage();
            throw e;
        }
    };

    const exportFile = async () => {
        try {
            const isTauriRuntime = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;
            if (isTauriRuntime) {
                if (!isDatabaseInitialized()) {
                    throw new Error('Encrypted SQL export requires an active authenticated desktop session.');
                }

                await saveDataToLocalStorage();
                const encryptedSqlPayload = await exportEncryptedSqlDump();
                exportDataText.value = JSON.stringify(encryptedSqlPayload, null, 2);
                exportDataModal.classList.remove('hidden');
                updateSaveStatus('Encrypted SQL export ready.', true, 2500);
                return;
            }

            const stateToSave = { data, deletedItems, selectedClientId, selectedAppointmentId, selectedNoteId, selectedIntakeId };
            const stateJSON = JSON.stringify(stateToSave, null, 2);
            const blob = new Blob([stateJSON], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `client-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            updateSaveStatus('Exported.', true, 2000);
        } catch (err) {
            console.error('Failed to export file:', err);
            alert(`Export failed!\n\nError: ${err.message}`);
            updateSaveStatus('Export failed!', false, 3000);
        }
    };

    let saveTimeout;
    const debouncedAutoSave = () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            if (await saveDataToLocalStorage()) {
                updateSaveStatus('Auto-saved', true, 2000);
            }
        }, 1500);
    };

    const loadFile = () => {
         if (isDirty && !confirm('You have unsaved changes that will be lost. Are you sure you want to import a new file?')) {
             return;
         }
        fileInput.click();
    };

    const applyImportedState = (state) => {
        data = state.data || getInitialData();
        deletedItems = state.deletedItems || { clients: [], appointments: [], notes: [], intakes: [] };
        selectedClientId = state.selectedClientId || null;
        selectedAppointmentId = state.selectedAppointmentId || null;
        selectedNoteId = state.selectedNoteId || null;
        selectedIntakeId = state.selectedIntakeId || null;

        if (!data.archivedClients) {
            data.archivedClients = [];
        }

        const soapGuidanceMigrated = normalizeClientData();
        isDirty = false;
        if (soapGuidanceMigrated) markDirty();
        fullRender();
    };

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const contents = await file.text();
            const fileName = (file.name || '').toLowerCase();
            const trimmed = (contents || '').trim();

            if (fileName.endsWith('.sql')) {
                if (!isDatabaseInitialized()) {
                    throw new Error('SQL import requires an active authenticated desktop session.');
                }

                await importSqlDump(contents);
                const restoredState = await loadState();
                if (!restoredState) {
                    throw new Error('SQL import completed, but no application state could be loaded.');
                }

                applyImportedState(restoredState);
                alert(`Imported SQL backup ${file.name} successfully.`);
                updateSaveStatus('SQL import completed.', true, 2500);
                return;
            }

            let parsed;
            try {
                parsed = JSON.parse(contents);
            } catch (_jsonError) {
                if (trimmed.includes('CREATE TABLE') || trimmed.includes('INSERT INTO')) {
                    if (!isDatabaseInitialized()) {
                        throw new Error('SQL import requires an active authenticated desktop session.');
                    }

                    await importSqlDump(contents);
                    const restoredState = await loadState();
                    if (!restoredState) {
                        throw new Error('SQL import completed, but no application state could be loaded.');
                    }

                    applyImportedState(restoredState);
                    alert(`Imported SQL backup ${file.name} successfully.`);
                    updateSaveStatus('SQL import completed.', true, 2500);
                    return;
                }
                throw new Error('File is neither valid JSON state nor SQL dump.');
            }

            if (parsed && parsed.format === 'client-records-sql-export' && typeof parsed.data === 'string') {
                if (!isDatabaseInitialized()) {
                    throw new Error('Encrypted SQL import requires an active authenticated desktop session.');
                }

                await importEncryptedSqlDump(parsed);
                const restoredState = await loadState();
                if (!restoredState) {
                    throw new Error('Encrypted SQL import completed, but state could not be loaded.');
                }

                applyImportedState(restoredState);
                alert(`Imported encrypted SQL backup ${file.name} successfully.`);
                updateSaveStatus('Encrypted SQL import completed.', true, 2500);
                return;
            }

            if (!parsed || !parsed.data || !parsed.deletedItems) {
                throw new Error('Invalid JSON file structure. Required properties are missing.');
            }

            applyImportedState(parsed);
            await saveDataToLocalStorage();
            alert(`Imported JSON backup ${file.name} successfully.`);
            updateSaveStatus('JSON import completed.', true, 2500);
        } catch (err) {
            console.error('Failed to load file:', err);
            alert(`Import failed!\n\nError: ${err.message}`);
            updateSaveStatus('Import failed.', false, 3000);
        } finally {
            fileInput.value = '';
        }
    });

    const eraseAllData = () => {
        const confirmationText = "DELETE ALL DATA";
        const userInput = prompt(`This action will permanently erase all client data from this browser. This cannot be undone.\n\nTo confirm, please type "${confirmationText}" in the box below.`);
        if (userInput === confirmationText) {
            data = getInitialData();
            deletedItems = { clients: [], appointments: [], notes: [], intakes: [] };
            selectedClientId = null;
            selectedAppointmentId = null;
            selectedNoteId = null;
            selectedIntakeId = null;
            isDirty = false;
            localStorage.removeItem('clientData');
            localStorage.removeItem('serverAddress');
            localStorage.removeItem('apiKey');
            localStorage.removeItem('vertexServiceAccount');
            localStorage.removeItem('vertexLocation');
            localStorage.removeItem('openaiApiKey');
            localStorage.removeItem('vertexModel');
            localStorage.removeItem('openaiModel');
            localStorage.removeItem('apiProvider');
            localStorage.removeItem('columnSizes');
            localStorage.removeItem('rowSizes');
            localStorage.removeItem('theme');
            alert('All data has been permanently erased. The page will now reload.');
            window.location.reload();
        } else if (userInput !== null) {
            alert('The text you entered did not match. No data has been erased.');
        }
    };

    const resolveErrorMessage = (error) => {
        if (error instanceof Error && error.message) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        try {
            return JSON.stringify(error);
        } catch (_stringifyError) {
            return String(error);
        }
    };

    const normalizeSelectedPath = (selectedPath) => {
        if (typeof selectedPath !== 'string') return '';
        if (selectedPath.startsWith('file://')) {
            try {
                return decodeURIComponent(new URL(selectedPath).pathname);
            } catch (_urlError) {
                return selectedPath;
            }
        }
        return selectedPath;
    };

    const isTauriRuntime = () => typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

    const SAFETY_PLAN_SAVE_MESSAGE = 'smartemr-safety-plan-save';
    const SAFETY_PLAN_SAVE_RESULT_MESSAGE = 'smartemr-safety-plan-save-result';

    const postSafetyPlanSaveResult = (event, payload) => {
        if (!event.source || typeof event.source.postMessage !== 'function') return;
        const targetOrigin = event.origin && event.origin !== 'null' ? event.origin : '*';
        const message = { type: SAFETY_PLAN_SAVE_RESULT_MESSAGE, ...payload };
        try {
            event.source.postMessage(message, targetOrigin);
        } catch (_postMessageError) {
            event.source.postMessage(message, '*');
        }
    };

    window.addEventListener('message', async (event) => {
        if (
            event.source !== safetyPlanIframeEl?.contentWindow ||
            event.data?.type !== SAFETY_PLAN_SAVE_MESSAGE
        ) {
            return;
        }

        if (!isTauriRuntime()) {
            postSafetyPlanSaveResult(event, { handled: false });
            return;
        }

        const rawBytes = event.data?.bytes;
        if (!rawBytes || typeof rawBytes.byteLength !== 'number') {
            postSafetyPlanSaveResult(event, {
                handled: true,
                error: 'The generated PDF data was empty.'
            });
            return;
        }

        try {
            const defaultFileName = typeof event.data.filename === 'string' && event.data.filename.trim()
                ? event.data.filename.trim()
                : 'Safety_Plan.pdf';
            const lastSafetyPlanPath = localStorage.getItem('lastSafetyPlanPath') || defaultFileName;
            const selectedPath = await save({
                title: 'Save Safety Plan PDF',
                defaultPath: lastSafetyPlanPath,
                filters: [
                    {
                        name: 'PDF document',
                        extensions: ['pdf']
                    }
                ]
            });

            if (!selectedPath) {
                postSafetyPlanSaveResult(event, { handled: true, cancelled: true });
                return;
            }

            const normalizedPath = normalizeSelectedPath(selectedPath);
            if (!normalizedPath) {
                throw new Error('No valid save path returned by dialog.');
            }

            await invoke('write_binary_file', {
                path: normalizedPath,
                contents: Array.from(new Uint8Array(rawBytes))
            });
            localStorage.setItem('lastSafetyPlanPath', normalizedPath);
            const savedName = normalizedPath.split(/[\\/]/).pop() || defaultFileName;
            postSafetyPlanSaveResult(event, {
                handled: true,
                ok: true,
                filename: savedName
            });
        } catch (error) {
            console.error('Failed to save Safety Plan PDF:', error);
            postSafetyPlanSaveResult(event, {
                handled: true,
                error: `The PDF could not be saved: ${resolveErrorMessage(error)}`
            });
        }
    });

    const writeDesktopTextFile = async (path, contents, options = {}) => {
        const normalizedPath = normalizeSelectedPath(path);
        if (!normalizedPath) {
            throw new Error('No valid file path provided.');
        }

        if (isTauriRuntime()) {
            await invoke('write_backup_file', { path: normalizedPath, contents });
            return;
        }

        await writeTextFile(normalizedPath, contents, options);
    };

    const setBackupWarningVisibility = (isVisible) => {
        menuBackupWarning?.classList.toggle('hidden', !isVisible);
        if (headerMenuBtn) {
            headerMenuBtn.title = isVisible
                ? 'Open menu - secondary backup location required'
                : 'Open menu';
        }
    };

    const updateBackupMenuState = () => {
        if (configureBackupBtn) {
            configureBackupBtn.textContent = autoBackupPath
                ? `Update Secondary Backup Location (${autoBackupPath.split('/').pop() || 'configured'})`
                : 'Set Secondary Backup Location';
        }
        if (clearBackupBtn) {
            clearBackupBtn.disabled = !autoBackupPath;
            clearBackupBtn.style.opacity = autoBackupPath ? '1' : '0.6';
            clearBackupBtn.style.cursor = autoBackupPath ? 'pointer' : 'not-allowed';
        }
        setBackupWarningVisibility(!autoBackupPath);
    };

    const loadAutoBackupPathFromStorage = () => {
        autoBackupPath = localStorage.getItem('autoBackupPath') || '';
        updateBackupMenuState();
    };

    const persistEncryptedAutoBackup = async () => {
        if (!autoBackupPath || !isTauriRuntime() || !isDatabaseInitialized()) return;

        if (backupWriteInProgress) {
            backupWritePending = true;
            return;
        }

        backupWriteInProgress = true;
        try {
            const encryptedSqlPayload = await exportEncryptedSqlDump();
            await writeDesktopTextFile(autoBackupPath, JSON.stringify(encryptedSqlPayload, null, 2), { create: true });
        } catch (error) {
            console.error('Secondary auto-backup write failed:', error);
            updateSaveStatus(`Secondary backup failed: ${resolveErrorMessage(error)}`, false, 4000);
        } finally {
            backupWriteInProgress = false;
            if (backupWritePending) {
                backupWritePending = false;
                setTimeout(() => {
                    persistEncryptedAutoBackup();
                }, 0);
            }
        }
    };

    const configureSecondaryBackupLocation = async () => {
        if (!isTauriRuntime()) {
            alert('Secondary auto-backup location selection is available in the desktop app runtime.');
            return;
        }

        if (!isDatabaseInitialized()) {
            alert('Please log in first so encrypted backup can be initialized.');
            return;
        }

        try {
            const defaultFileName = `client-data-autobackup-${new Date().toISOString().split('T')[0]}.sql.enc.json`;
            const selectedPath = await save({
                title: 'Choose Secondary Auto-Backup Destination',
                defaultPath: autoBackupPath || localStorage.getItem('autoBackupPath') || defaultFileName,
                filters: [
                    {
                        name: 'Encrypted SQL Backup',
                        extensions: ['json']
                    }
                ]
            });

            if (!selectedPath) return;

            const normalizedPath = normalizeSelectedPath(selectedPath);
            if (!normalizedPath) {
                throw new Error('No valid backup path returned by dialog.');
            }

            autoBackupPath = normalizedPath;
            localStorage.setItem('autoBackupPath', autoBackupPath);
            updateBackupMenuState();
            await persistEncryptedAutoBackup();
            updateSaveStatus('Secondary auto-backup location configured.', true, 3000);
        } catch (error) {
            console.error('Failed to configure secondary backup path:', error);
            alert(`Failed to configure secondary backup location.\n\nError: ${resolveErrorMessage(error)}`);
            updateSaveStatus('Secondary backup configuration failed.', false, 3000);
        }
    };

    const clearSecondaryBackupLocation = () => {
        autoBackupPath = '';
        localStorage.removeItem('autoBackupPath');
        updateBackupMenuState();
        updateSaveStatus('Secondary auto-backup cleared.', true, 2500);
    };

    const downloadExportData = async () => {
        const json = exportDataText.value || '';
        if (!json) return;

        const defaultFileName = `client-data-${new Date().toISOString().split('T')[0]}.sql.enc.json`;
        const isTauriRuntime = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

        if (isTauriRuntime) {
            try {
                const lastExportPath = localStorage.getItem('lastExportPath') || defaultFileName;
                const selectedPath = await save({
                    title: 'Save Encrypted SQL Export',
                    defaultPath: lastExportPath,
                    filters: [
                        {
                            name: 'Encrypted SQL Export',
                            extensions: ['json']
                        }
                    ]
                });

                if (!selectedPath) {
                    loadAutoBackupPathFromStorage();
                    return;
                }

                const normalizedPath = normalizeSelectedPath(selectedPath);
                if (!normalizedPath) {
                    throw new Error('No valid save path returned by dialog.');
                }

                await writeDesktopTextFile(normalizedPath, json, { create: true });
                localStorage.setItem('lastExportPath', normalizedPath);
                updateSaveStatus('Encrypted export saved.', true, 2500);
                exportDataModal.classList.add('hidden');
                return;
            } catch (error) {
                console.error('Failed to save encrypted export with native dialog:', error);
                alert(`Save failed!\n\nError: ${resolveErrorMessage(error)}`);
                updateSaveStatus('Save failed.', false, 3000);
                return;
            }
        }

        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const customName = prompt('Choose export filename', defaultFileName);
        if (customName === null) {
            URL.revokeObjectURL(url);
            return;
        }

        let normalizedName = customName.trim() || defaultFileName;
        if (!normalizedName.endsWith('.json')) {
            normalizedName += '.json';
        }

        a.download = normalizedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // --- Event Listeners ---
    addClientBtn.addEventListener('click', openAddClientModal);
    closeAddClientBtn.addEventListener('click', closeAddClientModal);
    cancelAddClientBtn.addEventListener('click', closeAddClientModal);
    confirmAddClientBtn.addEventListener('click', addClient);
    addClientNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addClient();
        }
    });
    addClientModal.addEventListener('click', (e) => {
        if (e.target.id === 'addClientModal') {
            closeAddClientModal();
        }
    });
    sortClientsBtn.addEventListener('click', () => {
        const sortedMainIds = getMainBankClients()
            .slice()
            .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
            .map(client => client.id);
        reorderVisibleClientSlots(sortedMainIds);
        markDirty();
        renderClients();
    });
    clearTodaySessionsBtn.addEventListener('click', () => {
        if ((data.todaySessionClientIds || []).length === 0) return;
        data.todaySessionClientIds = [];
        markDirty();
        renderClients();
    });
    mainBankSearchInput.addEventListener('input', () => {
        clientSearchQuery = mainBankSearchInput.value || '';
        renderClients();
    });
    clearMainBankSearchBtn.addEventListener('click', () => {
        clientSearchQuery = '';
        mainBankSearchInput.value = '';
        renderClients();
        mainBankSearchInput.focus();
    });
    addAppointmentBtn.addEventListener('click', addAppointment);
    addIntakeBtn.addEventListener('click', addIntakeSession);
    addNoteBtn.addEventListener('click', addNote);
    appointmentDateInput.addEventListener('change', () => {
        const selectedDate = appointmentDateInput.value;
        const today = getLocalDateInputValue();
        appointmentDateManualOverride = selectedDate && selectedDate !== today ? selectedDate : null;
        if (!selectedDate) appointmentDateInput.value = today;
    });
    renameNoteBtn.addEventListener('click', renameSelectedNote);
    noteNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedNoteId) {
                renameSelectedNote();
            } else {
                addNote();
            }
        }
    });
    addGoalBtnInTab.addEventListener('click', addGoal);
    treatmentPlanStartDateInput.addEventListener('change', () => {
        const client = findClient(selectedClientId);
        if (!client) return;
        const value = treatmentPlanStartDateInput.value;
        if (value && !isValidDateInputValue(value)) return;
        if (value) {
            client.treatmentPlanStartDate = value;
        } else {
            delete client.treatmentPlanStartDate;
        }
        markDirty();
        renderDetails();
    });
    initializeSegmentedDateInputs();

    // Tab switching functionality
    appointmentsTabBtn.addEventListener('click', () => {
        syncAppointmentDateInput();
        appointmentsTabBtn.style.color = 'var(--text-color-primary)';
        appointmentsTabBtn.style.borderBottomColor = '#3498db';
        goalsTabBtn.style.color = 'var(--text-color-secondary)';
        goalsTabBtn.style.borderBottomColor = 'transparent';
        appointmentsTabContent.style.display = 'flex';
        goalsTabContent.style.display = 'none';
    });

    goalsTabBtn.addEventListener('click', () => {
        goalsTabBtn.style.color = 'var(--text-color-primary)';
        goalsTabBtn.style.borderBottomColor = '#3498db';
        appointmentsTabBtn.style.color = 'var(--text-color-secondary)';
        appointmentsTabBtn.style.borderBottomColor = 'transparent';
        goalsTabContent.style.display = 'flex';
        appointmentsTabContent.style.display = 'none';
    });

    // Goals event delegation
    goalsListInTabEl.addEventListener('click', (e) => {
        const goalItem = e.target.closest('.goal-item');
        if (!goalItem) return;

        const goalId = goalItem.dataset.goalId;
        const objectiveItem = e.target.closest('.objective-item');
        const clickedButton = e.target.closest?.('button');

        if (e.target.classList.contains('objective-checkbox')) {
            const objectiveId = objectiveItem?.dataset.objectiveId;
            if (!objectiveId) return;
            toggleObjective(goalId, objectiveId);
        } else if (clickedButton?.classList.contains('goal-copy-btn')) {
            copyPlanItem(goalId, null, clickedButton);
        } else if (clickedButton?.classList.contains('objective-copy-btn')) {
            const objectiveId = objectiveItem?.dataset.objectiveId;
            if (!objectiveId) return;
            copyPlanItem(goalId, objectiveId, clickedButton);
        } else if (clickedButton?.classList.contains('add-objective-btn')) {
            addObjective(goalId);
        } else if (clickedButton?.classList.contains('edit-objective-btn')) {
            const objectiveId = objectiveItem?.dataset.objectiveId;
            if (!objectiveId) return;
            editObjective(goalId, objectiveId);
        } else if (clickedButton?.classList.contains('delete-btn') && objectiveItem) {
            const objectiveId = objectiveItem.dataset.objectiveId;
            if (!objectiveId) return;
            deleteObjective(goalId, objectiveId);
        } else if (clickedButton?.classList.contains('edit-btn')) {
            editGoal(goalId);
        } else if (clickedButton?.classList.contains('archive-btn')) {
            changeGoalStatus(goalId);
        } else if (clickedButton?.classList.contains('delete-btn')) {
            deleteGoal(goalId);
        }
    });

    generateGoalsBtn.addEventListener('click', () => {
        const client = findClient(selectedClientId);
        if (!client) return;
        goalGenerationRequestId += 1;
        activeGoalGeneratorClientId = client.id;
        generatedGoalsDraft = [];
        generatedPresentingProblemDraft = '';
        const clientLens = getClientGoalGenerationLens(client);
        goalGeneratorModalities = [...clientLens.modalities];
        goalGeneratorModalityOther = clientLens.other || '';
        goalDiagnosisInput.value = formatTreatmentPlanDiagnosisEntries(client);
        presentingProblemShorthandInput.value = '';
        goalCountInput.value = '1';
        objectiveCountInput.value = '4';
        objectivesPerGoalInput.checked = false;
        objectiveStyleSelect.value = 'action';
        objectiveCountHelp.textContent = 'Total objectives distributed across all goals.';
        runGoalGeneratorBtn.disabled = false;
        runGoalGeneratorBtn.textContent = 'Generate Draft';
        renderGuidingModalities();
        renderGeneratedGoalsReview();
        goalGeneratorModal.classList.remove('hidden');
    });
    const closeGoalGenerator = () => {
        goalGenerationRequestId += 1;
        activeGoalGeneratorClientId = null;
        goalGeneratorModal.classList.add('hidden');
    };
    closeGoalGeneratorBtn.addEventListener('click', closeGoalGenerator);
    goalGeneratorModal.addEventListener('click', (e) => {
        if (e.target.id === 'goalGeneratorModal') {
            closeGoalGenerator();
        }
    });
    objectivesPerGoalInput.addEventListener('change', () => {
        objectiveCountHelp.textContent = objectivesPerGoalInput.checked
            ? 'This many objectives will be generated under every goal.'
            : 'Total objectives distributed across all goals.';
    });
    runGoalGeneratorBtn.addEventListener('click', generateGoalDrafts);
    applyGeneratedGoalsBtn.addEventListener('click', applyGeneratedGoals);
    applyGeneratedGoalsBottomBtn.addEventListener('click', applyGeneratedGoals);
    generatedGoalsReview.addEventListener('input', syncGeneratedGoalsFromReview);
    generatedGoalsReview.addEventListener('change', syncGeneratedGoalsFromReview);

    interventionBankBtn.addEventListener('click', () => {
        renderInterventionBank();
        interventionBankModal.classList.remove('hidden');
    });
    closeInterventionBankBtn.addEventListener('click', () => interventionBankModal.classList.add('hidden'));
    interventionBankModal.addEventListener('click', (e) => {
        if (e.target.id === 'interventionBankModal') {
            interventionBankModal.classList.add('hidden');
        }
    });
    if (newInterventionModalitySelect) {
        newInterventionModalitySelect.addEventListener('change', syncInterventionModalityInputs);
    }
    const submitInterventionBankEntry = () => {
        const text = (newInterventionInput.value || '').trim();
        const selectedModality = newInterventionModalitySelect?.value || '';
        const rawModality = selectedModality === '__new__'
            ? (newInterventionModalityOther?.value || '').trim()
            : selectedModality;
        if (selectedModality === '__new__' && !rawModality) {
            alert('Enter a modality name first.');
            newInterventionModalityOther?.focus();
            return;
        }
        if (!text && !rawModality) return;
        if (!Array.isArray(data.interventionBank)) data.interventionBank = [];
        const entries = getInterventionBankEntries().map(entry => ({ ...entry }));
        const modality = normalizeInterventionModality(rawModality || DEFAULT_INTERVENTION_MODALITY);

        ensureInterventionBankHeader(entries, modality);
        if (text) {
            entries.push({
                id: crypto.randomUUID(),
                name: text,
                modality,
                isHeader: false,
                couplesOnly: !!newInterventionCouplesOnly?.checked,
                order: entries.length
            });
        }

        commitInterventionBankEntries(entries);

        newInterventionInput.value = '';
        if (newInterventionModalitySelect) newInterventionModalitySelect.value = '';
        if (newInterventionModalityOther) newInterventionModalityOther.value = '';
        if (newInterventionCouplesOnly) newInterventionCouplesOnly.checked = false;
        syncInterventionModalityInputs();
    };

    addInterventionBtn.addEventListener('click', submitInterventionBankEntry);
    [newInterventionInput, newInterventionModalityOther].forEach(input => {
        if (!input) return;
        input.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            submitInterventionBankEntry();
        });
    });
    interventionBankList.addEventListener('change', (e) => {
        const toggle = e.target.closest('.intervention-couples-only-toggle');
        if (!toggle) return;
        const entries = getInterventionBankEntries().map(entry => ({ ...entry }));
        const entry = entries.find(item => item.id === toggle.dataset.bankId && !item.isHeader);
        if (!entry) return;
        entry.couplesOnly = toggle.checked;
        commitInterventionBankEntries(entries);
    });
    interventionBankList.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-bank-id]');
        if (!btn) return;
        const bankId = btn.dataset.bankId;
        const entries = getInterventionBankEntries().map(entry => ({ ...entry }));
        const entryIndex = entries.findIndex(entry => entry.id === bankId);
        if (entryIndex === -1) return;
        const [removedEntry] = entries.splice(entryIndex, 1);
        const removed = removedEntry?.name;
        if (removed) {
            [...(data.clients || []), ...(data.archivedClients || [])].forEach(client => {
                (client.appointments || []).forEach(appt => {
                    if (Array.isArray(appt.selectedInterventions)) {
                        appt.selectedInterventions = appt.selectedInterventions.filter(item => item !== removed);
                    }
                });
            });
        }
        commitInterventionBankEntries(entries);
    });
    interventionBankList.addEventListener('dragstart', (e) => {
        const row = e.target.closest('.intervention-bank-row[data-bank-id]');
        if (!row) return;
        draggedInterventionBankId = row.dataset.bankId;
        row.classList.add('dragging');
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedInterventionBankId);
        }
    });
    interventionBankList.addEventListener('dragend', (e) => {
        const row = e.target.closest('.intervention-bank-row[data-bank-id]');
        if (row) row.classList.remove('dragging');
        draggedInterventionBankId = null;
        clearInterventionDropTargets();
    });
    interventionBankList.addEventListener('dragover', (e) => {
        if (!draggedInterventionBankId) return;
        const targetRow = e.target.closest('.intervention-bank-row[data-bank-id]');
        const targetGroup = e.target.closest('.intervention-group-body[data-drop-modality]');
        if (!targetRow && !targetGroup) return;
        e.preventDefault();
        clearInterventionDropTargets();
        if (targetRow && targetRow.dataset.bankId !== draggedInterventionBankId) {
            targetRow.classList.add('intervention-drop-target');
            return;
        }
        if (targetGroup) {
            targetGroup.classList.add('intervention-drop-target');
        }
    });
    interventionBankList.addEventListener('drop', (e) => {
        if (!draggedInterventionBankId) return;
        const targetRow = e.target.closest('.intervention-bank-row[data-bank-id]');
        const targetGroup = e.target.closest('.intervention-group-body[data-drop-modality]');
        if (!targetRow && !targetGroup) return;
        e.preventDefault();

        const targetId = targetRow && targetRow.dataset.bankId !== draggedInterventionBankId
            ? targetRow.dataset.bankId
            : null;
        const targetModality = targetGroup?.dataset.dropModality || targetRow?.dataset.bankModality || '';
        clearInterventionDropTargets();
        moveInterventionBankEntry(draggedInterventionBankId, targetId, targetModality);
        draggedInterventionBankId = null;
    });

    renderInterventionModalityOptions();

    closeInterventionPickerBtn.addEventListener('click', () => interventionPickerModal.classList.add('hidden'));
    interventionPickerModal.addEventListener('click', (e) => {
        if (e.target.id === 'interventionPickerModal') {
            interventionPickerModal.classList.add('hidden');
        }
    });
    saveInterventionSelectionBtn.addEventListener('click', () => {
        const client = findClient(selectedClientId);
        const appointment = findAppointment(client, selectedAppointmentId);
        if (!appointment) return;
        const selected = Array.from(interventionPickerList.querySelectorAll('.picker-intervention:checked'))
            .map(input => input.value)
            .filter(item => isInterventionAllowedForClient(item, client));
        appointment.selectedInterventions = selected;
        if (!appointment.soap) appointment.soap = { s: '', o: '', a: '', p: '' };
        delete appointment.auditCheck;
        markDirty();
        interventionPickerModal.classList.add('hidden');
        renderSoap();
    });
    exportBtn.addEventListener('click', exportFile);
    closeExportDataBtn.addEventListener('click', () => exportDataModal.classList.add('hidden'));
    exportDataModal.addEventListener('click', (e) => {
        if (e.target.id === 'exportDataModal') {
            exportDataModal.classList.add('hidden');
        }
    });
    copyExportDataBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(exportDataText.value || '');
            updateSaveStatus('Encrypted SQL export copied.', true, 2000);
        } catch (error) {
            alert('Copy failed. Please select and copy the text manually.');
        }
    });
    downloadExportDataBtn.addEventListener('click', downloadExportData);
    importBtn.addEventListener('click', loadFile);
    eraseAllBtn.addEventListener('click', eraseAllData);
    changePasswordBtn.addEventListener('click', async () => {
        const currentPassword = (currentPasswordInput.value || '').trim();
        const newPassword = (newPasswordInput.value || '').trim();
        const confirmNewPassword = (confirmNewPasswordInput.value || '').trim();
        const currentUsername = (getCurrentUser() || '').trim();
        const shouldRefreshBiometricLogin = currentUsername && currentUsername === getRememberedBiometricUsername();

        changePasswordStatus.textContent = '';

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            changePasswordStatus.textContent = 'Fill all password fields.';
            changePasswordStatus.style.color = '#e74c3c';
            return;
        }

        if (newPassword !== confirmNewPassword) {
            changePasswordStatus.textContent = 'New passwords do not match.';
            changePasswordStatus.style.color = '#e74c3c';
            return;
        }

        if (newPassword.length < 8) {
            changePasswordStatus.textContent = 'New password must be at least 8 chars.';
            changePasswordStatus.style.color = '#e74c3c';
            return;
        }

        changePasswordBtn.disabled = true;
        changePasswordStatus.textContent = 'Updating...';
        changePasswordStatus.style.color = '#f39c12';

        try {
            await saveDataToLocalStorage();
        } catch (error) {
            changePasswordStatus.textContent = 'Save failed. Try again before changing password.';
            changePasswordStatus.style.color = '#e74c3c';
            changePasswordBtn.disabled = false;
            return;
        }

        const success = await changePassword(currentPassword, newPassword);
        if (success) {
            if (shouldRefreshBiometricLogin) {
                const biometricSynced = await storeCurrentBiometricLogin();
                if (!biometricSynced) {
                    clearRememberedBiometricUsername();
                    refreshBiometricLoginUI();
                    changePasswordStatus.textContent = 'Password updated. Re-enable Touch ID login in Settings.';
                    changePasswordStatus.style.color = '#e67e22';
                    changePasswordBtn.disabled = false;
                    refreshBiometricSettingsUI();
                    return;
                }
            }

            currentPasswordInput.value = '';
            newPasswordInput.value = '';
            confirmNewPasswordInput.value = '';
            changePasswordStatus.textContent = 'Password updated.';
            changePasswordStatus.style.color = '#27ae60';
            refreshBiometricSettingsUI();
        } else {
            changePasswordStatus.textContent = getLastAuthError() || 'Password update failed.';
            changePasswordStatus.style.color = '#e74c3c';
        }
        changePasswordBtn.disabled = false;
    });
    generateNoteBtn.addEventListener('click', generateSoapNote);
    connectApiBtn.addEventListener('click', connectToServer);
    verifyApiBtn.addEventListener('click', verifyApiConnection);
    refreshVertexModelsBtn.addEventListener('click', () => connectToVertex({ isRefresh: true }));
    
    selectVertexKeyBtn.addEventListener('click', () => {
        vertexKeyFileInput.click();
    });
    
    clearVertexKeyBtn.addEventListener('click', () => {
        vertexServiceAccountInput.value = '';
        localStorage.removeItem('vertexServiceAccount');
        vertexKeyStatus.textContent = 'No file selected';
        vertexKeyStatus.style.color = 'var(--text-color-secondary)';
        clearVertexKeyBtn.classList.add('hidden');
        refreshVertexModelsBtn.disabled = true;
        vertexModelInput.innerHTML = '<option>Connect first</option>';
        vertexModelInput.disabled = true;
        vertexModelStatus.textContent = 'Connect to load Google\'s current Gemini models.';
        vertexModelStatus.style.color = 'var(--text-color-secondary)';
        vertexServiceAccount = null;
        vertexModelCatalog = [];
        selectedModel = null;
        apiStatus.textContent = '';
        verifyApiBtn.classList.add('hidden');
    });
    
    vertexKeyFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const jsonContent = event.target.result;
                const parsed = JSON.parse(jsonContent);
                
                if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
                    throw new Error('Invalid Service Account JSON. Missing required fields.');
                }
                
                vertexServiceAccountInput.value = jsonContent;
                vertexKeyStatus.textContent = file.name;
                vertexKeyStatus.style.color = '#27ae60';
                clearVertexKeyBtn.classList.remove('hidden');
                refreshVertexModelsBtn.disabled = false;
                
                // Auto-save to localStorage
                localStorage.setItem('vertexServiceAccount', jsonContent);
                
            } catch (err) {
                alert('Error parsing JSON file: ' + err.message);
                vertexKeyStatus.textContent = 'Invalid file';
                vertexKeyStatus.style.color = '#e74c3c';
                clearVertexKeyBtn.classList.add('hidden');
                refreshVertexModelsBtn.disabled = true;
                vertexServiceAccountInput.value = '';
            }
        };
        reader.readAsText(file);
        // Reset input so the same file can be selected again if needed
        e.target.value = '';
    });

    manualSaveBtn.addEventListener('click', async () => {
        if (await saveDataToLocalStorage()) {
            updateSaveStatus('Data saved!', true, 2000);
        }
    });

    // Global autosave: any change to key inputs should trigger an autosave
    const autosaveSelectors = [
        '.soap-textarea',
        '#interventions',
        '#persistentNotes',
        '#persistentInstructionsInput',
        '#sessionInstructionsInput',
        '#sessionInfo',
        '#goalDiagnosisInput',
        '#noteNameInput',
        '#appointmentDateInput',
        '.goal-title',
        '.objective-text',
        '.picker-intervention',
        '.setting-input',
        '#addClientNameInput'
    ];

    const shouldTriggerAutoSave = (el) => {
        if (!el || !el.matches) return false;
        return autosaveSelectors.some(sel => {
            try { return el.matches(sel); } catch (e) { return false; }
        });
    };

    document.addEventListener('input', (e) => {
        if (shouldTriggerAutoSave(e.target)) markDirty();
    });
    document.addEventListener('change', (e) => {
        if (shouldTriggerAutoSave(e.target)) markDirty();
    });

    const closeHeaderMenu = () => {
        if (headerMenuDropdown) headerMenuDropdown.classList.add('hidden');
    };

    if (headerMenuBtn && headerMenuDropdown) {
        headerMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            headerMenuDropdown.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!headerMenu || !headerMenu.contains(e.target)) {
                closeHeaderMenu();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeHeaderMenu();
        });
    }

    [
        informedConsentBtn,
        soapAuditGuideBtn,
        soapInstructionsBtn,
        treatmentGoalsInstructionsBtn,
        interventionBankBtn,
        configureBackupBtn,
        clearBackupBtn,
        manualSaveBtn,
        settingsBtn,
        checkForUpdatesBtn,
        lockScreenBtn
    ].filter(Boolean).forEach(btn => {
        btn.addEventListener('click', () => {
            closeHeaderMenu();
        });
    });

    configureBackupBtn?.addEventListener('click', configureSecondaryBackupLocation);
    clearBackupBtn?.addEventListener('click', clearSecondaryBackupLocation);

    settingsBtn.addEventListener('click', async () => {
        await refreshBiometricAvailability();
        refreshBiometricSettingsUI();
        settingsModal.classList.remove('hidden');
    });

    const UPDATE_POLL_INTERVAL_MS = 30 * 60 * 1000;
    let updatePollingIntervalId = null;
    let updateCheckInProgress = false;
    let startupUpdateCheckScheduled = false;

    const setUpdateAsteriskVisibility = (isVisible) => {
        menuUpdateAsterisk?.classList.toggle('hidden', !isVisible);
        checkForUpdatesAsterisk?.classList.toggle('hidden', !isVisible);
    };

    const getUpdateReleaseNotes = (update) => {
        if (typeof update?.body !== 'string') return 'No release notes provided.';
        const notes = update.body.trim();
        return notes || 'No release notes provided.';
    };

    const promptAndInstallUpdate = async (update) => {
        const yes = await ask(`Update to ${update.version} is available!\n\nRelease notes: ${getUpdateReleaseNotes(update)}\n\nDo you want to download and install it now?`, {
            title: 'Update Available',
            kind: 'info',
        });
        if (!yes) return false;

        let downloaded = 0;
        let contentLength = 0;
        await update.downloadAndInstall((event) => {
            switch (event.event) {
                case 'Started':
                    contentLength = event.data.contentLength;
                    console.log(`started downloading ${event.data.contentLength} bytes`);
                    break;
                case 'Progress':
                    downloaded += event.data.chunkLength;
                    console.log(`downloaded ${downloaded} from ${contentLength}`);
                    break;
                case 'Finished':
                    console.log('download finished');
                    break;
            }
        });

        const restart = await ask('Update installed successfully. Do you want to restart the app now?', {
            title: 'Restart Required',
            kind: 'info',
        });
        if (restart) {
            await relaunch();
        }
        return true;
    };

    const checkForAvailableUpdate = async ({
        promptIfAvailable = false,
        showNoUpdateMessage = false,
        showErrors = false,
        setAsteriskIfAvailable = false
    } = {}) => {
        if (!isTauriRuntime()) return null;
        if (updateCheckInProgress) return null;

        updateCheckInProgress = true;
        try {
            const update = await check();
            if (update) {
                if (setAsteriskIfAvailable) {
                    setUpdateAsteriskVisibility(true);
                }
                if (promptIfAvailable) {
                    const acceptedUpdate = await promptAndInstallUpdate(update);
                    if (!acceptedUpdate) {
                        setUpdateAsteriskVisibility(true);
                    }
                }
                return update;
            }

            setUpdateAsteriskVisibility(false);
            if (showNoUpdateMessage) {
                await message('You are on the latest version.', { title: 'No Updates Available', kind: 'info' });
            }
            return null;
        } catch (error) {
            console.error('Failed to check for updates:', error);
            if (showErrors) {
                await message(`Failed to check for updates: ${error.message || error}`, { title: 'Error', kind: 'error' });
            }
            return null;
        } finally {
            updateCheckInProgress = false;
        }
    };

    const scheduleStartupUpdateCheck = () => {
        if (!isTauriRuntime() || startupUpdateCheckScheduled) return;
        startupUpdateCheckScheduled = true;
        setTimeout(() => {
            void checkForAvailableUpdate({
                promptIfAvailable: true,
                showNoUpdateMessage: false,
                showErrors: false,
                setAsteriskIfAvailable: false
            });
        }, 1200);
    };

    const startRecurringUpdateChecks = () => {
        if (!isTauriRuntime() || updatePollingIntervalId) return;
        updatePollingIntervalId = setInterval(() => {
            void checkForAvailableUpdate({
                promptIfAvailable: false,
                showNoUpdateMessage: false,
                showErrors: false,
                setAsteriskIfAvailable: true
            });
        }, UPDATE_POLL_INTERVAL_MS);
    };

    setUpdateAsteriskVisibility(false);
    loadAutoBackupPathFromStorage();

    checkForUpdatesBtn?.addEventListener('click', async () => {
        await checkForAvailableUpdate({
            promptIfAvailable: true,
            showNoUpdateMessage: true,
            showErrors: true,
            setAsteriskIfAvailable: true
        });
    });

    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
    lockScreenBtn.addEventListener('click', () => lockApp());
    settingsModal.addEventListener('click', (e) => {
        if(e.target.id === 'settingsModal') {
            settingsModal.classList.add('hidden');
        }
    });

    informedConsentBtn.addEventListener('click', () => informedConsentModal.classList.remove('hidden'));
    closeConsentBtn.addEventListener('click', () => informedConsentModal.classList.add('hidden'));
    copyConsentNotationBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(INFORMED_CONSENT_CONVERSATION_NOTATION);
            const originalText = copyConsentNotationBtn.textContent;
            copyConsentNotationBtn.textContent = 'Notation Copied!';
            setTimeout(() => {
                copyConsentNotationBtn.textContent = originalText;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy informed consent notation:', err);
            alert('Could not copy notation to clipboard.');
        }
    });
    closeConsentBtnBottom.addEventListener('click', () => informedConsentModal.classList.add('hidden'));
    informedConsentModal.addEventListener('click', (e) => {
        if(e.target.id === 'informedConsentModal') {
            informedConsentModal.classList.add('hidden');
        }
    });
    soapAuditGuideBtn.addEventListener('click', () => soapAuditGuideModal.classList.remove('hidden'));
    closeSoapAuditGuideBtn.addEventListener('click', () => soapAuditGuideModal.classList.add('hidden'));
    closeSoapAuditGuideBtnBottom.addEventListener('click', () => soapAuditGuideModal.classList.add('hidden'));
    soapAuditGuideModal.addEventListener('click', (e) => {
        if (e.target.id === 'soapAuditGuideModal') {
            soapAuditGuideModal.classList.add('hidden');
        }
    });
    const renderInstructionSections = (container, defs, values) => {
        if (!container) return;
        const normalizedValues = normalizeInstructionSections(values, defs);
        container.innerHTML = '';

        defs.forEach(def => {
            const value = normalizedValues[def.key] || '';
            if (def.hideWhenEmpty && !value.trim()) return;

            const field = document.createElement('div');
            field.className = 'instructions-field';

            const label = document.createElement('label');
            label.htmlFor = `${container.id}-${def.key}`;
            label.textContent = def.label;

            const help = document.createElement('div');
            help.className = 'instructions-help';
            help.textContent = def.description;

            const textarea = document.createElement('textarea');
            textarea.id = `${container.id}-${def.key}`;
            textarea.className = 'instructions-section-input';
            textarea.dataset.instructionKey = def.key;
            textarea.rows = def.rows || 4;
            textarea.value = value;

            field.appendChild(label);
            field.appendChild(help);
            field.appendChild(textarea);
            container.appendChild(field);
        });
    };

    const readInstructionSections = (container, defs) => normalizeInstructionSections(
        defs.reduce((acc, def) => {
            const input = container?.querySelector(`[data-instruction-key="${def.key}"]`);
            acc[def.key] = input ? input.value.trim() : '';
            return acc;
        }, {}),
        defs
    );

    const openInstructionEditorModal = (modal, container, defs, values) => {
        renderInstructionSections(container, defs, values);
        modal?.classList.remove('hidden');
        const firstInput = container?.querySelector('textarea');
        firstInput?.focus();
    };

    const applySoapInstructions = (sections) => {
        const nextSections = normalizeInstructionSections(sections, SOAP_INSTRUCTION_SECTION_DEFS);
        const nextPrompt = buildSoapSystemPrompt(nextSections);
        systemPrompt = nextPrompt;
        if (!data.aiInstructions || typeof data.aiInstructions !== 'object') {
            data.aiInstructions = {};
        }
        data.aiInstructions.soapPromptSections = nextSections;
        data.aiInstructions.soapSystemPrompt = nextPrompt;
        markDirty();
    };
    const applyTreatmentGoalsInstructions = (sections) => {
        const nextSections = normalizeInstructionSections(sections, TREATMENT_GOAL_INSTRUCTION_SECTION_DEFS);
        const nextPrompt = buildTreatmentGoalSystemPrompt(nextSections);
        goalGenerationSystemPrompt = nextPrompt;
        if (!data.aiInstructions || typeof data.aiInstructions !== 'object') {
            data.aiInstructions = {};
        }
        data.aiInstructions.treatmentGoalsPromptSections = nextSections;
        data.aiInstructions.treatmentGoalsSystemPrompt = nextPrompt;
        markDirty();
    };
    soapInstructionsBtn?.addEventListener('click', () => {
        openInstructionEditorModal(
            soapInstructionsModal,
            soapInstructionsSectionsEl,
            SOAP_INSTRUCTION_SECTION_DEFS,
            data.aiInstructions?.soapPromptSections || getDefaultSoapInstructionSections()
        );
    });
    closeSoapInstructionsBtn?.addEventListener('click', () => soapInstructionsModal?.classList.add('hidden'));
    soapInstructionsModal?.addEventListener('click', (e) => {
        if (e.target.id === 'soapInstructionsModal') {
            soapInstructionsModal.classList.add('hidden');
        }
    });
    saveSoapInstructionsBtn?.addEventListener('click', () => {
        applySoapInstructions(readInstructionSections(soapInstructionsSectionsEl, SOAP_INSTRUCTION_SECTION_DEFS));
        soapInstructionsModal?.classList.add('hidden');
    });
    resetSoapInstructionsBtn?.addEventListener('click', () => {
        applySoapInstructions(getDefaultSoapInstructionSections());
        soapInstructionsModal?.classList.add('hidden');
    });
    treatmentGoalsInstructionsBtn?.addEventListener('click', () => {
        openInstructionEditorModal(
            treatmentGoalsInstructionsModal,
            treatmentGoalsInstructionsSectionsEl,
            TREATMENT_GOAL_INSTRUCTION_SECTION_DEFS,
            data.aiInstructions?.treatmentGoalsPromptSections || getDefaultTreatmentGoalInstructionSections()
        );
    });
    closeTreatmentGoalsInstructionsBtn?.addEventListener('click', () => treatmentGoalsInstructionsModal?.classList.add('hidden'));
    treatmentGoalsInstructionsModal?.addEventListener('click', (e) => {
        if (e.target.id === 'treatmentGoalsInstructionsModal') {
            treatmentGoalsInstructionsModal.classList.add('hidden');
        }
    });
    saveTreatmentGoalsInstructionsBtn?.addEventListener('click', () => {
        applyTreatmentGoalsInstructions(readInstructionSections(treatmentGoalsInstructionsSectionsEl, TREATMENT_GOAL_INSTRUCTION_SECTION_DEFS));
        treatmentGoalsInstructionsModal?.classList.add('hidden');
    });
    resetTreatmentGoalsInstructionsBtn?.addEventListener('click', () => {
        applyTreatmentGoalsInstructions(getDefaultTreatmentGoalInstructionSections());
        treatmentGoalsInstructionsModal?.classList.add('hidden');
    });
    openSoapConfigurationBtn?.addEventListener('click', () => {
        normalizeSoapPlatforms();
        activeSoapPlatformId = getSoapPlatformById(activeSoapPlatformId)?.id || getDefaultSoapPlatformId();
        renderSoapPlatformConfiguration();
        renderClientSoapPlatformOptions(clientSoapPlatformSelect?.value || '');
        settingsModal?.classList.add('hidden');
        soapConfigurationModal?.classList.remove('hidden');
    });
    closeSoapConfigurationBtn?.addEventListener('click', () => soapConfigurationModal?.classList.add('hidden'));
    doneSoapConfigurationBtn?.addEventListener('click', () => soapConfigurationModal?.classList.add('hidden'));
    soapConfigurationModal?.addEventListener('click', event => {
        if (event.target.id === 'soapConfigurationModal') soapConfigurationModal.classList.add('hidden');
    });
    soapPlatformSelect?.addEventListener('change', () => {
        activeSoapPlatformId = soapPlatformSelect.value;
        renderSoapPlatformConfiguration();
    });
    saveSoapPlatformNameBtn?.addEventListener('click', () => {
        const platform = getActiveSoapPlatform();
        const name = soapPlatformNameInput.value.trim();
        if (!platform) return;
        if (!name) {
            alert('Enter a platform name before saving.');
            soapPlatformNameInput.focus();
            return;
        }
        platform.name = name;
        markDirty();
        renderSoapPlatformConfiguration();
        renderClientSoapPlatformOptions(clientSoapPlatformSelect?.value || '');
        renderSoap();
    });
    addSoapPlatformBtn?.addEventListener('click', () => {
        const name = newSoapPlatformNameInput.value.trim();
        if (!name) {
            alert('Enter a platform name before adding it.');
            newSoapPlatformNameInput.focus();
            return;
        }
        const platform = {
            id: createSoapPlatformId(),
            name,
            sections: SOAP_PLATFORM_DEFAULT_ORDER.map(key => ({ key, enabled: true }))
        };
        data.soapPlatforms.push(platform);
        activeSoapPlatformId = platform.id;
        newSoapPlatformNameInput.value = '';
        markDirty();
        renderSoapPlatformConfiguration();
        renderClientSoapPlatformOptions(clientSoapPlatformSelect?.value || '');
        renderSoap();
    });
    deleteSoapPlatformBtn?.addEventListener('click', () => {
        if ((data.soapPlatforms || []).length <= 1) {
            alert('Keep at least one SOAP platform configuration.');
            return;
        }
        const platform = getActiveSoapPlatform();
        if (!platform || !confirm(`Delete the ${platform.name} SOAP platform configuration?`)) return;
        data.soapPlatforms = data.soapPlatforms.filter(item => item.id !== platform.id);
        [...(data.clients || []), ...(data.archivedClients || [])].forEach(client => {
            if (client.soapPlatformId === platform.id) client.soapPlatformId = '';
        });
        activeSoapPlatformId = getDefaultSoapPlatformId();
        markDirty();
        renderSoapPlatformConfiguration();
        renderClientSoapPlatformOptions(clientSoapPlatformSelect?.value || '');
        renderSoap();
    });
    customInstructionsBtn.addEventListener('click', () => {
        const client = findClient(selectedClientId);
        const appointment = findAppointment(client, selectedAppointmentId);
        const clientLens = getClientGoalGenerationLens(client);
        goalGeneratorModalities = [...clientLens.modalities];
        goalGeneratorModalityOther = clientLens.other || '';
        persistentInstructions = client ? client.persistentInstructions || '' : '';
        sessionInstructions = appointment ? appointment.sessionInstructions || '' : '';
        const clientPronouns = getClientPreferredPronouns(client);
        preferredPronouns = clientPronouns.value;
        customPronounSubject = clientPronouns.subject;
        customPronounObject = clientPronouns.object;
        customPronounPossessive = clientPronouns.possessive;
        clientSessionTypeSelect.value = hasAssignedClientSessionType(client) ? getClientSessionType(client) : '';
        sessionMembersDraft = normalizeSessionMembers(client?.sessionMembers);
        renderClientSoapPlatformOptions(client?.soapPlatformId || '');
        customInstructionsModal.classList.remove('hidden');
        persistentInstructionsInput.value = persistentInstructions;
        sessionInstructionsInput.value = sessionInstructions;
        preferredPronounsSelect.value = preferredPronouns;
        customPronounSubjectInput.value = customPronounSubject;
        customPronounObjectInput.value = customPronounObject;
        customPronounPossessiveInput.value = customPronounPossessive;
        updatePronounCustomInputsState();
        renderSessionMembers();
        sessionInstructionsInput.disabled = !appointment;
        sessionInstructionsInput.placeholder = appointment
            ? 'Applies only to the selected appointment/session.'
            : 'Select an appointment to edit Session Instructions.';
        renderCustomInstructionsModalities();
        persistentInstructionsInput.focus();
    });
    closeCustomInstructionsBtn.addEventListener('click', () => customInstructionsModal.classList.add('hidden'));
    customInstructionsModal.addEventListener('click', (e) => {
        if(e.target.id === 'customInstructionsModal') {
            customInstructionsModal.classList.add('hidden');
        }
    });
    const updatePronounCustomInputsState = () => {
        const isCustom = preferredPronounsSelect.value === 'custom';
        customPronounsWrapEl.classList.toggle('hidden', !isCustom);
        customPronounSubjectInput.disabled = !isCustom;
        customPronounObjectInput.disabled = !isCustom;
        customPronounPossessiveInput.disabled = !isCustom;
    };
    const updateSessionMemberCustomInputsState = (row) => {
        if (!row) return;
        const isCustom = row.querySelector('.session-member-pronouns')?.value === 'custom';
        row.querySelector('.session-member-custom-pronouns')?.classList.toggle('hidden', !isCustom);
        row.querySelectorAll('.session-member-pronoun-custom-input').forEach(input => {
            input.disabled = !isCustom;
        });
    };
    const syncSessionMembersDraftFromDom = () => {
        if (!sessionMembersListEl) return;
        const rows = Array.from(sessionMembersListEl.querySelectorAll('.session-member-row'));
        sessionMembersDraft = rows.map((row, index) => {
            const existing = sessionMembersDraft[index] || createEmptySessionMember();
            return {
                id: existing.id || crypto.randomUUID(),
                name: row.querySelector('.session-member-name')?.value.trim() || '',
                role: row.querySelector('.session-member-role')?.value.trim() || '',
                preferredPronouns: {
                    value: row.querySelector('.session-member-pronouns')?.value || '',
                    subject: row.querySelector('.session-member-pronoun-subject')?.value.trim() || '',
                    object: row.querySelector('.session-member-pronoun-object')?.value.trim() || '',
                    possessive: row.querySelector('.session-member-pronoun-possessive')?.value.trim() || ''
                }
            };
        });
    };
    const ensureSessionMembersDraftMinimum = () => {
        while (sessionMembersDraft.length < 2) {
            sessionMembersDraft.push(createEmptySessionMember());
        }
    };
    const renderSessionMembers = () => {
        if (!sessionMembersWrapEl || !sessionMembersListEl) return;
        const groupSession = clientSessionTypeSelect.value === 'couple' || clientSessionTypeSelect.value === 'family';
        clientPreferredPronounsWrapEl?.classList.toggle('hidden', groupSession);
        sessionMembersWrapEl.classList.toggle('hidden', !groupSession);
        if (!groupSession) {
            sessionMembersListEl.innerHTML = '';
            return;
        }

        ensureSessionMembersDraftMinimum();
        const familySession = clientSessionTypeSelect.value === 'family';
        sessionMembersListEl.innerHTML = sessionMembersDraft.map((member, index) => {
            const pronouns = normalizePreferredPronounRecord(member.preferredPronouns);
            const isCustom = pronouns.value === 'custom';
            return `
                <div class="session-member-row" data-session-member-index="${index}">
                    <div class="session-member-heading">
                        <span>Member ${index + 1}</span>
                        <button type="button" class="session-member-remove-btn remove-session-member-btn" ${sessionMembersDraft.length <= 2 ? 'disabled' : ''}>Remove</button>
                    </div>
                    <div class="session-member-fields">
                        <input class="setting-input session-member-name" type="text" required value="${escapeGoalDraftHtml(member.name)}" placeholder="Name (e.g., Ted)" aria-label="Session member ${index + 1} name">
                        ${familySession ? `<input class="setting-input session-member-role" type="text" required value="${escapeGoalDraftHtml(member.role)}" placeholder="Role (e.g., parent, child)" aria-label="Session member ${index + 1} role">` : ''}
                        <select class="setting-input session-member-pronouns" required aria-label="Session member ${index + 1} pronouns">
                            ${getPronounSelectOptionsMarkup(pronouns.value)}
                        </select>
                    </div>
                    <div class="session-member-custom-pronouns ${isCustom ? '' : 'hidden'}">
                        <div>
                            <label>Subject (e.g., ze)</label>
                            <input class="setting-input session-member-pronoun-custom-input session-member-pronoun-subject" type="text" value="${escapeGoalDraftHtml(pronouns.subject)}" placeholder="ze" ${isCustom ? '' : 'disabled'}>
                        </div>
                        <div>
                            <label>Object (e.g., hir)</label>
                            <input class="setting-input session-member-pronoun-custom-input session-member-pronoun-object" type="text" value="${escapeGoalDraftHtml(pronouns.object)}" placeholder="hir" ${isCustom ? '' : 'disabled'}>
                        </div>
                        <div>
                            <label>Possessive (e.g., hir)</label>
                            <input class="setting-input session-member-pronoun-custom-input session-member-pronoun-possessive" type="text" value="${escapeGoalDraftHtml(pronouns.possessive)}" placeholder="hir" ${isCustom ? '' : 'disabled'}>
                        </div>
                    </div>
                </div>`;
        }).join('');
    };
    sessionMembersListEl?.addEventListener('input', event => {
        if (event.target.closest('.session-member-row')) syncSessionMembersDraftFromDom();
    });
    sessionMembersListEl?.addEventListener('change', event => {
        const row = event.target.closest('.session-member-row');
        if (!row) return;
        updateSessionMemberCustomInputsState(row);
        syncSessionMembersDraftFromDom();
    });
    sessionMembersListEl?.addEventListener('click', event => {
        const removeButton = event.target.closest('.remove-session-member-btn');
        if (!removeButton || removeButton.disabled) return;
        syncSessionMembersDraftFromDom();
        const row = removeButton.closest('.session-member-row');
        const index = row ? parseInt(row.dataset.sessionMemberIndex, 10) : -1;
        if (index < 0 || sessionMembersDraft.length <= 2) return;
        sessionMembersDraft.splice(index, 1);
        renderSessionMembers();
    });
    addSessionMemberBtn?.addEventListener('click', () => {
        syncSessionMembersDraftFromDom();
        sessionMembersDraft.push(createEmptySessionMember());
        renderSessionMembers();
        sessionMembersListEl?.lastElementChild?.querySelector('.session-member-name')?.focus();
    });
    clientSessionTypeSelect.addEventListener('change', () => {
        syncSessionMembersDraftFromDom();
        renderSessionMembers();
    });
    preferredPronounsSelect.addEventListener('change', () => {
        updatePronounCustomInputsState();
    });
    saveCustomInstructionsBtn.addEventListener('click', () => {
        syncSessionMembersDraftFromDom();
        persistentInstructions = persistentInstructionsInput.value;
        sessionInstructions = sessionInstructionsInput.value;
        preferredPronouns = preferredPronounsSelect.value;
        customPronounSubject = customPronounSubjectInput.value.trim();
        customPronounObject = customPronounObjectInput.value.trim();
        customPronounPossessive = customPronounPossessiveInput.value.trim();

        if (clientSessionTypeSelect.value === 'individual' && preferredPronouns === 'custom') {
            const missing = [];
            if (!customPronounSubject) missing.push('subject pronoun');
            if (!customPronounObject) missing.push('object pronoun');
            if (!customPronounPossessive) missing.push('possessive form');
            if (missing.length > 0) {
                alert(`Custom pronouns require all three fields: subject, object, and possessive. Missing: ${missing.join(', ')}.`);
                const firstMissingInput = !customPronounSubject
                    ? customPronounSubjectInput
                    : !customPronounObject
                        ? customPronounObjectInput
                        : customPronounPossessiveInput;
                firstMissingInput.focus();
                return;
            }
        }

        customInstructionsModal.classList.add('hidden');
        const client = findClient(selectedClientId);
        const appointment = findAppointment(client, selectedAppointmentId);
        if (client) {
            client.persistentInstructions = persistentInstructions;
            client.sessionType = normalizeClientSessionType(clientSessionTypeSelect.value);
            client.sessionTypeAssigned = clientSessionTypeSelect.value === 'individual'
                || clientSessionTypeSelect.value === 'couple'
                || clientSessionTypeSelect.value === 'family';
            client.sessionMembers = normalizeSessionMembers(sessionMembersDraft);
            client.soapPlatformId = getSoapPlatformById(clientSoapPlatformSelect.value)?.id || '';
            if (clientSessionTypeSelect.value === 'individual') {
                client.preferredPronouns = {
                    value: preferredPronouns,
                    subject: preferredPronouns === 'custom' ? customPronounSubject : '',
                    object: preferredPronouns === 'custom' ? customPronounObject : '',
                    possessive: preferredPronouns === 'custom' ? customPronounPossessive : ''
                };
            }
        }
        if (appointment) {
            appointment.sessionInstructions = sessionInstructions;
            if (!appointment.sessionInstructions.trim()) delete appointment.sessionInstructions;
            if (appointment.customInstructions !== undefined) delete appointment.customInstructions;
        }
        markDirty();
        renderInterventionPicker();
        renderSoap();
    });
    clearCustomInstructionsBtn.addEventListener('click', () => {
        persistentInstructionsInput.value = '';
        sessionInstructionsInput.value = '';
        preferredPronounsSelect.value = '';
        customPronounSubjectInput.value = '';
        customPronounObjectInput.value = '';
        customPronounPossessiveInput.value = '';
        clientSessionTypeSelect.value = '';
        sessionMembersDraft = [];
        persistentInstructions = '';
        sessionInstructions = '';
        preferredPronouns = '';
        customPronounSubject = '';
        customPronounObject = '';
        customPronounPossessive = '';
        clientSoapPlatformSelect.value = '';
        updatePronounCustomInputsState();
        const client = findClient(selectedClientId);
        const appointment = findAppointment(client, selectedAppointmentId);
        if (client) {
            client.persistentInstructions = '';
            client.sessionType = 'individual';
            client.sessionTypeAssigned = false;
            client.sessionMembers = [];
            client.soapPlatformId = '';
            client.preferredPronouns = {
                value: '',
                subject: '',
                object: '',
                possessive: ''
            };
        }
        if (appointment) {
            delete appointment.sessionInstructions;
            if (appointment.customInstructions !== undefined) delete appointment.customInstructions;
        }
        renderSessionMembers();
        markDirty();
        renderInterventionPicker();
        renderSoap();
    });
    customInstructionsModalitiesListEl.addEventListener('change', (e) => {
        if (!e.target.matches('.custom-instructions-modality-select')) return;
        saveCustomInstructionsModalities();
    });
    customInstructionsModalitiesListEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-custom-modality-btn')) {
            goalGeneratorModalities.push(DEFAULT_GUIDING_MODALITIES[0]);
            renderCustomInstructionsModalities();
            saveClientGoalGenerationLens();
            return;
        }
        if (e.target.classList.contains('remove-custom-modality-btn')) {
            if (goalGeneratorModalities.length <= 1) return;
            const row = e.target.closest('.modality-row');
            const index = row ? parseInt(row.dataset.modalInstructionsIndex, 10) : -1;
            if (index >= 0) {
                goalGeneratorModalities.splice(index, 1);
                if (!goalGeneratorModalities.includes('Other (Specify)')) {
                    goalGeneratorModalityOther = '';
                }
                renderCustomInstructionsModalities();
                saveClientGoalGenerationLens();
            }
        }
    });
    customInstructionsModalityOtherEl.addEventListener('input', () => {
        goalGeneratorModalityOther = customInstructionsModalityOtherEl.value;
        saveClientGoalGenerationLens();
    });
    modelSelect.addEventListener('change', (e) => {
        selectedModel = e.target.value;
        if (apiProvider === 'openwebui') {
            localStorage.setItem('openWebUIModel', selectedModel);
        } else if (apiProvider === 'ollama') {
            localStorage.setItem('ollamaModel', selectedModel);
        }
        fullRender();
    });

    openaiModelInput.addEventListener('change', (e) => {
        selectedModel = e.target.value;
        localStorage.setItem('openaiModel', selectedModel);
        fullRender();
    });

    vertexModelInput.addEventListener('change', (e) => {
        selectedModel = e.target.value;
        localStorage.setItem('vertexModel', selectedModel);
        vertexModelStatus.textContent = `${selectedModel} selected. Press Verify to confirm access in ${vertexLocation}.`;
        vertexModelStatus.style.color = 'var(--text-color-secondary)';
        verifyApiBtn.classList.remove('hidden');
        fullRender();
    });

    const toggleProviderSettings = () => {
        const provider = apiProviderSelect.value;
        apiProvider = provider;
        openwebuiSettings.classList.add('hidden');
        if (ollamaSettings) ollamaSettings.classList.add('hidden');
        vertexSettings.classList.add('hidden');
        openaiSettings.classList.add('hidden');
        modelSelectWrapper.classList.add('hidden'); // This is for OpenWebUI/Ollama

        if (provider === 'openwebui') {
            openwebuiSettings.classList.remove('hidden');
            modelSelectWrapper.classList.remove('hidden'); // Show the OpenWebUI model select
        } else if (provider === 'ollama') {
            if (ollamaSettings) ollamaSettings.classList.remove('hidden');
            modelSelectWrapper.classList.remove('hidden'); // Ollama also uses the shared model select
        } else if (provider === 'vertex') {
            vertexSettings.classList.remove('hidden');
        } else if (provider === 'openai') {
            openaiSettings.classList.remove('hidden');
        }
    };
    apiProviderSelect.addEventListener('change', toggleProviderSettings);

    // --- Theme Management ---
    const THEME_PREFERENCES = new Set(['light', 'dark', 'automatic']);
    const getStoredThemePreference = () => {
        const savedTheme = localStorage.getItem('theme');
        return THEME_PREFERENCES.has(savedTheme) ? savedTheme : 'automatic';
    };

    const updateThemeButton = () => {
        const savedTheme = getStoredThemePreference();
        themeToggleBtn.value = savedTheme;
        themeToggleBtn.title = savedTheme === 'automatic'
            ? 'Follow system appearance settings'
            : savedTheme === 'dark'
                ? 'Use night mode'
                : 'Use day mode';
    };

    const updateTaskbarTheme = async (effectiveTheme) => {
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            const color = effectiveTheme === 'dark' ? '#1a2533' : '#667eea';
            themeColorMeta.setAttribute('content', color);
        }

        document.documentElement.style.colorScheme = effectiveTheme;

        try {
            await getCurrentWindow().setTheme(effectiveTheme === 'dark' ? 'dark' : 'light');
        } catch (error) {
            // Ignore when running in a browser context without Tauri window APIs.
        }
    };

    const applyTheme = (theme) => {
        const selectedTheme = THEME_PREFERENCES.has(theme) ? theme : 'automatic';
        const previousTheme = getRichNoteTheme(document.body.dataset.theme);
        let effectiveTheme;
        if (selectedTheme === 'automatic') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            effectiveTheme = prefersDark ? 'dark' : 'light';
        } else {
            effectiveTheme = selectedTheme;
        }
        document.body.dataset.theme = effectiveTheme;
        if (previousTheme !== effectiveTheme) {
            const colorsChanged = updateRichNoteColorsForTheme(persistentNotesEl, previousTheme, effectiveTheme);
            updateRichNoteColorInputForTheme(persistentNotesEl, previousTheme, effectiveTheme);
            if (colorsChanged) {
                const client = recordViewClearedForSelectedClient ? null : findClient(selectedClientId);
                if (client) {
                    client.persistentNotes = getRichNoteEditorValue(persistentNotesEl);
                    markDirty();
                }
            }
        }
        localStorage.setItem('theme', selectedTheme);
        updateTaskbarTheme(effectiveTheme);
        updateThemeButton();
        syncEmbeddedTheme(effectiveTheme);
    };

    const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemThemeQuery.addEventListener('change', () => {
        if (getStoredThemePreference() === 'automatic') {
            applyTheme('automatic');
        }
    });

    themeToggleBtn.addEventListener('change', event => applyTheme(event.target.value));

    // --- Collapsible Sections ---
    const handleCollapsibleClick = (e) => {
        const sectionToggleBtn = e.target.closest('.section-collapser-btn');
        if (sectionToggleBtn) {
            const sectionContainer = sectionToggleBtn.closest('.section-collapser');
            const sectionKey = sectionToggleBtn.dataset.sectionKey;
            if (!sectionContainer || !sectionKey) return;

            const shouldCollapse = !sectionContainer.classList.contains('section-collapsed');
            sectionContainer.classList.toggle('section-collapsed', shouldCollapse);
            sectionToggleBtn.setAttribute('aria-expanded', String(!shouldCollapse));
            localStorage.setItem(`${sectionKey}Collapsed`, String(shouldCollapse));
            return;
        }

        const header = e.target.closest('.collapsible-header');
        if (!header) return;

        const targetId = header.dataset.target;
        const content = document.getElementById(targetId);
        const icon = header.querySelector('.collapse-icon');
        const wrapper = header.parentElement;

        if (content && icon) {
            const isCollapsed = content.classList.contains('collapsed');
            
            if (isCollapsed) {
                // Expand - restore original size and remove pinning
                content.classList.remove('collapsed', 'pinned');
                icon.classList.remove('collapsed');
                wrapper.style.flexBasis = '33.33%';
                wrapper.style.minHeight = '';
                wrapper.style.maxHeight = '';
                wrapper.style.order = ''; // Reset order
            } else {
                // Collapse - add pinning class and force minimal size
                content.classList.add('collapsed', 'pinned');
                icon.classList.add('collapsed');
                wrapper.style.flexBasis = '50px';
                wrapper.style.minHeight = '50px';
                wrapper.style.maxHeight = '50px';
                // Order is now handled by CSS class
                wrapper.style.order = ''; // Clear inline order to let CSS handle it
            }
            
            // Save collapsed state
            const sectionName = targetId.replace('Content', '');
            localStorage.setItem(`${sectionName}Collapsed`, !isCollapsed);
            saveColumnSizes(); // Update saved sizes
        }
    };

    // Add event listeners for collapsible headers
    document.addEventListener('click', handleCollapsibleClick);

    // Load collapsed states
    const loadCollapsedStates = () => {
        const notesCollapsed = localStorage.getItem('notesCollapsed') === 'true';

        if (notesCollapsed) {
            const notesContent = document.getElementById('notesContent');
            const notesIcon = document.querySelector('[data-target="notesContent"] .collapse-icon');
            const notesWrapper = document.getElementById('notesWrapper');
            
            notesContent?.classList.add('collapsed', 'pinned');
            notesIcon?.classList.add('collapsed');
            if (notesWrapper) {
                notesWrapper.style.flexBasis = '50px';
                notesWrapper.style.minHeight = '50px';
                notesWrapper.style.maxHeight = '50px';
                notesWrapper.style.order = ''; // Clear order to let CSS handle it
            }
        }

        [
            deletedClientsToggleBtn,
            archivedClientsToggleBtn,
            deletedAppointmentsToggleBtn,
            goalsListToggleBtn
        ].forEach(button => {
            if (!button) return;
            const sectionKey = button.dataset.sectionKey;
            if (!sectionKey) return;
            const shouldCollapse = localStorage.getItem(`${sectionKey}Collapsed`) === 'true';
            const sectionContainer = button.closest('.section-collapser');
            if (!sectionContainer) return;
            sectionContainer.classList.toggle('section-collapsed', shouldCollapse);
            button.setAttribute('aria-expanded', String(!shouldCollapse));
        });
    };

    // --- Resizable Panels ---
    function saveColumnSizes() {
        const panels = ['panelClients', 'panelAppointments', 'panelSession', 'panelSoap'];
        const sizes = panels.map(id => document.getElementById(id).style.flexBasis);
        localStorage.setItem('columnSizes', JSON.stringify(sizes));
        const sessionInfoHeight = document.getElementById('sessionInfoWrapper').style.flexBasis;
        const notesHeight = document.getElementById('notesWrapper').style.flexBasis;
        localStorage.setItem('rowSizes', JSON.stringify({ sessionInfoHeight, notesHeight }));
    }

    function loadColumnSizes() {
        const sizes = JSON.parse(localStorage.getItem('columnSizes'));
        if (sizes && sizes.length === 4) {
            ['panelClients', 'panelAppointments', 'panelSession', 'panelSoap'].forEach((id, index) => {
                const panel = document.getElementById(id);
                if (panel) panel.style.flexBasis = sizes[index];
            });
        }
        const rowSizes = JSON.parse(localStorage.getItem('rowSizes'));
        if (rowSizes) {
            const sessionWrapper = document.getElementById('sessionInfoWrapper');
            const notesWrapper = document.getElementById('notesWrapper');
            if (sessionWrapper) sessionWrapper.style.flexBasis = rowSizes.sessionInfoHeight;
            if (notesWrapper) notesWrapper.style.flexBasis = rowSizes.notesHeight;
        }
    }

    function makeResizable(resizer, prev, next, direction = 'x') {
        let x = 0;
        let y = 0;
        let prevSize = 0;
        let nextSize = 0;
        let containerSize = 0;

        resizer.addEventListener('mousedown', function (e) {
            e.preventDefault();
            if (direction === 'x') {
                x = e.clientX;
                prevSize = prev.getBoundingClientRect().width;
                nextSize = next.getBoundingClientRect().width;
                containerSize = prev.parentElement.getBoundingClientRect().width;
            } else {
                y = e.clientY;
                prevSize = prev.getBoundingClientRect().height;
                nextSize = next.getBoundingClientRect().height;
                containerSize = prev.parentElement.getBoundingClientRect().height;
            }
            
            document.body.style.cursor = direction === 'x' ? 'col-resize' : 'row-resize';
            document.body.style.userSelect = 'none';

            document.addEventListener('mousemove', mousemove);
            document.addEventListener('mouseup', mouseup);
        });

        function mousemove(e) {
            if (direction === 'x') {
                const dx = e.clientX - x;
                const newPrevSize = prevSize + dx;
                const newNextSize = nextSize - dx;
                const prevMinWidth = prev.classList.contains('column-collapsed')
                    ? 0
                    : (parseFloat(getComputedStyle(prev).minWidth) || 150);
                const nextMinWidth = next.classList.contains('column-collapsed')
                    ? 0
                    : (parseFloat(getComputedStyle(next).minWidth) || 150);
                
                if (newPrevSize >= prevMinWidth && newNextSize >= nextMinWidth) {
                    prev.style.flexBasis = `${(newPrevSize / containerSize) * 100}%`;
                    next.style.flexBasis = `${(newNextSize / containerSize) * 100}%`;
                }
            } else {
                const dy = e.clientY - y;
                const newPrevSize = prevSize + dy;
                const newNextSize = nextSize - dy;

                if(newPrevSize > 100 && newNextSize > 100) {
                    prev.style.flexBasis = `${(newPrevSize / containerSize) * 100}%`;
                    next.style.flexBasis = `${(newNextSize / containerSize) * 100}%`;
                }
            }
        }

        function mouseup() {
            document.removeEventListener('mousemove', mousemove);
            document.removeEventListener('mouseup', mouseup);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
            saveColumnSizes();
        }
    }

    const COLUMN_DEFAULT_BASIS = {
        panelClients: '20%',
        panelAppointments: '20%',
        panelSession: '30%',
        panelSoap: '30%'
    };

    const COLUMN_TOGGLE_BUTTON_MAP = {
        panelClients: 'columnToggleClients',
        panelAppointments: 'columnToggleAppointments',
        panelSession: 'columnToggleNotes',
        panelSoap: 'columnToggleSoap'
    };

    const getPanelCurrentBasis = (panelId) => {
        const panel = document.getElementById(panelId);
        if (!panel) return COLUMN_DEFAULT_BASIS[panelId] || '25%';
        if (panel.style.flexBasis) return panel.style.flexBasis;
        const mainGrid = document.getElementById('mainGrid');
        const gridWidth = mainGrid?.getBoundingClientRect().width || 1;
        const panelWidth = panel.getBoundingClientRect().width;
        const asPercent = Math.max(0, (panelWidth / gridWidth) * 100);
        return `${asPercent.toFixed(2)}%`;
    };

    const setColumnCollapsed = (panelId, shouldCollapse) => {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        if (shouldCollapse) {
            const basis = getPanelCurrentBasis(panelId);
            if (basis && basis !== '0px' && basis !== '0%') {
                panel.dataset.expandedBasis = basis;
            }
            panel.classList.add('column-collapsed');
            panel.style.flexGrow = '0';
            panel.style.flexShrink = '0';
            panel.style.flexBasis = '0px';
            panel.style.minWidth = '0';
        } else {
            panel.classList.remove('column-collapsed');
            panel.style.flexGrow = '';
            panel.style.flexShrink = '';
            panel.style.minWidth = '';
            panel.style.flexBasis = panel.dataset.expandedBasis || COLUMN_DEFAULT_BASIS[panelId] || '25%';
        }
    };

    const refreshResizerToggleIcons = () => {
        const columnDisplayNames = {
            panelClients: 'Clients',
            panelAppointments: 'Appointments',
            panelSession: 'Notes',
            panelSoap: 'SOAP'
        };

        Object.entries(COLUMN_TOGGLE_BUTTON_MAP).forEach(([panelId, buttonId]) => {
            const panel = document.getElementById(panelId);
            const button = document.getElementById(buttonId);
            if (!panel || !button) return;

            const columnName = columnDisplayNames[panelId] || 'Column';
            const isHidden = panel.classList.contains('column-collapsed');
            button.classList.toggle('is-hidden', isHidden);
            button.classList.toggle('is-shown', !isHidden);
            button.title = `${isHidden ? 'Show' : 'Hide'} ${columnName}`;
            button.setAttribute('aria-label', button.title);
        });
    };

    const saveCollapsedColumns = () => {
        const collapsed = {};
        Object.keys(COLUMN_TOGGLE_BUTTON_MAP).forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (!panel) return;
            collapsed[panelId] = panel.classList.contains('column-collapsed');
        });
        localStorage.setItem('collapsedColumns', JSON.stringify(collapsed));
    };

    const initializeColumnCollapsers = () => {
        const collapsed = JSON.parse(localStorage.getItem('collapsedColumns') || '{}');
        Object.keys(COLUMN_DEFAULT_BASIS).forEach(panelId => {
            if (collapsed[panelId]) {
                setColumnCollapsed(panelId, true);
            }
        });

        Object.entries(COLUMN_TOGGLE_BUTTON_MAP).forEach(([panelId, buttonId]) => {
            const button = document.getElementById(buttonId);
            const panel = document.getElementById(panelId);
            if (!button || !panel) return;

            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const shouldCollapse = !panel.classList.contains('column-collapsed');
                setColumnCollapsed(panelId, shouldCollapse);
                refreshResizerToggleIcons();
                saveCollapsedColumns();
                saveColumnSizes();
            });
        });

        refreshResizerToggleIcons();
    };
    
    // --- Initial Load & Render ---
    const loadServerSettings = () => {
        const savedProvider = localStorage.getItem('apiProvider');
        if (savedProvider) {
            apiProvider = savedProvider;
            apiProviderSelect.value = apiProvider;
        }
        
        const savedAddress = localStorage.getItem('serverAddress');
        const savedApiKey = localStorage.getItem('apiKey');
        const savedVertexServiceAccount = localStorage.getItem('vertexServiceAccount');
        const savedVertexLocation = localStorage.getItem('vertexLocation');
        const savedOpenAIKey = localStorage.getItem('openaiApiKey');
        const savedOllamaAddress = localStorage.getItem('ollamaAddress');
        
        toggleProviderSettings(); // Set initial UI state

        if (apiProvider === 'openwebui' && savedAddress) {
            serverAddressInput.value = savedAddress;
            if (savedApiKey) apiKeyInput.value = savedApiKey;
            connectToOpenWebUI();
        } else if (apiProvider === 'vertex' && savedVertexServiceAccount) {
            vertexServiceAccountInput.value = savedVertexServiceAccount;
            vertexKeyStatus.textContent = 'Key loaded from storage';
            vertexKeyStatus.style.color = '#27ae60';
            clearVertexKeyBtn.classList.remove('hidden');
            vertexLocationInput.value = savedVertexLocation || 'global';
            connectToVertex();
        } else if (apiProvider === 'openai' && savedOpenAIKey) {
            openaiApiKeyInput.value = savedOpenAIKey;
            connectToOpenAI();
        } else if (apiProvider === 'ollama' && savedOllamaAddress && ollamaAddressInput) {
            ollamaAddressInput.value = savedOllamaAddress;
            connectToOllama();
        }
    };
    
    const loadTheme = () => {
        applyTheme(getStoredThemePreference());
    };

    // Keep new appointment dates aligned with the local calendar day.
    syncAppointmentDateInput();
    scheduleAppointmentDateRefresh();
    
    // Data loading is now handled by unlockApp()
    
    loadServerSettings();
    loadColumnSizes();
    initializeColumnCollapsers();
    loadCollapsedStates();
    loadTheme();
    
    makeResizable(document.getElementById('resizer1'), document.getElementById('panelClients'), document.getElementById('panelAppointments'));
    makeResizable(document.getElementById('resizer2'), document.getElementById('panelAppointments'), document.getElementById('panelSession'));
    makeResizable(document.getElementById('resizer3'), document.getElementById('panelSession'), document.getElementById('panelSoap'));
    makeResizable(document.getElementById('resizer-session-notes'), document.getElementById('sessionInfoWrapper'), document.getElementById('notesWrapper'), 'y');
    scheduleStartupUpdateCheck();
    startRecurringUpdateChecks();

    window.__appAuthHooks = {
        saveDataToLocalStorage,
        loadDataFromLocalStorage,
        normalizeClientData,
        fullRender
    };

});

const {
    lockApp,
    getRememberedBiometricUsername,
    clearRememberedBiometricUsername,
    refreshBiometricSettingsUI,
    setBiometricStatusMessage
} = createAuthController();

