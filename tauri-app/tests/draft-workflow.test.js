import test from 'node:test';
import assert from 'node:assert/strict';
import { checkpointDraft, restoreDraft, createSaveCoordinator, createAiJobs, transferSections, transferText } from '../src/draft-workflow.js';

test('serialized autosave captures edits made during an outstanding write and retries failures', async () => {
    let state = { note: 'original' }, release;
    const saved = [];
    const coordinator = createSaveCoordinator({ capture: () => state, persist: async snapshot => {
        if (!saved.length) await new Promise(resolve => { release = resolve; });
        saved.push(snapshot);
    } });
    coordinator.touch();
    const pending = coordinator.flush();
    state.note = 'newer edit'; coordinator.touch();
    assert.equal(coordinator.flush(), pending);
    release(); await pending;
    assert.deepEqual(saved, [{note:'original'}, {note:'newer edit'}]);
    assert.equal(coordinator.dirty, false);
    let fails = true;
    const retry = createSaveCoordinator({ capture: () => state, persist: async () => { if (fails) throw new Error('disk full'); } });
    retry.touch(); await assert.rejects(retry.flush()); assert.equal(retry.dirty, true);
    fails = false; await retry.flush(); assert.equal(retry.dirty, false);
});

test('restore keeps current work in history and restores the encounter chart snapshot', () => {
    const appointment = { soap: {o:'Original',clinicalReview:{noteRevision:0}}, chartSnapshot:{diagnosis:'Original diagnosis'} };
    checkpointDraft(appointment, 'Before organizing');
    const id = appointment.draftHistory[0].id;
    appointment.soap.o = 'Edited'; appointment.chartSnapshot.diagnosis = 'Changed';
    assert.equal(restoreDraft(appointment,id),true);
    assert.equal(appointment.soap.o,'Original'); assert.equal(appointment.chartSnapshot.diagnosis,'Original diagnosis');
    assert.equal(appointment.draftHistory[0].soap.o,'Edited');
    assert.equal(appointment.soap.clinicalReview.consistency.status,'review_required');
});

test('AI jobs reject stale and cancelled responses before replacing a draft', async () => {
    let source = 'session one', release;
    const jobs = createAiJobs(async (_url, options) => new Promise(resolve => { release = () => resolve({signal:options.signal}); }));
    const pending = jobs.run('Generating', () => source, () => jobs.fetch('test'));
    source = 'session two'; release(); await assert.rejects(pending, {name:'AbortError'});
    source = 'session one';
    const cancelled = jobs.run('Generating', () => source, () => jobs.fetch('test'));
    jobs.cancel(); release(); await assert.rejects(cancelled, {name:'AbortError'});
    assert.equal(jobs.busy,false);
});

test('all provider fetches time out, including model catalog requests outside a job', async () => {
    const jobs = createAiJobs((_url,{signal}) => new Promise((_resolve,reject) => signal.addEventListener('abort', () => reject(new DOMException('Timed out','AbortError')))),{timeoutMs:5});
    await assert.rejects(jobs.fetch('test'),{name:'AbortError'});
});

test('transfer contains only configured accepted textarea content in platform order', () => {
    const root = { querySelector: selector => selector.includes('"o"') ? {querySelector: query => query === 'textarea' ? {id:'soapO',value:'Accepted objective'} : {firstChild:{textContent:'Objective'}}} : null };
    const sections = transferSections(root,['s','o','medicalNecessity']);
    assert.equal(transferText(sections),'Objective\nAccepted objective');
    assert.equal(transferText(sections,false),'Accepted objective');
});
