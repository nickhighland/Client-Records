import Database from '@tauri-apps/plugin-sql';
import CryptoJS from 'crypto-js';
import { createVaultCredentials, unlockVaultRecord, unlockVaultRecoveryRecord, recoverVaultRecord, changeVaultPassword, isVaultRecord,
    encryptVaultState, decryptVaultState } from './vault-crypto.js';
import { readCredential, writeCredential } from './credential-vault.js';
import { unlockLegacyBackup } from './legacy-backup.js';

let db = null;
let encryptionKey = null;
let currentUser = null;
let lastAuthError = '';
let pendingRecoveryKit = null;
const pendingDrafts = new Map();
export const hasPendingVolatileDraft = () => pendingDrafts.size > 0;
export async function preserveUnsavedDraft(state) {
    if (!encryptionKey || !currentUser) throw new Error('Unlock the workspace first.');
    const encrypted = await encryptVaultState(state, encryptionKey);
    if (JSON.stringify(await decryptVaultState(encrypted, encryptionKey)) !== JSON.stringify(state)) throw new Error('Draft protection failed. Keep the app open.');
    pendingDrafts.set(currentUser, encrypted);
}
export function takeRecoveryKit() { const kit = pendingRecoveryKit; pendingRecoveryKit = null; return kit; }
async function authenticatedVerifier(username, password, database) {
    const rows = await database.select('SELECT password_hash FROM users WHERE username = $1', [username]);
    const stored = rows?.[0]?.password_hash;
    if (!stored) return '';
    if (!isVaultRecord(stored)) return stored === CryptoJS.SHA256(password).toString() ? stored : '';
    try { await unlockVaultRecord(stored, password); return stored; } catch { return ''; }
}
async function hydrateSmtpSecret(user, database) {
    if (user.smtp_password) {
        await writeCredential(`smtp:${user.username}`, user.smtp_password);
        await database.execute('UPDATE users SET smtp_password = NULL WHERE username = $1', [user.username]);
    } else user.smtp_password = await readCredential(`smtp:${user.username}`);
    return user;
}
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const CODE_RESEND_COOLDOWN_MS = 60 * 1000;
const CODE_MAX_PER_HOUR = 5;

const invokeTauriCommand = async (command, args) => {
    const invoke = window?.__TAURI__?.core?.invoke;
    if (typeof invoke !== 'function') {
        throw new Error('Desktop runtime is required for secure credential operations.');
    }
    return invoke(command, args);
};

const randomSecret = () => CryptoJS.lib.WordArray.random(32).toString();
const deriveEncryptionKey = (username, password) => CryptoJS.SHA256(`${password}${username}`).toString();
const encryptStateString = (state, key) => CryptoJS.AES.encrypt(JSON.stringify(state), key).toString();

function validateSmtpConfig(smtpHost, smtpPort, smtpSecurity, smtpUsername, smtpFrom, smtpPassword) {
    const normalizedHost = (smtpHost || '').trim();
    const normalizedSecurity = (smtpSecurity || '').trim().toLowerCase();

    if (!normalizedHost) {
        return 'SMTP host is required.';
    }

    const parsedPort = Number(smtpPort);
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
        return 'SMTP port must be a valid port number (1-65535).';
    }

    if (normalizedSecurity !== 'starttls' && normalizedSecurity !== 'tls' && normalizedSecurity !== 'ssl') {
        return 'SMTP security must be STARTTLS, TLS, or SSL.';
    }

    if (!smtpUsername || !smtpFrom || !smtpPassword) {
        return 'SMTP authentication is required (username, from email, and app password).';
    }

    return '';
}

async function enforceCodeRateLimit(database, tableName, normalizedUsername, contextLabel) {
    const now = Date.now();
    const recentRows = await database.select(
        `SELECT created_at FROM ${tableName} WHERE username = $1 ORDER BY created_at DESC LIMIT 1`,
        [normalizedUsername]
    );

    if (recentRows?.length) {
        const lastCreatedAt = Number(recentRows[0].created_at || 0);
        const elapsed = now - lastCreatedAt;
        if (elapsed < CODE_RESEND_COOLDOWN_MS) {
            const waitSeconds = Math.ceil((CODE_RESEND_COOLDOWN_MS - elapsed) / 1000);
            lastAuthError = `Please wait ${waitSeconds}s before requesting another ${contextLabel} code.`;
            return false;
        }
    }

    const hourlyRows = await database.select(
        `SELECT COUNT(*) as count FROM ${tableName} WHERE username = $1 AND created_at >= $2`,
        [normalizedUsername, now - (60 * 60 * 1000)]
    );
    const hourlyCount = Number(hourlyRows?.[0]?.count ?? 0);
    if (hourlyCount >= CODE_MAX_PER_HOUR) {
        lastAuthError = `Too many ${contextLabel} requests. Try again in about an hour.`;
        return false;
    }

    return true;
}

async function ensureSchema(database) {
    await database.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    `);

    const userColumns = await database.select('PRAGMA table_info(users)');
    const existing = new Set((userColumns || []).map(col => col.name));
    const additions = [
        { name: 'email', sql: 'ALTER TABLE users ADD COLUMN email TEXT' },
        { name: 'smtp_host', sql: 'ALTER TABLE users ADD COLUMN smtp_host TEXT' },
        { name: 'smtp_port', sql: 'ALTER TABLE users ADD COLUMN smtp_port INTEGER' },
        { name: 'smtp_security', sql: 'ALTER TABLE users ADD COLUMN smtp_security TEXT' },
        { name: 'smtp_username', sql: 'ALTER TABLE users ADD COLUMN smtp_username TEXT' },
        { name: 'smtp_from', sql: 'ALTER TABLE users ADD COLUMN smtp_from TEXT' },
        { name: 'smtp_password', sql: 'ALTER TABLE users ADD COLUMN smtp_password TEXT' },
        { name: 'recovery_enabled', sql: 'ALTER TABLE users ADD COLUMN recovery_enabled INTEGER DEFAULT 0' },
        { name: 'email_verified', sql: 'ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 1' },
        { name: 'email_verified_at', sql: 'ALTER TABLE users ADD COLUMN email_verified_at INTEGER' }
    ];
    for (const item of additions) {
        if (!existing.has(item.name)) {
            await database.execute(item.sql);
        }
    }

    await database.execute(`
        CREATE TABLE IF NOT EXISTS password_reset_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            code_hash TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            used INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL
        )
    `);
    await database.execute('CREATE INDEX IF NOT EXISTS idx_password_reset_username ON password_reset_codes(username)');

    await database.execute(`
        CREATE TABLE IF NOT EXISTS email_verification_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            code_hash TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            used INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL
        )
    `);
    await database.execute('CREATE INDEX IF NOT EXISTS idx_email_verify_username ON email_verification_codes(username)');
}

async function sendEmailVerificationCode(database, normalizedUsername) {
    const rows = await database.select(
        'SELECT username, email, smtp_host, smtp_port, smtp_security, smtp_username, smtp_from, smtp_password, recovery_enabled, email_verified FROM users WHERE username = $1',
        [normalizedUsername]
    );

    if (!rows?.length) {
        lastAuthError = 'Account not found.';
        return false;
    }

    const user = await hydrateSmtpSecret(rows[0], database);
    if (Number(user.email_verified) === 1) {
        lastAuthError = 'Email is already verified. You can log in now.';
        return false;
    }

    if (!user.recovery_enabled || !user.email || !user.smtp_host || !user.smtp_port || !user.smtp_username || !user.smtp_from || !user.smtp_password) {
        lastAuthError = 'SMTP recovery settings are required to verify email.';
        return false;
    }

    const rateAllowed = await enforceCodeRateLimit(database, 'email_verification_codes', normalizedUsername, 'verification');
    if (!rateAllowed) {
        return false;
    }

    const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
    const codeHash = CryptoJS.SHA256(`${normalizedUsername}:verify:${code}`).toString();
    const now = Date.now();
    const expiresAt = now + EMAIL_CODE_TTL_MS;

    await database.execute('DELETE FROM email_verification_codes WHERE username = $1 OR expires_at < $2 OR used = 1', [normalizedUsername, now - (24 * 60 * 60 * 1000)]);
    await database.execute(
        'INSERT INTO email_verification_codes (username, code_hash, expires_at, attempts, used, created_at) VALUES ($1, $2, $3, 0, 0, $4)',
        [normalizedUsername, codeHash, expiresAt, now]
    );

    try {
        await invokeTauriCommand('send_email_verification_email', {
            args: {
                username: normalizedUsername,
                toEmail: user.email,
                smtpHost: user.smtp_host,
                smtpPort: Number(user.smtp_port),
                smtpSecurity: (user.smtp_security || 'starttls').toLowerCase(),
                smtpUsername: user.smtp_username,
                smtpPassword: user.smtp_password,
                fromEmail: user.smtp_from,
                code
            }
        });
    } catch (error) {
        console.error('[DEBUG] Verification email error:', error);
        const detail = typeof error === 'string' ? ` ${error}` : (error?.message ? ` ${error.message}` : '');
        lastAuthError = `Verification email failed to send.${detail}`;
        return false;
    }

    lastAuthError = `Verification code sent to ${user.email}.`;
    return true;
}

async function getOrMigrateEncryptionKey(normalizedUsername, password, database) {
    // Derive encryption key from password (no keychain)
    return deriveEncryptionKey(normalizedUsername, password);
}

async function getDb() {
    if (!db) {
        try {
            db = await Database.load('sqlite:client_records.db');
            await ensureSchema(db);
            await db.execute(`
                CREATE TABLE IF NOT EXISTS app_state (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT UNIQUE NOT NULL,
                    value TEXT NOT NULL
                )
            `);
            lastAuthError = '';
        } catch (error) {
            console.error("Database load/init failed:", error);
            const rawMessage = error?.message || String(error);
            lastAuthError = `Database unavailable. Raw error: ${rawMessage}. Check console for details.`;
            db = null; // Ensure db is null on failure
            throw new Error(lastAuthError);
        }
    }
    return db;
}

export async function checkFirstLogin() {
    try {
        const database = await getDb();
        const result = await database.select('SELECT COUNT(*) as count FROM users');
        lastAuthError = '';
        return Number(result?.[0]?.count ?? 0) === 0;
    } catch (error) {
        try {
            await new Promise((resolve) => setTimeout(resolve, 300));
            db = null;
            const database = await getDb();
            const result = await database.select('SELECT COUNT(*) as count FROM users');
            lastAuthError = '';
            return Number(result?.[0]?.count ?? 0) === 0;
        } catch (retryError) {
            console.error("Failed to check first login:", retryError);
            if (!lastAuthError) {
                const rawMessage = retryError?.message || String(retryError);
                lastAuthError = `Database unavailable: ${rawMessage}`;
            }
            return false;
        }
    }
}

export async function createUser(username, password, email = '', recoveryConfig = null) {
    try {
        const database = await getDb();
        const normalizedUsername = String(username || '').trim();
        if (!normalizedUsername) throw new Error('Username is required.');
        if ((await database.select('SELECT id FROM users WHERE username = $1', [normalizedUsername])).length) throw new Error('User already exists. Please log in.');
        const credentials = await createVaultCredentials(password);
        await database.execute('INSERT INTO users (username, password_hash, email, recovery_enabled, email_verified, email_verified_at) VALUES ($1,$2,$3,0,1,$4)',
            [normalizedUsername, credentials.record, String(email || '').trim(), Date.now()]);
        pendingRecoveryKit = { username: normalizedUsername, recoveryCode: credentials.recoveryCode };
        lastAuthError = '';
        return true;
    } catch (error) { lastAuthError = error.message || 'Could not create account.'; return false; }
}

export async function loginUser(username, password) {
    try {
        const database = await getDb();
        const normalizedUsername = String(username || '').trim();
        const rows = await database.select('SELECT * FROM users WHERE username = $1', [normalizedUsername]);
        const user = rows?.[0];
        if (!user || !await authenticatedVerifier(normalizedUsername, password, database)) throw new Error('Incorrect username or password.');
        let key;
        if (isVaultRecord(user.password_hash)) key = await unlockVaultRecord(user.password_hash, password);
        else {
            const oldKey = deriveEncryptionKey(normalizedUsername, password);
            const saved = await database.select('SELECT value FROM app_state WHERE key = $1', ['main_state']);
            let oldState = null;
            if (saved.length) {
                const decoded = CryptoJS.AES.decrypt(saved[0].value, oldKey).toString(CryptoJS.enc.Utf8);
                if (!decoded) throw new Error('Existing drafts could not be decrypted. No account data was changed.');
                oldState = JSON.parse(decoded);
            }
            const credentials = await createVaultCredentials(password);
            const encrypted = oldState === null ? null : await encryptVaultState(oldState, credentials.dataKey);
            if (encrypted && JSON.stringify(await decryptVaultState(encrypted, credentials.dataKey)) !== JSON.stringify(oldState)) throw new Error('Encryption verification failed. Existing drafts were not changed.');
            await invokeTauriCommand('migrate_legacy_vault', { args: {
                username: normalizedUsername, oldVerifier: user.password_hash,
                oldState: saved?.[0]?.value ?? null, newVerifier: credentials.record, newState: encrypted
            } });
            pendingRecoveryKit = { username: normalizedUsername, recoveryCode: credentials.recoveryCode };
            key = credentials.dataKey;
        }
        encryptionKey = key;
        currentUser = normalizedUsername;
        if (user.smtp_password) { try { await hydrateSmtpSecret(user, database); } catch { /* Retain existing SMTP data until secure migration succeeds. */ } }
        lastAuthError = '';
        return true;
    } catch (error) { encryptionKey = null; currentUser = null; lastAuthError = error.message || 'Login failed.'; return false; }
}

export async function loginUserWithBiometricSecret(username, storedEncryptionKey) {
    try {
        const database = await getDb();
        const normalizedUsername = (username || '').trim();
        const normalizedSecret = (storedEncryptionKey || '').trim();
        if (!normalizedUsername || !normalizedSecret) {
            lastAuthError = 'Saved biometric login is incomplete. Please log in with your password.';
            return false;
        }

        const result = await database.select('SELECT username, email_verified FROM users WHERE username = $1', [normalizedUsername]);
        if (!result?.length) {
            lastAuthError = 'Account not found.';
            return false;
        }

        if (Number(result[0].email_verified) !== 1) {
            lastAuthError = 'Email not verified. Enter your verification code to continue.';
            return false;
        }

        encryptionKey = normalizedSecret;
        currentUser = normalizedUsername;
        lastAuthError = '';
        return true;
    } catch (error) {
        console.error('Failed to log in with biometric secret:', error);
        lastAuthError = 'Biometric login failed. Please use your password.';
        return false;
    }
}

export async function changePassword(currentPassword, newPassword) {
    if (!db || !currentUser || !encryptionKey) return false;
    try {
        const rows = await db.select('SELECT password_hash FROM users WHERE username = $1', [currentUser]);
        const updated = await changeVaultPassword(rows[0].password_hash, currentPassword, newPassword);
        await db.execute('UPDATE users SET password_hash = $1 WHERE username = $2', [updated.record, currentUser]);
        lastAuthError = '';
        return true;
    } catch { lastAuthError = 'Password change failed. Verify the current password and use at least eight characters for the new password.'; return false; }
}

export async function rotateRecoveryKey(password) {
    if (!db || !currentUser || !encryptionKey) throw new Error('Unlock the app first.');
    const rows = await db.select('SELECT password_hash FROM users WHERE username = $1', [currentUser]);
    const key = await unlockVaultRecord(rows[0].password_hash, password);
    const credentials = await createVaultCredentials(password, key);
    await db.execute('UPDATE users SET password_hash = $1 WHERE username = $2', [credentials.record, currentUser]);
    return { username: currentUser, recoveryCode: credentials.recoveryCode };
}

export function getLastAuthError() {
    return lastAuthError;
}

export function getCurrentUser() {
    return currentUser;
}

export function clearActiveSession() {
    encryptionKey = null;
    currentUser = null;
}

export async function getBiometricAvailability() {
    if (typeof window?.__TAURI__?.core?.invoke !== 'function') {
        return {
            supported: false,
            available: false,
            enrolled: false,
            message: 'Biometric launch login is only available in the desktop app.'
        };
    }

    try {
        const availability = await invokeTauriCommand('get_biometric_availability');
        return {
            supported: availability?.supported !== false,
            available: !!availability?.available,
            enrolled: availability?.enrolled !== false,
            message: typeof availability?.message === 'string' ? availability.message : ''
        };
    } catch (error) {
        console.error('Failed to check biometric availability:', error);
        const message = error?.message || String(error) || 'Touch ID availability could not be checked.';
        lastAuthError = message;
        return {
            supported: true,
            available: false,
            enrolled: false,
            message
        };
    }
}

export async function storeCurrentBiometricLogin() {
    if (!currentUser || !encryptionKey) {
        lastAuthError = 'Unlock the app before enabling Touch ID login.';
        return false;
    }

    try {
        await invokeTauriCommand('store_biometric_secret', {
            username: currentUser,
            secret: encryptionKey
        });
        lastAuthError = '';
        return true;
    } catch (error) {
        console.error('Failed to store biometric login secret:', error);
        lastAuthError = error?.message || String(error) || 'Failed to enable Touch ID login.';
        return false;
    }
}

export async function readBiometricLoginSecret(username) {
    try {
        const normalizedUsername = (username || '').trim();
        if (!normalizedUsername) {
            lastAuthError = 'Username is required for Touch ID login.';
            return null;
        }

        const secret = await invokeTauriCommand('read_biometric_secret', {
            username: normalizedUsername
        });
        lastAuthError = '';
        return typeof secret === 'string' ? secret : null;
    } catch (error) {
        console.error('Failed to read biometric login secret:', error);
        lastAuthError = error?.message || String(error) || 'Touch ID login failed.';
        return null;
    }
}

export async function removeBiometricLoginForUser(username) {
    try {
        const normalizedUsername = (username || '').trim();
        if (!normalizedUsername) {
            return true;
        }

        await invokeTauriCommand('remove_biometric_secret', {
            username: normalizedUsername
        });
        lastAuthError = '';
        return true;
    } catch (error) {
        console.error('Failed to remove biometric login secret:', error);
        lastAuthError = error?.message || String(error) || 'Failed to disable Touch ID login.';
        return false;
    }
}

export async function requestPasswordReset() {
    lastAuthError = 'Use your saved Lab recovery key to reset the password while keeping encrypted notes accessible. Email codes do not recover encryption keys.';
    return false;
}

export async function requestEmailVerification(username) {
    try {
        const database = await getDb();
        const normalizedUsername = (username || '').trim();
        if (!normalizedUsername) {
            lastAuthError = 'Username is required.';
            return false;
        }

        const rows = await database.select(
            'SELECT id FROM users WHERE username = $1',
            [normalizedUsername]
        );
        if (!rows?.length) {
            lastAuthError = 'Account not found.';
            return false;
        }

        return sendEmailVerificationCode(database, normalizedUsername);
    } catch (error) {
        console.error('Failed to request email verification:', error);
        lastAuthError = `Failed to send verification code: ${error}`;
        return false;
    }
}

export async function updateRecoverySettings(username, password, email = '', recoveryConfig = null, sendVerificationCode = true) {
    try {
        const database = await getDb();
        const normalizedUsername = (username || '').trim();
        const normalizedPassword = (password || '').trim();
        const normalizedEmail = (email || '').trim();

        if (!normalizedUsername || !normalizedPassword) {
            lastAuthError = 'Username and password are required.';
            return false;
        }

        if (!normalizedEmail) {
            lastAuthError = 'Recovery email is required.';
            return false;
        }

        const passwordHash = await authenticatedVerifier(normalizedUsername, normalizedPassword, database);
        const matched = await database.select(
            'SELECT id FROM users WHERE username = $1 AND password_hash = $2',
            [normalizedUsername, passwordHash]
        );

        if (!matched?.length) {
            lastAuthError = 'Incorrect username or password.';
            return false;
        }

        const smtpHost = (recoveryConfig?.smtpHost || '').trim();
        const smtpPort = Number(recoveryConfig?.smtpPort || 0);
        const smtpSecurity = (recoveryConfig?.smtpSecurity || 'starttls').trim().toLowerCase();
        const smtpUsername = (recoveryConfig?.smtpUsername || '').trim();
        const smtpFrom = (recoveryConfig?.smtpFrom || normalizedEmail).trim();
        const smtpPassword = (recoveryConfig?.smtpPassword || '').trim();

        const smtpValidationError = validateSmtpConfig(smtpHost, smtpPort, smtpSecurity, smtpUsername, smtpFrom, smtpPassword);
        if (smtpValidationError) {
            lastAuthError = smtpValidationError;
            return false;
        }

        if (!smtpHost || smtpPort <= 0 || !smtpUsername || !smtpFrom || !smtpPassword) {
            lastAuthError = 'Complete all SMTP settings to continue.';
            return false;
        }

        await writeCredential(`smtp:${normalizedUsername}`, smtpPassword);
        await database.execute(
            'UPDATE users SET email = $1, smtp_host = $2, smtp_port = $3, smtp_security = $4, smtp_username = $5, smtp_from = $6, smtp_password = $7, recovery_enabled = 1, email_verified = 0, email_verified_at = NULL WHERE username = $8',
            [normalizedEmail, smtpHost, smtpPort, smtpSecurity, smtpUsername, smtpFrom, null, normalizedUsername]
        );

        if (sendVerificationCode) {
            const sent = await sendEmailVerificationCode(database, normalizedUsername);
            if (sent) {
                lastAuthError = 'SMTP settings updated. Verification code sent to your email.';
                return true;
            } else {
                const warningMessage = lastAuthError || 'Verification email failed to send.';
                lastAuthError = `SMTP settings updated. ${warningMessage}`;
                return true;
            }
        } else {
            lastAuthError = 'SMTP settings updated.';
            return true;
        }
    } catch (error) {
        console.error('Failed to update recovery settings:', error);
        lastAuthError = `Failed to update SMTP settings: ${error}`;
        return false;
    }
}

export async function getRecoverySettings(username, password) {
    try {
        const database = await getDb();
        const normalizedUsername = (username || '').trim();
        const normalizedPassword = (password || '').trim();

        if (!normalizedUsername || !normalizedPassword) {
            lastAuthError = 'Username and password are required.';
            return null;
        }

        const passwordHash = await authenticatedVerifier(normalizedUsername, normalizedPassword, database);
        const rows = await database.select(
            'SELECT email, smtp_host, smtp_port, smtp_security, smtp_username, smtp_from FROM users WHERE username = $1 AND password_hash = $2',
            [normalizedUsername, passwordHash]
        );

        if (!rows?.length) {
            lastAuthError = 'Incorrect username or password.';
            return null;
        }

        const row = rows[0];
        lastAuthError = '';
        return {
            email: row.email || '',
            smtpHost: row.smtp_host || 'smtp.gmail.com',
            smtpPort: Number(row.smtp_port || 587),
            smtpSecurity: (row.smtp_security || 'starttls').toLowerCase(),
            smtpUsername: row.smtp_username || '',
            smtpFrom: row.smtp_from || ''
        };
    } catch (error) {
        console.error('Failed to load recovery settings:', error);
        lastAuthError = 'Failed to load SMTP settings.';
        return null;
    }
}

export async function testSmtpSettings(username, password, email = '', recoveryConfig = null) {
    try {
        const database = await getDb();
        const normalizedUsername = (username || '').trim();
        const normalizedPassword = (password || '').trim();
        const normalizedEmail = (email || '').trim();

        if (!normalizedUsername || !normalizedPassword || !normalizedEmail) {
            lastAuthError = 'Username, password, and recovery email are required.';
            return false;
        }

        const passwordHash = await authenticatedVerifier(normalizedUsername, normalizedPassword, database);
        const rows = await database.select(
            'SELECT id FROM users WHERE username = $1 AND password_hash = $2',
            [normalizedUsername, passwordHash]
        );
        if (!rows?.length) {
            lastAuthError = 'Incorrect username or password.';
            return false;
        }

        const smtpHost = (recoveryConfig?.smtpHost || '').trim();
        const smtpPort = Number(recoveryConfig?.smtpPort || 0);
        const smtpSecurity = (recoveryConfig?.smtpSecurity || 'starttls').trim().toLowerCase();
        const smtpUsername = (recoveryConfig?.smtpUsername || '').trim();
        const smtpFrom = (recoveryConfig?.smtpFrom || normalizedEmail).trim();
        const smtpPassword = (recoveryConfig?.smtpPassword || '').trim();

        const smtpValidationError = validateSmtpConfig(smtpHost, smtpPort, smtpSecurity, smtpUsername, smtpFrom, smtpPassword);
        if (smtpValidationError) {
            lastAuthError = smtpValidationError;
            return false;
        }

        await invokeTauriCommand('send_smtp_test_email', {
            args: {
                toEmail: normalizedEmail,
                smtpHost,
                smtpPort,
                smtpSecurity,
                smtpUsername,
                smtpPassword,
                fromEmail: smtpFrom
            }
        });

        lastAuthError = '';
        return true;
    } catch (error) {
        console.error('Failed to send SMTP test email:', error);
        const detail = error?.message ? ` Details: ${error.message}` : '';
        lastAuthError = `SMTP test failed. Check host, port, security, username, and app password.${detail}`;
        return false;
    }
}

export async function confirmEmailVerification(username, code) {
    try {
        const database = await getDb();
        const normalizedUsername = (username || '').trim();
        const normalizedCode = (code || '').trim();

        if (!normalizedUsername || !normalizedCode) {
            lastAuthError = 'Username and verification code are required.';
            return false;
        }

        const userRows = await database.select('SELECT email_verified FROM users WHERE username = $1', [normalizedUsername]);
        if (!userRows?.length) {
            lastAuthError = 'Account not found.';
            return false;
        }

        if (Number(userRows[0].email_verified) === 1) {
            lastAuthError = '';
            return true;
        }

        const rows = await database.select(
            'SELECT id, code_hash, attempts, expires_at, used FROM email_verification_codes WHERE username = $1 ORDER BY created_at DESC LIMIT 1',
            [normalizedUsername]
        );

        if (!rows?.length) {
            lastAuthError = 'No active verification code found. Request a new code.';
            return false;
        }

        const row = rows[0];
        const now = Date.now();
        if (row.used || Number(row.expires_at) < now) {
            lastAuthError = 'Verification code expired. Request a new code.';
            return false;
        }

        if (Number(row.attempts) >= 5) {
            lastAuthError = 'Too many failed attempts. Request a new code.';
            return false;
        }

        const expectedHash = CryptoJS.SHA256(`${normalizedUsername}:verify:${normalizedCode}`).toString();
        if (expectedHash !== row.code_hash) {
            const attempts = Number(row.attempts) + 1;
            const used = attempts >= 5 ? 1 : 0;
            await database.execute('UPDATE email_verification_codes SET attempts = $1, used = $2 WHERE id = $3', [attempts, used, row.id]);
            lastAuthError = used
                ? 'Too many failed attempts. Request a new code.'
                : `Invalid code. ${Math.max(0, 5 - attempts)} attempt(s) remaining.`;
            return false;
        }

        const verifiedAt = Date.now();
        await database.execute('UPDATE users SET email_verified = 1, email_verified_at = $1 WHERE username = $2', [verifiedAt, normalizedUsername]);
        await database.execute('UPDATE email_verification_codes SET used = 1 WHERE id = $1', [row.id]);
        await database.execute('DELETE FROM email_verification_codes WHERE username = $1 AND id != $2', [normalizedUsername, row.id]);

        lastAuthError = '';
        return true;
    } catch (error) {
        console.error('Failed to confirm email verification:', error);
        lastAuthError = 'Email verification failed. Please try again.';
        return false;
    }
}

export async function confirmPasswordReset(username, recoveryCode, newPassword) {
    try {
        const database = await getDb();
        const normalizedUsername = String(username || '').trim();
        const rows = await database.select('SELECT password_hash FROM users WHERE username = $1', [normalizedUsername]);
        if (!rows.length || !isVaultRecord(rows[0].password_hash)) throw new Error('This legacy account requires its original password or saved biometric unlock. An email code cannot recover its encryption key.');
        const recovered = await recoverVaultRecord(rows[0].password_hash, recoveryCode, newPassword);
        await database.execute('UPDATE users SET password_hash = $1 WHERE username = $2', [recovered.record, normalizedUsername]);
        lastAuthError = '';
        return true;
    } catch (error) { lastAuthError = 'Recovery failed. Verify the recovery key and account name. ' + (error.message || ''); return false; }
}

export async function deleteUserAccount(username, password) {
    try {
        const database = await getDb();
        const normalizedUsername = (username || '').trim();
        const normalizedPassword = (password || '').trim();
        if (!normalizedUsername || !normalizedPassword) {
            lastAuthError = 'Username and password are required.';
            return false;
        }

        const passwordHash = await authenticatedVerifier(normalizedUsername, normalizedPassword, database);
        const matched = await database.select(
            'SELECT id FROM users WHERE username = $1 AND password_hash = $2',
            [normalizedUsername, passwordHash]
        );

        if (!matched?.length) {
            lastAuthError = 'Incorrect username or password.';
            return false;
        }

        await database.execute('DELETE FROM password_reset_codes WHERE username = $1', [normalizedUsername]);
        await database.execute('DELETE FROM email_verification_codes WHERE username = $1', [normalizedUsername]);
        await database.execute('DELETE FROM users WHERE username = $1', [normalizedUsername]);
        await database.execute('DELETE FROM app_state WHERE key = $1', ['main_state']);
        await removeBiometricLoginForUser(normalizedUsername);

        if (currentUser === normalizedUsername) {
            encryptionKey = null;
            currentUser = null;
        }

        db = null;
        lastAuthError = '';
        return true;
    } catch (error) {
        console.error('Failed to delete account:', error);
        lastAuthError = 'Failed to delete account.';
        return false;
    }
}

const sqlEscape = (value) => {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
    if (typeof value === 'boolean') return value ? '1' : '0';
    return `'${String(value).replace(/'/g, "''")}'`;
};

export async function exportEncryptedSqlDump() {
    if (!db || !encryptionKey || !currentUser) throw new Error('Unlock the workspace before backing it up.');
    const users = await db.select('SELECT password_hash FROM users WHERE username = $1', [currentUser]);
    const state = await loadState();
    return { format: 'smartemr-backup-v2', workspace: 'smartemr-lab', encrypted: true, algorithm: 'AES-256-GCM', createdAt: new Date().toISOString(),
        credentials: users[0].password_hash, data: await encryptVaultState(state, encryptionKey) };
}

const splitSqlStatements = (sqlScript) => {
    const statements = [];
    let current = '';
    let inSingleQuote = false;

    for (let index = 0; index < sqlScript.length; index += 1) {
        const char = sqlScript[index];
        const nextChar = sqlScript[index + 1];

        if (char === "'" && inSingleQuote && nextChar === "'") {
            current += "''";
            index += 1;
            continue;
        }

        if (char === "'") {
            inSingleQuote = !inSingleQuote;
            current += char;
            continue;
        }

        if (!inSingleQuote && char === ';') {
            const trimmed = current.trim();
            if (trimmed && !trimmed.startsWith('--')) {
                statements.push(trimmed);
            }
            current = '';
            continue;
        }

        current += char;
    }

    const trailing = current.trim();
    if (trailing && !trailing.startsWith('--')) {
        statements.push(trailing);
    }

    return statements;
};

export async function importSqlDump(sql, sourceUsername = '', sourcePassword = '') {
    if (!db || !encryptionKey) throw new Error('Unlock the Lab workspace before restoring.');
    if (!sourcePassword) throw new Error('BACKUP_PASSWORD_REQUIRED');
    const state = unlockLegacyBackup(sql, sourceUsername, sourcePassword);
    await saveImportedState(state);
}

async function saveImportedState(state) {
    // Keep the displaced Lab workspace encrypted under the same data key.
    const prior = await db.select('SELECT value FROM app_state WHERE key = $1', ['main_state']);
    if (prior.length) {
        await db.execute('CREATE TABLE IF NOT EXISTS vault_restore_snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, encrypted_state TEXT NOT NULL, created_at INTEGER NOT NULL)');
        await db.execute('INSERT INTO vault_restore_snapshots (username, encrypted_state, created_at) VALUES ($1,$2,$3)', [currentUser, prior[0].value, Date.now()]);
    }
    if (!await saveState(state)) throw new Error('Restore could not be saved. Previous workspace retained.');
}

export async function importEncryptedSqlDump(payload, sourceUsername = '', sourcePassword = '') {
    if (!db || !encryptionKey) throw new Error('Unlock the Lab workspace before restoring.');
    let state;
    if (payload?.format === 'smartemr-backup-v2') {
        try { state = await decryptVaultState(payload.data, encryptionKey); }
        catch {
            if (!sourcePassword) throw new Error('BACKUP_PASSWORD_REQUIRED');
            const sourceKey = sourcePassword.trim().startsWith('RK-')
                ? await unlockVaultRecoveryRecord(payload.credentials, sourcePassword)
                : await unlockVaultRecord(payload.credentials, sourcePassword);
            state = await decryptVaultState(payload.data, sourceKey);
        }
    } else if (payload?.format === 'client-records-sql-export') {
        if (!sourcePassword) throw new Error('BACKUP_PASSWORD_REQUIRED');
        state = unlockLegacyBackup(payload, sourceUsername, sourcePassword);
    } else throw new Error('Unsupported backup format.');
    if (!state?.data || !Array.isArray(state.data.clients)) throw new Error('Backup workspace is invalid.');
    await saveImportedState(state);
}

export async function saveState(state) {
    if (!db || !encryptionKey) return false;
    
    try {
        const encryptedState = await encryptVaultState(state, encryptionKey);
        const verified = await decryptVaultState(encryptedState, encryptionKey);
        if (JSON.stringify(verified) !== JSON.stringify(state)) throw new Error('Encrypted draft verification failed. Previous saved data retained.');
        
        await db.execute(
            'INSERT INTO app_state (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2',
            ['main_state', encryptedState]
        );
        const pending = pendingDrafts.get(currentUser);
        if (pending && JSON.stringify(await decryptVaultState(pending, encryptionKey)) === JSON.stringify(state)) pendingDrafts.delete(currentUser);
        return true;
    } catch (error) {
        console.error("Failed to save state to database:", error);
        return false;
    }
}

export async function loadState() {
    if (!db || !encryptionKey) return null;
    
    try {
        if (pendingDrafts.has(currentUser)) return await decryptVaultState(pendingDrafts.get(currentUser), encryptionKey);
        const result = await db.select('SELECT value FROM app_state WHERE key = $1', ['main_state']);
        
        if (result && result.length > 0) {
            const encryptedState = result[0].value;
            if (encryptedState.trim().startsWith('{')) return decryptVaultState(encryptedState, encryptionKey);
            const decryptedBytes = CryptoJS.AES.decrypt(encryptedState, encryptionKey);
            const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
            
            if (!decryptedString) {
                throw new Error("Failed to decrypt data. Incorrect password?");
            }
            
            return JSON.parse(decryptedString);
        }
        return null;
    } catch (error) {
        console.error("Failed to load state from database:", error);
        throw error; // Re-throw to handle incorrect password
    }
}

export function isDatabaseInitialized() {
    return db !== null && encryptionKey !== null;
}
