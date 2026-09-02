# PROTOTYPE: Alpha Story Map

> Throwaway discussion artifact for [Map the alpha journey into behavior-first vertical slices](https://github.com/DEM1323/patient-proxy/issues/12). It proposes a delivery sequence and module seams; it is not an implementation plan until the ticket is resolved.

## Story Backbone

| Member enters | Learner chooses | Learner attempts | Learner ends | Learner debriefs | Learner revisits | Faculty reviews |
| --- | --- | --- | --- | --- | --- | --- |
| Authenticate and establish Membership | Find an Available Scenario and read its Learner Brief | Converse with the Simulated Patient and take Clinical Actions | Confirm that the Attempt should end | Reflect, then receive Formative Feedback | Reopen the immutable learning record | Find and inspect authorized Ended Attempts |

The implementation order follows this backbone, with grounded multi-turn dialogue preceding deterministic Clinical Actions. Both are increments of the same interaction feature and append to the same Attempt timeline.

## Proposed Walking Skeleton

Each row is independently demonstrable through the replacement UI and Convex. A later row may extend a feature module introduced by an earlier row; it should not create a parallel horizontal layer.

| Order | Vertical slice | Demonstrable outcome | Owning feature module |
| --- | --- | --- | --- |
| 1 | Enter the approved pilot | An approved person reaches the correct role-aware home; everyone else receives an explicit denial | `membership-access` |
| 2 | Start the PACU Attempt | A Learner sees the Available Scenario, reads the Learner Brief, and starts one pinned Attempt | `attempt-start` |
| 3 | Hold a recoverable patient exchange | The Learner and Simulated Patient complete a grounded multi-turn exchange without duplicate turns on retry | `attempt-interaction` |
| 4 | Take a recoverable Clinical Action | The Learner records an authored action, receives its deterministic Scenario Observation, and can refresh without losing progress | `attempt-interaction` |
| 5 | End the Attempt once | The Learner passes the minimum-interaction guardrail, confirms ending, and gets one immutable Ended Attempt despite interruption or retry | `attempt-ending` |
| 6 | Complete the Attempt Debrief | The Learner reflects before viewing evidence-linked Formative Feedback and can safely recover generation | `attempt-debrief` |
| 7 | Revisit an Ended Attempt | The Learner finds and reopens their own immutable Attempt record without a download affordance | `learner-attempt-history` |
| 8 | Review an authorized Ended Attempt | Faculty or an Institutional Admin finds only the Ended Attempts within their current role-derived scope and inspects the same evidence and reflections | `attempt-review` |

## Feature Boundaries

The browser and Convex halves of a feature are one conceptual module even though framework constraints place them in separate roots:

```text
src/alpha/features/<feature>/     route UI, browser state, generated API calls
convex/<feature>/                 public Convex functions and hidden feature logic
```

Routes compose feature entry points and do not contain authorization or domain rules. Public Convex functions derive identity and institution scope, validate commands, and delegate only inside their feature. `convex/schema.ts` is the shared persistence contract; it is not a general-purpose domain layer.

The Attempt is the consistency boundary across `attempt-start`, `attempt-interaction`, `attempt-ending`, and `attempt-debrief`. Those modules may read the same Attempt record but own distinct commands and views. `membership-access` exposes one narrow server-side Membership requirement used at every public boundary. Read modules (`learner-attempt-history` and `attempt-review`) own their authorization projections rather than sharing a permissive generic Attempt query.

## Acceptance Examples

These are the first executable examples for each slice, not an exhaustive test catalogue.

### 1. Enter the approved pilot

**Approved Learner**

```gherkin
Given the private Pilot Roster contains learner@example.edu as a Learner in the UMB Pilot Institution
And that roster entry is not yet bound
When that person completes Google sign-in through WorkOS
Then the entry is bound to the stable WorkOS user ID
And the Learner home is shown
```

**Authenticated but unapproved person**

```gherkin
Given outsider@example.edu is authenticated through WorkOS
And no matching Pilot Roster entry exists
When the person opens a protected alpha route
Then no Membership is created
And access is denied with instructions to contact the pilot administrator
```

**Additive roles**

```gherkin
Given a Member has both Learner and Faculty roles
When the Member enters the alpha
Then both Learner and Faculty journeys are available
And neither role inherits permissions from the other
```

### 2. Start the PACU Attempt

**Available Scenario**

```gherkin
Given Elena Ruiz's Published Scenario is available through one of the Learner's current Learning Groups
When the Learner opens the scenario list and chooses Initial PACU Assessment
Then the Learner Brief is shown without Clinical Truth
When the Learner starts
Then one Active Attempt owned by that Learner is created with the current Scenario Version pinned
```

**A new simulation run does not resume an earlier Attempt**

```gherkin
Given the Learner has an Active Attempt
When a transport interruption occurs and the current interaction reloads
Then the same Active Attempt and its recorded timeline are restored
And no Attempt history or scenario-list action presents it as resumable work
When the Learner later chooses to start Initial PACU Assessment again
Then the Learner must confirm ending the Active Attempt
And a new Attempt is created only after the earlier Attempt has ended
```

**Unavailable or foreign Scenario**

```gherkin
Given a Scenario is unavailable to the Learner or belongs to another Pilot Institution
When the Learner attempts to start it by identifier
Then no Attempt is created
And the request reveals no Scenario details
```

### 3. Hold a recoverable patient exchange

**Grounded multi-turn dialogue**

```gherkin
Given Elena is drowsy, oriented to person, and initially unsure where she is
When the Learner asks "Can you tell me where you are?"
And follows up after Elena responds
Then each Simulated Patient response remains consistent with the authored state and preceding Attempt timeline
And neither response introduces a new clinical fact or Scenario Observation
```

**Model timeout**

```gherkin
Given the Learner has submitted a message and Gemini times out
When the interaction reports the recoverable failure and the Learner retries
Then the original Learner message is not duplicated
And at most one Simulated Patient response is appended for that request
```

### 4. Take a recoverable Clinical Action

**Deterministic observation**

```gherkin
Given the Learner has an Active Attempt before vital signs have been obtained
When the Learner selects "Obtain all vital signs"
Then the Attempt records the Clinical Action and its timing
And the UI reveals BP 124/84, HR 92, RR 8, SpO2 93% on room air, and temperature 98.4 F
And no AI model determines those values
```

**Refresh and replay**

```gherkin
Given a Clinical Action command succeeded but its browser response was interrupted
When the Learner refreshes and the command is retried with the same request identity
Then the authored Scenario Observation is still visible
And the Attempt contains only one occurrence of that command
```

### 5. End the Attempt once

**Guardrail and confirmation**

```gherkin
Given the Active Attempt has one Learner turn and no Clinical Action
When the Learner asks to end it
Then ending is refused because the minimum interaction has not been reached
Given the Learner then records one Clinical Action
When the Learner asks to end and confirms
Then the Attempt becomes an Ended Attempt with reason "learner ended"
And ending makes no pass, failure, or competency claim
```

**Interrupted ending**

```gherkin
Given the ending command succeeded but the browser did not receive its response
When the Learner retries or reopens the Attempt
Then the same Ended Attempt is shown
And no interaction command can mutate it
```

### 6. Complete the Attempt Debrief

**Reflection before feedback**

```gherkin
Given the Learner opens an Ended Attempt for the first time
When the Attempt Debrief begins
Then one interpretation prompt and one next-Attempt planning prompt are presented before Formative Feedback
And recoverable Formative Feedback generation may proceed without revealing its result
When the Learner submits a reflection response
Then the response is appended to the shared learning record and cannot replace an earlier response
When the Learner has explicitly answered or skipped both prompts
Then the Formative Feedback may be revealed
```

**Evidence-bounded generation**

```gherkin
Given the Ended Attempt records no conversational escalation
When Formative Feedback is generated
Then escalation is described as not observed rather than performed incorrectly
And the feedback contains the required five sections without a score or pass/fail statement
And every claimed event is supported by recorded Attempt evidence
```

**Recoverable generation**

```gherkin
Given feedback generation timed out after the Ended Attempt was recorded
When the Learner revisits the Attempt Debrief and retries
Then the Attempt remains Ended and unchanged
And one recoverable feedback result is eventually attached without duplicate sections
```

### 7. Revisit an Ended Attempt

**Learner-owned history**

```gherkin
Given a Learner has two retained Ended Attempts
When the Learner opens Attempt history
Then both Attempts are listed with links to their Attempt Debriefs
And another Learner's Attempt is neither listed nor readable by identifier
And no transcript or recorded-content download action is offered
```

### 8. Review an authorized Ended Attempt

**Current shared scope**

```gherkin
Given Faculty and Learner currently share a Learning Group
And that group currently makes the Attempt's pinned Scenario available
And the Attempt is Ended
When Faculty opens the review list
Then the Attempt is listed once and its evidence, Learner Reflections, and Formative Feedback can be reviewed
```

**Immediate revocation**

```gherkin
Given Faculty can currently review an Ended Attempt through a shared Learning Group
When the Learner is removed from that group or Scenario availability is removed
Then Faculty can no longer list or open that historical Attempt through that scope
```

**In-progress and cross-institution denial**

```gherkin
Given an Attempt is Active or belongs to another Pilot Institution
When Faculty attempts to review it by identifier
Then access is denied without revealing recorded Attempt content
```

**Institution-wide Institutional Admin scope**

```gherkin
Given an Institutional Admin and an Ended Attempt belong to the same Pilot Institution
When the Institutional Admin opens the review list
Then the Attempt is reviewable regardless of Learning Group membership
And an Attempt from another Pilot Institution remains neither listed nor readable by identifier
```

## Proposed Ticket Rewrite

After agreement, replace the four broad implementation tickets with one ordered task ticket per vertical slice. Preserve their native blocking chain in walking-skeleton order, while allowing a ticket to contain multiple concrete examples for its one demonstrable outcome.

The existing broad language should also adopt the current domain terms: `Attempt` instead of `Session`, `Ended Attempt` instead of `Submitted Session`, `Clinical Truth` instead of `Scenario Ground Truth`, and `Attempt Debrief` for the post-interaction flow that contains Learner Reflection and Formative Feedback.

## Decisions Made Against This Prototype

- Prove a grounded multi-turn dialogue before adding Clinical Actions.
- Keep dialogue and Clinical Actions as separate increments of one `attempt-interaction` module.
- Deliver Learner Attempt history before role-scoped review.
- Use one review feature with Faculty and Institutional Admin authorization variants.
- Let the current Active Attempt route recover transient transport interruption, but provide no resume affordance or server-enforced resume lease; choosing Start ends it before another simulation run creates a new Attempt.
- Permit intentional repeated Clinical Actions while deduplicating transport retries of one command.
- Generate Formative Feedback after ending, but reveal it only after an explicit answer or skip for each Reflection Prompt.

## Deferred Beyond This Alpha Map

- Automatic deletion after the approved 90-day Ended Attempt and 30-day inactive Attempt retention periods. The policy remains decided, but implementing and verifying scheduled deletion is not part of this map's destination.
