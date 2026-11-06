export const bindApplicationElements = () => {
    // DOM Elements
    const clientListEl = document.getElementById('clientList');
    const todaySessionsListEl = document.getElementById('todaySessionsList');
    const todaySessionsCountEl = document.getElementById('todaySessionsCount');
    const clearTodaySessionsBtn = document.getElementById('clearTodaySessionsBtn');
    const mainBankCountEl = document.getElementById('mainBankCount');
    const mainBankSearchInput = document.getElementById('mainBankSearchInput');
    const clearMainBankSearchBtn = document.getElementById('clearMainBankSearchBtn');
    const addClientBtn = document.getElementById('addClientBtn');
    const sortClientsBtn = document.getElementById('sortClientsBtn');
    const appointmentListEl = document.getElementById('appointmentList');
    const addAppointmentBtn = document.getElementById('addAppointmentBtn');
    const addIntakeBtn = document.getElementById('addIntakeBtn');
    const appointmentDateInput = document.getElementById('appointmentDateInput');
    const updateAppointmentDateBtn = document.getElementById('updateAppointmentDateBtn');
    const noteNameInput = document.getElementById('noteNameInput');
    const addNoteBtn = document.getElementById('addNoteBtn');
    const renameNoteBtn = document.getElementById('renameNoteBtn');
    const deletedClientsListEl = document.getElementById('deletedClientsList');
    const clearDeletedClientsBtn = document.getElementById('clearDeletedClientsBtn');
    const archivedClientsListEl = document.getElementById('archivedClientsList');
    const deletedAppointmentsListEl = document.getElementById('deletedAppointmentsList');
    const clearDeletedAppointmentsBtn = document.getElementById('clearDeletedAppointmentsBtn');
    const persistentNotesEl = document.getElementById('persistentNotes');
    const nextSessionNotesEl = document.getElementById('nextSessionNotes');
    const clientDetailsTabBtn = document.getElementById('clientDetailsTabBtn');
    const contactTabBtn = document.getElementById('contactTabBtn');
    const nextSessionTabBtn = document.getElementById('nextSessionTabBtn');
    const clientDetailsContentEl = document.getElementById('clientDetailsContent');
    const contactContentEl = document.getElementById('contactContent');
    const nextSessionContentEl = document.getElementById('nextSessionContent');
    const clientDiagnosesListEl = document.getElementById('clientDiagnosesList');
    const addDiagnosisBtn = document.getElementById('addDiagnosisBtn');
    const clientPresentingProblemEl = document.getElementById('clientPresentingProblem');
    const sessionInfoEl = document.getElementById('sessionInfo');
    const auditProofSymptomsEl = document.getElementById('auditProofSymptoms');
    const auditProofFunctionalEl = document.getElementById('auditProofFunctional');
    const auditProofProgressEl = document.getElementById('auditProofProgress');
    const auditProofNecessityEl = document.getElementById('auditProofNecessity');
    const regularSessionFieldsEl = document.getElementById('regularSessionFields');
    const auditProofingBlockEl = document.getElementById('auditProofingBlock');
    const intakeSessionBlockEl = document.getElementById('intakeSessionBlock');
    const intakeFieldsContainerEl = document.getElementById('intakeFieldsContainer');
    const copyIntakeSessionBtn = document.getElementById('copyIntakeSessionBtn');
    const guidingModalitiesListEl = document.getElementById('guidingModalitiesList');
    const guidingModalityOtherWrapEl = document.getElementById('guidingModalityOtherWrap');
    const guidingModalityOtherEl = document.getElementById('guidingModalityOther');
    const soapContentEl = document.getElementById('soapContent');
    const autoSaveIndicator = document.getElementById('autoSaveIndicator');
    const saveStatus = document.getElementById('saveStatus');
    const clientDetailsTabGroup = document.getElementById('clientDetailsTabGroup');
    const updateClientDetailsTabLabels = () => {
        if (!clientDetailsTabBtn || !contactTabBtn || !nextSessionTabBtn || !clientDetailsTabGroup) return;
        const compactLabels = clientDetailsTabGroup.clientWidth > 0 && clientDetailsTabGroup.clientWidth < 340;
        clientDetailsTabBtn.textContent = 'Details';
        contactTabBtn.textContent = 'Contact';
        nextSessionTabBtn.textContent = compactLabels ? 'Next' : 'Next Session';
    };
    if (clientDetailsTabGroup && typeof ResizeObserver !== 'undefined') {
        const clientDetailsTabResizeObserver = new ResizeObserver(() => updateClientDetailsTabLabels());
        clientDetailsTabResizeObserver.observe(clientDetailsTabGroup);
        window.addEventListener('resize', updateClientDetailsTabLabels);
    }
    // Settings and Modal Elements
    const settingsBtn = document.getElementById('settingsBtn');
    const checkForUpdatesBtn = document.getElementById('checkForUpdatesBtn');
    const menuBackupWarning = document.getElementById('menuBackupWarning');
    const menuUpdateAsterisk = document.getElementById('menuUpdateAsterisk');
    const checkForUpdatesAsterisk = document.getElementById('checkForUpdatesAsterisk');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const openSoapConfigurationBtn = document.getElementById('openSoapConfigurationBtn');
    const soapConfigurationModal = document.getElementById('soapConfigurationModal');
    const closeSoapConfigurationBtn = document.getElementById('closeSoapConfigurationBtn');
    const doneSoapConfigurationBtn = document.getElementById('doneSoapConfigurationBtn');
    const soapPlatformSelect = document.getElementById('soapPlatformSelect');
    const soapPlatformNameInput = document.getElementById('soapPlatformNameInput');
    const saveSoapPlatformNameBtn = document.getElementById('saveSoapPlatformNameBtn');
    const newSoapPlatformNameInput = document.getElementById('newSoapPlatformNameInput');
    const addSoapPlatformBtn = document.getElementById('addSoapPlatformBtn');
    const deleteSoapPlatformBtn = document.getElementById('deleteSoapPlatformBtn');
    const soapPlatformSectionsList = document.getElementById('soapPlatformSectionsList');
    const informedConsentBtn = document.getElementById('informedConsentBtn');
    const soapAuditGuideBtn = document.getElementById('soapAuditGuideBtn');
    const soapInstructionsBtn = document.getElementById('soapInstructionsBtn');
    const treatmentGoalsInstructionsBtn = document.getElementById('treatmentGoalsInstructionsBtn');
    const interventionBankBtn = document.getElementById('interventionBankBtn');
    const informedConsentModal = document.getElementById('informedConsentModal');
    const closeConsentBtn = document.getElementById('closeConsentBtn');
    const copyConsentNotationBtn = document.getElementById('copyConsentNotationBtn');
    const closeConsentBtnBottom = document.getElementById('closeConsentBtnBottom');
    const soapAuditGuideModal = document.getElementById('soapAuditGuideModal');
    const closeSoapAuditGuideBtn = document.getElementById('closeSoapAuditGuideBtn');
    const closeSoapAuditGuideBtnBottom = document.getElementById('closeSoapAuditGuideBtnBottom');
    const goalGeneratorModal = document.getElementById('goalGeneratorModal');
    const closeGoalGeneratorBtn = document.getElementById('closeGoalGeneratorBtn');
    const generateGoalsBtn = document.getElementById('generateGoalsBtn');
    const addClientModal = document.getElementById('addClientModal');
    const closeAddClientBtn = document.getElementById('closeAddClientBtn');
    const cancelAddClientBtn = document.getElementById('cancelAddClientBtn');
    const confirmAddClientBtn = document.getElementById('confirmAddClientBtn');
    const addClientNameInput = document.getElementById('addClientNameInput');
    const exportDataModal = document.getElementById('exportDataModal');
    const closeExportDataBtn = document.getElementById('closeExportDataBtn');
    const exportDataText = document.getElementById('exportDataText');
    const copyExportDataBtn = document.getElementById('copyExportDataBtn');
    const downloadExportDataBtn = document.getElementById('downloadExportDataBtn');
    const goalDiagnosisInput = document.getElementById('goalDiagnosisInput');
    const presentingProblemShorthandInput = document.getElementById('presentingProblemShorthandInput');
    const goalCountInput = document.getElementById('goalCountInput');
    const objectiveCountInput = document.getElementById('objectiveCountInput');
    const objectivesPerGoalInput = document.getElementById('objectivesPerGoalInput');
    const objectiveCountHelp = document.getElementById('objectiveCountHelp');
    const objectiveStyleSelect = document.getElementById('objectiveStyleSelect');
    const runGoalGeneratorBtn = document.getElementById('runGoalGeneratorBtn');
    const applyGeneratedGoalsBtn = document.getElementById('applyGeneratedGoalsBtn');
    const applyGeneratedGoalsBottomBtn = document.getElementById('applyGeneratedGoalsBottomBtn');
    const generatedGoalsReview = document.getElementById('generatedGoalsReview');
    const interventionBankModal = document.getElementById('interventionBankModal');
    const closeInterventionBankBtn = document.getElementById('closeInterventionBankBtn');
    const newInterventionInput = document.getElementById('newInterventionInput');
    const newInterventionModalitySelect = document.getElementById('newInterventionModalitySelect');
    const newInterventionModalityOtherWrap = document.getElementById('newInterventionModalityOtherWrap');
    const newInterventionModalityOther = document.getElementById('newInterventionModalityOther');
    const newInterventionCouplesOnly = document.getElementById('newInterventionCouplesOnly');
    const addInterventionBtn = document.getElementById('addInterventionBtn');
    const interventionBankList = document.getElementById('interventionBankList');
    const interventionPickerModal = document.getElementById('interventionPickerModal');
    const closeInterventionPickerBtn = document.getElementById('closeInterventionPickerBtn');
    const interventionPickerList = document.getElementById('interventionPickerList');
    const saveInterventionSelectionBtn = document.getElementById('saveInterventionSelectionBtn');
    const manualSaveBtn = document.getElementById('manualSaveBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const eraseAllBtn = document.getElementById('eraseAllBtn');
    const currentPasswordInput = document.getElementById('currentPasswordInput');
    const newPasswordInput = document.getElementById('newPasswordInput');
    const confirmNewPasswordInput = document.getElementById('confirmNewPasswordInput');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const changePasswordStatus = document.getElementById('changePasswordStatus');
    const loginOverlay = document.getElementById('loginOverlay');
    const loginUsernameInput = document.getElementById('loginUsernameInput');
    const loginPasswordInput = document.getElementById('loginPasswordInput');
    const loginBtn = document.getElementById('loginBtn');
    const loginErrorMsg = document.getElementById('loginErrorMsg');
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    const biometricLoginPanel = document.getElementById('biometricLoginPanel');
    const biometricLoginBtn = document.getElementById('biometricLoginBtn');
    const biometricLoginHint = document.getElementById('biometricLoginHint');
    const biometricLoginStatusMsg = document.getElementById('biometricLoginStatusMsg');
    const enableBiometricLoginBtn = document.getElementById('enableBiometricLoginBtn');
    const disableBiometricLoginBtn = document.getElementById('disableBiometricLoginBtn');
    const biometricSettingsStatus = document.getElementById('biometricSettingsStatus');
    // Custom Instructions Modal Elements
    const customInstructionsBtn = document.getElementById('customInstructionsBtn');
    const customInstructionsModal = document.getElementById('customInstructionsModal');
    const closeCustomInstructionsBtn = document.getElementById('closeCustomInstructionsBtn');
    const persistentInstructionsInput = document.getElementById('persistentInstructionsInput');
    const sessionInstructionsInput = document.getElementById('sessionInstructionsInput');
    const preferredPronounsSelect = document.getElementById('preferredPronounsSelect');
    const clientSessionTypeSelect = document.getElementById('clientSessionTypeSelect');
    const clientSoapPlatformSelect = document.getElementById('clientSoapPlatformSelect');
    const clientPreferredPronounsWrapEl = document.getElementById('clientPreferredPronounsWrap');
    const sessionMembersWrapEl = document.getElementById('sessionMembersWrap');
    const sessionMembersListEl = document.getElementById('sessionMembersList');
    const addSessionMemberBtn = document.getElementById('addSessionMemberBtn');
    const customPronounsWrapEl = document.getElementById('customPronounsWrap');
    const customPronounSubjectInput = document.getElementById('customPronounSubjectInput');
    const customPronounObjectInput = document.getElementById('customPronounObjectInput');
    const customPronounPossessiveInput = document.getElementById('customPronounPossessiveInput');
    const saveCustomInstructionsBtn = document.getElementById('saveCustomInstructionsBtn');
    const clearCustomInstructionsBtn = document.getElementById('clearCustomInstructionsBtn');
    const customInstructionsModalitiesListEl = document.getElementById('customInstructionsModalitiesList');
    const customInstructionsModalityOtherWrapEl = document.getElementById('customInstructionsModalityOtherWrap');
    const customInstructionsModalityOtherEl = document.getElementById('customInstructionsModalityOther');
    const soapInstructionsModal = document.getElementById('soapInstructionsModal');
    const closeSoapInstructionsBtn = document.getElementById('closeSoapInstructionsBtn');
    const soapInstructionsSectionsEl = document.getElementById('soapInstructionsSections');
    const saveSoapInstructionsBtn = document.getElementById('saveSoapInstructionsBtn');
    const resetSoapInstructionsBtn = document.getElementById('resetSoapInstructionsBtn');
    const treatmentGoalsInstructionsModal = document.getElementById('treatmentGoalsInstructionsModal');
    const closeTreatmentGoalsInstructionsBtn = document.getElementById('closeTreatmentGoalsInstructionsBtn');
    const treatmentGoalsInstructionsSectionsEl = document.getElementById('treatmentGoalsInstructionsSections');
    const saveTreatmentGoalsInstructionsBtn = document.getElementById('saveTreatmentGoalsInstructionsBtn');
    const resetTreatmentGoalsInstructionsBtn = document.getElementById('resetTreatmentGoalsInstructionsBtn');
    // AI Integration Elements
    const apiProviderSelect = document.getElementById('apiProviderSelect');
    const openwebuiSettings = document.getElementById('openwebuiSettings');
    const serverAddressInput = document.getElementById('serverAddressInput');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const ollamaSettings = document.getElementById('ollamaSettings');
    const ollamaAddressInput = document.getElementById('ollamaAddressInput');
    const vertexSettings = document.getElementById('vertexSettings');
    const vertexServiceAccountInput = document.getElementById('vertexServiceAccountInput');
    const selectVertexKeyBtn = document.getElementById('selectVertexKeyBtn');
    const clearVertexKeyBtn = document.getElementById('clearVertexKeyBtn');
    const vertexKeyFileInput = document.getElementById('vertexKeyFileInput');
    const vertexKeyStatus = document.getElementById('vertexKeyStatus');
    const vertexLocationInput = document.getElementById('vertexLocationInput');
    const vertexModelInput = document.getElementById('vertexModelInput');
    const refreshVertexModelsBtn = document.getElementById('refreshVertexModelsBtn');
    const vertexModelStatus = document.getElementById('vertexModelStatus');
    const openaiSettings = document.getElementById('openaiSettings');
    const openaiApiKeyInput = document.getElementById('openaiApiKeyInput');
    const openaiModelInput = document.getElementById('openaiModelInput');
    const connectApiBtn = document.getElementById('connectApiBtn');
    const verifyApiBtn = document.getElementById('verifyApiBtn');
    const apiStatus = document.getElementById('apiStatus');
    const modelSelect = document.getElementById('modelSelect');
    const modelSelectWrapper = document.getElementById('modelSelectWrapper');
    const generateNoteBtn = document.getElementById('generateNoteBtn');
    const fileInput = document.getElementById('fileInput');
    const appModeEmrBtn = document.getElementById('appModeEmrBtn');
    const appModeDsmBtn = document.getElementById('appModeDsmBtn');
    const appModeAssessmentsBtn = document.getElementById('appModeAssessmentsBtn');
    const appModeSafetyPlanBtn = document.getElementById('appModeSafetyPlanBtn');
    const headerColumnControls = document.getElementById('headerColumnControls');
    const mainGridEl = document.getElementById('mainGrid');
    const workspaceViewEl = document.getElementById('workspaceView');
    const dsmIframeEl = document.getElementById('dsmIframe');
    const assessmentsIframeEl = document.getElementById('assessmentsIframe');
    const safetyPlanIframeEl = document.getElementById('safetyPlanIframe');
    const headerMenu = document.getElementById('headerMenu');
    const headerMenuBtn = document.getElementById('headerMenuBtn');
    const headerMenuDropdown = document.getElementById('headerMenuDropdown');
    const configureBackupBtn = document.getElementById('configureBackupBtn');
    const clearBackupBtn = document.getElementById('clearBackupBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const lockScreenBtn = document.getElementById('lockScreenBtn');
    // Goals Elements
    const goalsListInTabEl = document.getElementById('goalsListInTab');
    const addGoalBtnInTab = document.getElementById('addGoalBtnInTab');
    const treatmentPlanStartDateInput = document.getElementById('treatmentPlanStartDateInput');
    const appointmentsTabBtn = document.getElementById('appointmentsTabBtn');
    const goalsTabBtn = document.getElementById('goalsTabBtn');
    const appointmentsTabContent = document.getElementById('appointmentsTabContent');
    const goalsTabContent = document.getElementById('goalsTabContent');
    const deletedClientsToggleBtn = document.getElementById('deletedClientsToggleBtn');
    const archivedClientsToggleBtn = document.getElementById('archivedClientsToggleBtn');
    const deletedAppointmentsToggleBtn = document.getElementById('deletedAppointmentsToggleBtn');
    const goalsListToggleBtn = document.getElementById('goalsListToggleBtn');

    return {
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
    };
};
