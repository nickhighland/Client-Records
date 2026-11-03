import { checkpointDraft, restoreDraft, draftSignature, transferSections, transferText } from './draft-workflow.js';
export const escapeText = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const makeDialog = html => {
    const dialog = document.createElement('dialog');
    dialog.className = 'lab-dialog'; dialog.innerHTML = html;
    document.body.appendChild(dialog);
    dialog.addEventListener('close', () => dialog.remove());
    dialog.showModal();
    return dialog;
};
export function askBackupCredentials(legacy = true) {
    return new Promise(resolve => {
        const dialog = makeDialog('<form><h2>Unlock source backup</h2><p>Enter the original backup account and password. These are used in memory and are not saved.</p><label>Original username<input name="username" autocomplete="off" required></label><label>Original password<input name="password" type="password" autocomplete="off" required></label><button type="submit">Unlock backup</button><button type="button" data-cancel>Cancel</button></form>');
        if (!legacy) {
            dialog.querySelector('p').textContent = 'Enter the password or recovery key that was valid when this Lab backup was created. It is used in memory and is not saved.';
            const username = dialog.querySelector('[name=username]'); username.required = false; username.closest('label').hidden = true;
            dialog.querySelector('[name=password]').previousSibling.textContent = 'Backup password or recovery key';
        }
        dialog.querySelector('form').onsubmit = event => { event.preventDefault(); resolve({ username: dialog.querySelector('[name=username]').value, password: dialog.querySelector('[name=password]').value }); dialog.close(); };
        dialog.querySelector('[data-cancel]').onclick = () => { resolve(null); dialog.close(); };
        dialog.addEventListener('cancel', () => resolve(null));
    });
}
export function showRecoveryKit(kit) {
    if (!kit) return;
    const dialog = makeDialog(`<h2>Save your Lab recovery key</h2><p>Account: ${escapeText(kit.username)}</p><p>This key resets your password while preserving your encrypted drafts. Keep it separately from your backups. It is shown only now.</p><textarea readonly aria-label="Recovery key">${escapeText(kit.recoveryCode)}</textarea><button type="button" data-copy>Copy recovery key</button><button type="button" data-close>I saved my recovery key</button>`);
    dialog.querySelector('[data-copy]').onclick = async event => { try { await navigator.clipboard.writeText(kit.recoveryCode); event.target.textContent = 'Copied'; } catch { event.target.textContent = 'Select and copy the key above'; } };
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
}

export function mountLabWorkspace(hooks) {
    const style = document.createElement('style');
    style.textContent = `.lab-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:9px 12px;border-bottom:2px solid #8b5cf6;background:var(--panel-bg);font-size:.8rem}.lab-toolbar button{padding:5px 9px}.lab-identity{flex:1;min-width:200px}.lab-dialog{width:min(880px,94vw);max-height:90vh;overflow:auto;padding:22px;border:1px solid var(--panel-border);border-radius:12px;background:var(--panel-bg);color:var(--text-color-primary)}.lab-dialog::backdrop{background:#0008}.lab-dialog h2,.lab-dialog p{margin-bottom:12px}.lab-dialog button{padding:8px 12px;margin:5px}.lab-dialog input{padding:8px;margin:6px}.lab-dialog textarea{width:100%;min-height:140px;padding:10px;background:var(--input-bg);color:var(--input-text);border:1px solid var(--input-border)}.lab-dialog label{display:block}.lab-comparison{display:grid;grid-template-columns:1fr 1fr;gap:12px}.lab-comparison textarea{min-height:220px}body.lab-focus #panelClients,body.lab-focus #panelAppointments,body.lab-focus .resizer{display:none!important}body.lab-focus #panelSession,body.lab-focus #panelSoap{flex:1 1 50%!important;min-width:0!important}.lab-status{font-weight:600;color:#7c3aed}`;
    document.head.appendChild(style);
    const toolbar = document.createElement('div');
    toolbar.className = 'lab-toolbar';
    toolbar.innerHTML = '<div class="lab-identity"><strong>SmartEMR Lab · isolated test workspace</strong><div data-identity></div><div data-provider></div></div><span class="lab-status" data-status></span><button data-action="focus">Focus layout</button><button data-action="history">Draft history</button><button data-action="preview">Preview / copy</button><button data-action="transferred">Mark transferred</button><button data-action="cancel">Cancel AI</button><button data-action="demo">Load demo</button><label><input type="checkbox" data-temporary>Temporary draft</label>';
    document.getElementById('mainGrid').before(toolbar);
    const workingEdits = new Map();
    let lastViewKey = '', view = null;
    const contextKey = () => { const { appointment } = hooks.context(); return `${appointment?.id || ''}:${appointment?.soap?.clinicalReview?.generationId || ''}`; };
    const sections = () => { const context = hooks.context(); return context.appointment ? transferSections(document.getElementById('soapContent'), context.sections) : []; };
    const allSignature = () => draftSignature({ o: JSON.stringify(sections()) });
    const update = () => {
        const { client, appointment, platform } = hooks.context();
        toolbar.querySelector('[data-identity]').textContent = client ? `${client.name} · ${appointment ? new Date(appointment.date).toLocaleDateString() : 'Select an appointment'} · ${platform || 'Platform unassigned'}` : 'Select a client and appointment';
        toolbar.querySelector('[data-provider]').textContent = hooks.provider();
        const state = appointment?.soap?.clinicalReview;
        const current = allSignature();
        let status = !appointment?.soap?.o ? 'Draft' : 'Review draft';
        if (state?.candidates.some(item => item.verificationStatus === 'pending')) status = 'Needs confirmation';
        else if (state?.consistency.status === 'checked') status = 'Reviewed';
        if (appointment?.labTransfer?.signature === current) status = appointment.labTransfer.transferredAt ? 'Transferred' : 'Copied';
        toolbar.querySelector('[data-status]').textContent = hooks.jobStatus() || status;
        toolbar.querySelector('[data-action=cancel]').disabled = !hooks.busy();
        lastViewKey = contextKey();
    };
    const preview = targetId => {
        const context = hooks.context();
        if (!context.appointment) return;
        const appointment = context.appointment;
        const available = sections();
        if (!available.length) { alert('Generate or enter a draft first.'); return; }
        const dialog = makeDialog(`<h2>EHR transfer preview</h2><p>${escapeText(context.client.name)} · ${escapeText(new Date(appointment.date).toLocaleDateString())} · ${escapeText(context.platform)}</p><label>Copy section<select data-section><option value="">Entire configured note</option>${available.map(item => `<option value="${escapeText(item.id)}">${escapeText(item.title)}</option>`).join('')}</select></label><label><input type="checkbox" data-headings checked> Include section headings</label><textarea data-text readonly aria-label="Exact text to copy"></textarea><p data-review></p><label><input type="checkbox" data-reviewed> I reviewed the text above for transfer</label><button data-review-button>Run clinical review</button><button data-copy>Copy exactly this text</button><button data-close>Close</button>`);
        let previewSignature = '';
        dialog.querySelector('[data-section]').value = targetId || '';
        if (targetId) dialog.querySelector('[data-headings]').checked = false;
        const populate = () => {
            if (hooks.context().appointment !== appointment) { dialog.close(); return; }
            const selected = dialog.querySelector('[data-section]').value;
            previewSignature = allSignature();
            dialog.querySelector('[data-text]').value = transferText(sections().filter(item => !selected || item.id === selected), dialog.querySelector('[data-headings]').checked);
            const review = appointment.soap?.clinicalReview?.consistency;
            dialog.querySelector('[data-review]').textContent = review?.status === 'checked' ? 'Clinical review complete. Confirm the exact draft before copying.' : 'Clinical review is incomplete or has recommendations. You may review this draft manually and copy it even when AI is unavailable. Pending/rejected candidates are excluded.';
            dialog.querySelector('[data-reviewed]').checked = false;
        };
        dialog.querySelector('[data-section]').onchange = populate;
        dialog.querySelector('[data-headings]').onchange = populate;
        dialog.querySelector('[data-review-button]').onclick = async event => { event.target.disabled = true; try { await hooks.review(); populate(); } finally { event.target.disabled = false; } };
        dialog.querySelector('[data-copy]').onclick = async event => {
            if (!dialog.querySelector('[data-reviewed]').checked) { dialog.querySelector('[data-review]').textContent = 'Review the exact text and check the confirmation box before copying.'; return; }
            if (hooks.context().appointment !== appointment) return;
            if (allSignature() !== previewSignature) { populate(); dialog.querySelector('[data-review]').textContent = 'The draft changed. Review the refreshed preview before copying.'; return; }
            try {
                await navigator.clipboard.writeText(dialog.querySelector('[data-text]').value);
                const selected = dialog.querySelector('[data-section]').value;
                appointment.labTransfer = { ...(appointment.labTransfer || {}), signature: selected ? appointment.labTransfer?.signature : previewSignature, copiedAt: new Date().toISOString(), transferredAt: null,
                    sections: { ...(appointment.labTransfer?.sections || {}), [selected || 'all']: allSignature() } };
                hooks.save(); update(); event.target.textContent = 'Copied';
            } catch { dialog.querySelector('[data-review]').textContent = 'Clipboard unavailable. Select and copy the preview text manually.'; }
        };
        dialog.querySelector('[data-close]').onclick = () => dialog.close();
        populate();
    };
    const history = () => {
        const { appointment } = hooks.context();
        if (!appointment) return;
        const versions = appointment.draftHistory || [];
        if (!versions.length) { alert('No earlier working drafts yet. History is captured before generation and substantive edits.'); return; }
        const dialog = makeDialog(`<h2>Working draft history</h2><select data-version>${versions.map(item => `<option value="${escapeText(item.id)}">${escapeText(new Date(item.at).toLocaleString())} · ${escapeText(item.label)}</option>`).join('')}</select><div class="lab-comparison"><label>Earlier draft<textarea data-before readonly></textarea></label><label>Current draft<textarea data-after readonly></textarea></label></div><button data-restore>Restore selected draft</button><button data-close>Close</button>`);
        const display = soap => ['s','o','a','p','interventions','presentingProblem','diagnosticSupport','medicalNecessity'].flatMap(field => soap?.[field] ? [`${field.toUpperCase()}\n${soap[field]}`] : []).join('\n\n');
        const populate = () => { const prior = versions.find(item => item.id === dialog.querySelector('[data-version]').value); dialog.querySelector('[data-before]').value = display(prior.soap); dialog.querySelector('[data-after]').value = display(appointment.soap); };
        dialog.querySelector('[data-version]').onchange = populate;
        dialog.querySelector('[data-restore]').onclick = () => { if (hooks.context().appointment !== appointment) return; if (confirm('Restore this working draft? The current draft will remain in history.')) { restoreDraft(appointment, dialog.querySelector('[data-version]').value); hooks.save(); hooks.render(); dialog.close(); } };
        dialog.querySelector('[data-close]').onclick = () => dialog.close(); populate();
    };
    toolbar.onclick = event => {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'focus') { document.body.classList.toggle('lab-focus'); localStorage.setItem('labFocusLayout', document.body.classList.contains('lab-focus')); }
        if (action === 'preview') preview();
        if (action === 'history') history();
        if (action === 'demo') hooks.demo();
        if (action === 'cancel') hooks.cancel();
        if (action === 'transferred') {
            const { appointment } = hooks.context();
            const copied = appointment?.labTransfer;
            if (!copied || (copied.signature !== allSignature() && !sections().every(item => copied.sections?.[item.id] === allSignature()))) { alert('Copy the entire draft or each configured section before marking it transferred.'); return; }
            appointment.labTransfer.signature = allSignature();
            appointment.labTransfer.transferredAt = new Date().toISOString();
            if (toolbar.querySelector('[data-temporary]').checked && confirm('Remove this transferred working draft, source notes and draft history from the Lab workspace? Confirm you have retained the note in your EHR.')) {
                appointment.soap = {s:'',o:'',a:'',p:''}; appointment.sessionInfo = ''; appointment.draftHistory = []; delete appointment.chartSnapshot;
            }
            hooks.save(); hooks.render(); update();
        }
    };
    document.addEventListener('click', event => {
        const button = event.target.closest?.('#soapContent button.copy-btn[data-target]');
        if (!button) return;
        event.preventDefault(); event.stopImmediatePropagation(); preview(button.dataset.target);
    }, true);
    document.addEventListener('keydown', event => {
        if (!event.altKey) return;
        if (event.code === 'KeyC') { event.preventDefault(); preview(); }
        if (event.code === 'KeyG') { event.preventDefault(); document.getElementById('generateNoteBtn')?.click(); }
        if (event.code === 'KeyO') { event.preventDefault(); document.getElementById('organizeObjectiveBtn')?.click(); }
        if (event.code === 'KeyZ') { event.preventDefault(); history(); }
    });
    document.body.classList.toggle('lab-focus', localStorage.getItem('labFocusLayout') === 'true');
    update();
    return { update, preview, history,
        captureView() {
            const root = document.getElementById('soapContent');
            root.querySelectorAll('[data-clinical-id]').forEach(card => { const edit = card.querySelector('.clinical-edit'); if (edit) workingEdits.set(`${lastViewKey}:${card.dataset.clinicalId}`, { value: edit.value, open: !edit.classList.contains('hidden') }); });
            const focused = root.contains(document.activeElement) ? document.activeElement : null;
            view = { key: lastViewKey, scroll: root.scrollTop, id: focused?.id, start: focused?.selectionStart, end: focused?.selectionEnd };
        },
        restoreView() {
            const root = document.getElementById('soapContent');
            if (view?.key === contextKey()) {
                root.scrollTop = view.scroll;
                root.querySelectorAll('[data-clinical-id]').forEach(card => {
                    const saved = workingEdits.get(`${view.key}:${card.dataset.clinicalId}`); if (!saved) return;
                    const edit = card.querySelector('.clinical-edit'); edit.value = saved.value;
                    if (saved.open) { edit.classList.remove('hidden'); card.querySelector('.clinical-approve-edit')?.classList.remove('hidden'); card.querySelector('[data-clinical-action=accept]')?.setAttribute('disabled',''); }
                });
                const focus = view.id && document.getElementById(view.id);
                if (focus) { focus.focus({preventScroll:true}); if (typeof focus.setSelectionRange === 'function') focus.setSelectionRange(view.start, view.end); }
            } else workingEdits.clear();
            update();
        }
    };
}
