const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ITERATIONS = 600000;
const random = size => crypto.getRandomValues(new Uint8Array(size));
const b64 = bytes => {
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    return btoa(binary);
};
const unb64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
const hex = bytes => Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
const unhex = value => {
    if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error('Invalid data key.');
    return Uint8Array.from(value.match(/../g), byte => parseInt(byte, 16));
};
const importKey = bytes => crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
const passwordKey = async (password, salt, iterations = ITERATIONS) => {
    if (!Number.isInteger(iterations) || iterations < ITERATIONS || iterations > 1000000) throw new Error('Unsupported key derivation parameters.');
    const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(salt), iterations }, material,
        { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
};
const seal = async (key, content, purpose) => {
    const iv = random(12);
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(purpose) }, key, encoder.encode(content));
    return { iv: b64(iv), data: b64(new Uint8Array(data)) };
};
const open = async (key, envelope, purpose) => decoder.decode(await crypto.subtle.decrypt({ name: 'AES-GCM',
    iv: unb64(envelope.iv), additionalData: encoder.encode(purpose) }, key, unb64(envelope.data)));

export const isVaultRecord = value => {
    try { return JSON.parse(value)?.format === 'smartemr-credentials-v2'; } catch { return false; }
};

export async function createVaultCredentials(password, dataKey = hex(random(32))) {
    if (typeof password !== 'string' || password.length < 8) throw new Error('Use a password of at least eight characters.');
    const recoveryCode = `RK-${hex(random(32))}`;
    const salt = b64(random(16)), recoverySalt = b64(random(16));
    const record = { format: 'smartemr-credentials-v2', iterations: ITERATIONS,
        password: { salt, ...await seal(await passwordKey(password, salt), dataKey, 'smartemr:password-key:v2') },
        recovery: { salt: recoverySalt, ...await seal(await passwordKey(recoveryCode, recoverySalt), dataKey, 'smartemr:recovery-key:v2') } };
    return { record: JSON.stringify(record), dataKey, recoveryCode };
}

export async function unlockVaultRecord(serialized, password) {
    const record = JSON.parse(serialized);
    if (record.format !== 'smartemr-credentials-v2') throw new Error('Unsupported credentials.');
    return open(await passwordKey(password, record.password.salt, record.iterations), record.password, 'smartemr:password-key:v2');
}

export async function unlockVaultRecoveryRecord(serialized, recoveryCode) {
    const record = JSON.parse(serialized);
    if (record.format !== 'smartemr-credentials-v2') throw new Error('This account needs its original password or saved biometric unlock.');
    return open(await passwordKey(recoveryCode.trim(), record.recovery.salt, record.iterations), record.recovery, 'smartemr:recovery-key:v2');
}

export async function recoverVaultRecord(serialized, recoveryCode, newPassword) {
    if (newPassword.length < 8) throw new Error('Use a password of at least eight characters.');
    const record = JSON.parse(serialized);
    const dataKey = await unlockVaultRecoveryRecord(serialized, recoveryCode);
    const salt = b64(random(16));
    record.password = { salt, ...await seal(await passwordKey(newPassword, salt), dataKey, 'smartemr:password-key:v2') };
    return { record: JSON.stringify(record), dataKey };
}

export async function changeVaultPassword(serialized, currentPassword, newPassword) {
    if (newPassword.length < 8) throw new Error('Use a password of at least eight characters.');
    const dataKey = await unlockVaultRecord(serialized, currentPassword);
    const record = JSON.parse(serialized), salt = b64(random(16));
    record.password = { salt, ...await seal(await passwordKey(newPassword, salt), dataKey, 'smartemr:password-key:v2') };
    return { record: JSON.stringify(record), dataKey };
}

export async function encryptVaultState(state, dataKey) {
    return JSON.stringify({ format: 'smartemr-state-v2', ...await seal(await importKey(unhex(dataKey)), JSON.stringify(state), 'smartemr:state:v2') });
}

export async function decryptVaultState(serialized, dataKey) {
    const envelope = JSON.parse(serialized);
    if (envelope.format !== 'smartemr-state-v2') throw new Error('Unsupported encrypted state.');
    return JSON.parse(await open(await importKey(unhex(dataKey)), envelope, 'smartemr:state:v2'));
}
