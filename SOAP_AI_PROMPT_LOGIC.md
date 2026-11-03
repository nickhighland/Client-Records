# SmartEMR SOAP generation and clinical review

This describes the current local implementation. Both HTML entry points are synchronized; shared clinical rules and lifecycle logic live in `tauri-app/src/soap-clinical-review.js`. This supersedes the earlier prompt extraction.

## Request composition

`buildSoapSystemPrompt()` combines editable SOAP Instructions with the locked clinical/evidence contract and concise section-writing/output rules. The locked rules take precedence. Client/session instructions retain their existing precedence, pronoun rules, modality preferences and platform settings.

The user message supplies the appointment's session information, diagnoses, presenting problem, active goals/objectives, applicable intervention bank, previous selections as context only, audit-proofing inputs, modality lens, pronouns/member details, and platform section configuration. Rejected candidates are explicitly labelled as excluded rather than evidence.

Current session information establishes what occurred today. Earlier drafts contribute historical context only if a clinician explicitly marked that draft reviewed and it has not changed since review. Locally entered diagnosis substantiation is separately labelled historical context. Local chart verification is recorded separately from the destination EHR.

The same clinical response/storage path is used by OpenAI, Open WebUI, Ollama and Vertex. Provider adapters and Vertex caching remain in place.

## Structured clinical content

The core JSON retains S/O/A/P and suggestion arrays and adds:

- `objective_items`: statement ID/text, original source quote, temporal context, direct/inferred/hypothesis classification, topic, technique and related objective.
- `session_evidence`: source-grounded clinical facts that can support Assessment without becoming intervention bullets.
- `clinical_suggestions`: candidate kind, source quote, technique, rationale, evidence references and proposed statement.
- `statement_dependencies`: generated statements and the evidence IDs they depend upon.
- `clinical_links`: evidence-supported links between interventions and treatment objectives.
- `progress_classification`: internal differentiation of improvement, emerging behavior, insight, persistent barriers, worsening, no documented change and insufficient information.

Evidence category and verification status are separate. Only source-grounded direct Objective content enters the initial Objective draft. Missing/malformed classification routes statements into review. Assessment statements without valid direct dependencies also enter review.

Candidate kinds distinguish interventions, formulations, observations, clarifications and editorial improvements. Formulations go to Assessment review and do not establish that Writer performed an intervention. Confirming an intervention does not independently confirm Ct response, improvement, impairment, medical necessity or goal completion.

## Clinician verification

The Objective panel initially shows up to four pending candidates, with the remaining list expandable. Each shows proposed text, source, evidence category, technique and rationale.

Accept confirms the individual statement. Edit opens an editable version, which requires an explicit Approve edited version action. Reject keeps the interpretation out of the draft and downstream factual context. Documentation gaps are questions for review, not factual additions.

The lightweight audit records candidate IDs, action and time rather than duplicating session content. Source identity uses a nonclinical fingerprint rather than another copy of the entire session input.

Explore More Interventions uses the existing provider adapter and context. It adds candidates to the queue without editing the note. Existing/rejected candidates are excluded from the request and exact repeats are filtered locally.

General note review and copying do not confirm pending candidates.

## Consolidation and organization

The existing pre-Organize review classifies duplicate and complementary content. Distinct interventions remain separate unless a clear same-sequence consolidation preserves all meaningful techniques, clinical targets, mechanisms, purpose and responses.

Complementary groups retain all original selections until the clinician approves a proposed consolidation. Proposed text is editable. Keep separate rejects the consolidation. Confirmed candidates can be included through Review consolidations.

Organize applies the approved selection/consolidation decisions and sequences the retained text. The ordering request must preserve its input bullets exactly, preventing that step from introducing a new intervention or response.

The writing preference is approximately 3–5 substantive Objective bullets when appropriate, with no fabrication to a minimum, no omission to a maximum, and no billing-code rule. Suggestion quotas have been removed.

## Support fields and golden-thread review

Interventions and enabled support fields are generated after Organize. Pending/rejected candidates are excluded as factual inputs. Assessment awaiting review is not passed as original evidence. Clinician edits are preserved during dependent generation.

Medical Necessity returns a structured status, concise statement, source quotes and missing-documentation items. A supported result needs a source quote matching current or verified historical material. Insufficient/malformed support is flagged for review; the app does not fabricate a rationale.

The golden thread is an internal reasoning structure: diagnosis, presenting concern, objective, session evidence, verified intervention, documented response, symptom/function change, progress/barriers, continuing skilled need and next step. Missing conceptual links do not require invented content or block clinician review.

Clinical Documentation Review checks contradictions, rejected/unverified content, unsupported causal/progress claims, clinical relevance, treatment-plan linkage, medical necessity and next steps. Findings distinguish clinical inconsistencies, unverified interpretations, documentation opportunities and editorial improvements. Proposed targeted revisions are editable and require application by the clinician.

Objective changes flag dependent statements and support fields. Other SOAP/support edits invalidate review. Async results are checked against their source snapshot. Regeneration preserves manual edits and source-compatible confirmations, retains rejected decisions, and rejects incomplete core responses before replacing valid content.

## Copying and historical drafts

Copy controls continue to copy plain clinical text in the configured layout. Metadata, pending candidates and rejection records are outside the copied field.

A changed draft is reviewed before copying. Clinical findings are shown for clinician judgment; copying does not claim reimbursement or EHR compliance. Mark draft reviewed records an explicit clinician decision separately from machine validation. Only unchanged drafts explicitly reviewed this way become eligible historical context.

No migrations rewrite historical notes for this feature. Existing legacy layouts remain available. Diagnosis lists, presenting-problem copies, treatment-plan copies, platform preferences and encrypted persistence continue using the existing components.

## Verification

Regression coverage includes source classification, confirmation/edit/rejection, formulation separation, complementary consolidation normalization, distinct clinical events, historical-source filtering, preserved edits on regeneration, incomplete-response retention, conditional medical necessity with source quotes, stale-copy review and clipboard exclusions. Provider adapters are exercised using simulated structured responses for all four providers, not live clinical data or live model-quality evaluations.
