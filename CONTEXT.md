# Patient Proxy

Patient Proxy supports supervised clinical communication practice with Simulated Patients inside a participating institution.

## Language

**Pilot Institution**:
The single organization sponsoring and governing participation in the alpha.
_Avoid_: Tenant, customer, school

**Membership**:
An explicit authorization for one authenticated person to participate in a Pilot Institution with one or more assigned roles. Authentication alone is not a Membership.
_Avoid_: Account, login, access

**Learner**:
A role held by a Member who completes assigned Simulated Patient Scenarios and reviews their own Attempt history and Formative Feedback.
_Avoid_: Student, trainee, user

**Faculty**:
A role held by a Member who reviews analytics and completed Attempts within their authorized Learning Groups.
_Avoid_: Instructor, teacher, user

**Author**:
A role held by a Member who authors learning content.
_Avoid_: Content creator, user

**Institutional Admin**:
A role held by a Member who administers participation within the Pilot Institution.
_Avoid_: Admin, administrator, user

**Pilot Roster**:
The private list of identities approved for Membership in the alpha, including each identity's assigned roles.
_Avoid_: Domain allowlist, user list

**Learning Group**:
An institution-scoped group of Learners, Faculty, and Institutional Admins used to establish participation and review scope. A Member may belong to multiple Learning Groups.
_Avoid_: Organization, user group, cohort

**Published Scenario**:
A Scenario an Author has made available in the Pilot Institution's scenario list for Learning Groups to adopt.
_Avoid_: Assigned scenario, public scenario

**Available Scenario**:
A Published Scenario included in a Learning Group's available scenario list. Availability permits the group's Learners to use the Scenario and gives the group's Faculty access to matching Attempts while that availability remains; it is not an individual assignment.
_Avoid_: Assigned scenario, group scenario

**Attempt**:
A Learner's single run through a pinned Scenario Version. It retains the messages, Clinical Actions, applied events, terminal outcome, and Formative Feedback needed to interpret that run independently of later Scenario changes. An Ended Attempt is immutable and cannot be resumed.
_Avoid_: Session, chat session

**Active Attempt**:
An Attempt that currently accepts Learner interaction. It is a continuous simulation rather than a pausable one; if the Learner chooses to begin again, the current Attempt ends and the next run is a new Attempt.
_Avoid_: Saved attempt, resumable attempt, session

**Simulated Patient**:
The AI-generated conversational portrayal of the fictional patient during an Attempt. The Simulated Patient expresses authored Clinical Truth and current patient state but does not define or change them.
_Avoid_: Synthetic patient, chatbot, AI patient

**Learner Brief**:
The information about a Scenario given to a Learner before an Attempt begins. It contains only what the Learner would appropriately know at handoff; facts meant to be elicited during the encounter are excluded.
_Avoid_: Student report, full scenario

**Clinical Truth**:
The authoritative clinical facts, expected Clinical Actions, and educational rationale hidden from the Learner during an Attempt and used to keep the Simulated Patient consistent and produce Formative Feedback.
_Avoid_: Answer key, patient prompt

**Communication Criteria**:
Structured, Author-controlled descriptions of observable communication behavior used to ground Formative Feedback for an Attempt. They do not define clinical competence or an authoritative grade.
_Avoid_: Grading rubric, scoring rules, feedback prompt

**Ended Attempt**:
An Attempt that reached a terminal outcome through a learner ending, Scenario End Condition, access suspension, or technical failure. Ending records why interaction stopped, not successful performance or a passing grade.
_Avoid_: Submitted session, passed attempt, successful attempt

**Clinical Action**:
A structured declaration by the Learner that an action is being performed during an Attempt. It records selection and timing and may reveal an observation, but does not demonstrate or verify physical technique.
_Avoid_: Skill check, procedure validation

**Scenario Observation**:
A fact from Clinical Truth revealed in response to a Learner's Clinical Action, such as vital signs or an assessment finding.
_Avoid_: AI finding, generated result

**Formative Feedback**:
AI-generated narrative feedback on an Ended Attempt that links observed communication to pinned Communication Criteria, strengths, and priorities for another Attempt. It is neither clinical guidance nor a validated competency score; evaluating Clinical Actions is reserved for a future extension.
_Avoid_: Grade, competency assessment, pass/fail result

**Attempt Debrief**:
A revisitable post-interaction flow for an Ended Attempt that presents reflection before revealing Formative Feedback. Completing or revisiting it does not resume or alter the Attempt.
_Avoid_: Attempt completion, feedback gate, resumed Attempt

**Reflection Prompt**:
One of two questions in an Attempt Debrief: one supports interpretation of Attempt evidence and one supports planning for another Attempt. A Scenario Version selects either Author-written prompts or prompts generated with Formative Feedback.
_Avoid_: Quiz question, assessment item, feedback

**Learner Reflection**:
A Learner's explicitly submitted, append-only response to a reflection prompt about an Ended Attempt, visible to that Learner and authorized Faculty as part of the shared learning record. Later clarification adds a new response rather than replacing an earlier one.
_Avoid_: Private journal, Faculty feedback, assessment

## Established alpha product boundaries

These requirements carry forward the decisions recorded in the [alpha map](https://github.com/DEM1323/patient-proxy/issues/2) and the earlier `docs/alpha/WAYFINDER.md` in Git history. They describe intended behavior, not a claim that every feature is implemented.

- Elena Ruiz's curated PACU encounter lasts approximately 8–12 minutes and supports pre-licensure nursing Learners. Use synthetic data only. Clinical Actions reveal authored, deterministic Scenario Observations; generated dialogue does not alter Clinical Truth.
- WorkOS Google sign-in authenticates, with a path to institutional OIDC/SAML. Convex enforces exact-identity Pilot Roster admission, stable WorkOS user binding, additive roles, and Pilot Institution isolation. Authentication alone grants no Membership.
- Starting an Attempt requires current Learning Group Scenario availability. Keep the Learner Brief separate from hidden Clinical Truth; persist Learner ownership and a pinned Scenario Version.
- An Active Attempt is continuous, with transport recovery on its current route and no resume affordance. Starting again requires ending the earlier Attempt before creating a new run. An Ended Attempt is immutable.
- Dialogue, the recorded timeline, and the Attempt Debrief must be evidence-grounded. Formative Feedback links to pinned Communication Criteria and makes no competency claim. Clinical Action evaluation remains outside this alpha.
- Ending starts Formative Feedback generation idempotently. Feedback remains hidden until the Learner explicitly answers or skips both Reflection Prompts. Learner Reflections are append-only and shared with authorized Faculty.
- Faculty review depends dynamically on current shared Learning Group membership, current Scenario availability, and Ended Attempt state. Institutional Admin analytics spans the Pilot Institution without inheriting other roles.
- Attempt content is Learner-owned. The approved retention policy is deletion 90 days after completion or 30 days after last activity for incomplete Attempts; automatic deletion implementation and verification remain deferred beyond the original alpha scope. No in-product downloads.
- Keep Gemini and secrets in protected Convex functions. Retain the legacy runtime until the replacement journey passes its checks.
