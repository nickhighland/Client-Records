import CryptoJS from 'crypto-js';

export function legacyStateFromSql(sql) {
    const insert = /INSERT INTO app_state\s*\(([^)]+)\)\s*VALUES\s*\(((?:[^']|'(?:[^']|'')*')*)\);/gi;
    for (const match of sql.matchAll(insert)) {
        const columns = match[1].split(',').map(value => value.trim());
        const values = match[2].match(/'(?:[^']|'')*'|[^,]+/g)?.map(value => {
            const trimmed = value.trim();
            return trimmed.startsWith("'") ? trimmed.slice(1, -1).replaceAll("''", "'") : trimmed;
        }) || [];
        const row = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
        if (row.key === 'main_state' && typeof row.value === 'string') return row.value;
    }
    throw new Error('Backup does not contain a SmartEMR workspace.');
}

export function unlockLegacyBackup(payload, username, password) {
    const key = CryptoJS.SHA256(`${password}${username}`).toString();
    const sql = typeof payload === 'string' ? payload : CryptoJS.AES.decrypt(payload.data, key).toString(CryptoJS.enc.Utf8);
    const stateCiphertext = legacyStateFromSql(sql);
    const decoded = CryptoJS.AES.decrypt(stateCiphertext, key).toString(CryptoJS.enc.Utf8);
    if (!decoded) throw new Error('Original backup credentials did not decrypt this workspace.');
    const state = JSON.parse(decoded);
    if (!state?.data || !Array.isArray(state.data.clients)) throw new Error('Invalid workspace in backup.');
    return state;
}
