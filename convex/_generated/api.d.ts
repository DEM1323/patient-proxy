/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as attemptDebrief_access from "../attemptDebrief/access.js";
import type * as attemptDebrief_feedbackPrompt from "../attemptDebrief/feedbackPrompt.js";
import type * as attemptDebrief_generation from "../attemptDebrief/generation.js";
import type * as attemptDebrief_model from "../attemptDebrief/model.js";
import type * as attemptDebrief_validators from "../attemptDebrief/validators.js";
import type * as attemptEnding_access from "../attemptEnding/access.js";
import type * as attemptEnding_model from "../attemptEnding/model.js";
import type * as attemptEnding_validators from "../attemptEnding/validators.js";
import type * as attemptInteraction_access from "../attemptInteraction/access.js";
import type * as attemptInteraction_clinicalActions from "../attemptInteraction/clinicalActions.js";
import type * as attemptInteraction_gemini from "../attemptInteraction/gemini.js";
import type * as attemptInteraction_generation from "../attemptInteraction/generation.js";
import type * as attemptInteraction_model from "../attemptInteraction/model.js";
import type * as attemptInteraction_patientPrompt from "../attemptInteraction/patientPrompt.js";
import type * as attemptInteraction_replyScreening from "../attemptInteraction/replyScreening.js";
import type * as attemptInteraction_validators from "../attemptInteraction/validators.js";
import type * as attemptReview_access from "../attemptReview/access.js";
import type * as attemptReview_model from "../attemptReview/model.js";
import type * as attemptStart_access from "../attemptStart/access.js";
import type * as attemptStart_model from "../attemptStart/model.js";
import type * as attemptStart_pilotProvisioning from "../attemptStart/pilotProvisioning.js";
import type * as attemptStart_scenarioContent from "../attemptStart/scenarioContent.js";
import type * as crons from "../crons.js";
import type * as health from "../health.js";
import type * as institutionAdmin_access from "../institutionAdmin/access.js";
import type * as institutionAdmin_lifecycle from "../institutionAdmin/lifecycle.js";
import type * as institutionAdmin_model from "../institutionAdmin/model.js";
import type * as institutionAdmin_operator from "../institutionAdmin/operator.js";
import type * as institutionAdmin_roster from "../institutionAdmin/roster.js";
import type * as institutionAdmin_validators from "../institutionAdmin/validators.js";
import type * as learnerAttemptHistory_access from "../learnerAttemptHistory/access.js";
import type * as learnerAttemptHistory_model from "../learnerAttemptHistory/model.js";
import type * as learningGroups_access from "../learningGroups/access.js";
import type * as learningGroups_model from "../learningGroups/model.js";
import type * as membershipAccess_access from "../membershipAccess/access.js";
import type * as membershipAccess_authorization from "../membershipAccess/authorization.js";
import type * as membershipAccess_model from "../membershipAccess/model.js";
import type * as membershipAccess_pilotInstitutions from "../membershipAccess/pilotInstitutions.js";
import type * as membershipAccess_roles from "../membershipAccess/roles.js";
import type * as membershipAccess_roster from "../membershipAccess/roster.js";
import type * as retention_model from "../retention/model.js";
import type * as retention_purge from "../retention/purge.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "attemptDebrief/access": typeof attemptDebrief_access;
  "attemptDebrief/feedbackPrompt": typeof attemptDebrief_feedbackPrompt;
  "attemptDebrief/generation": typeof attemptDebrief_generation;
  "attemptDebrief/model": typeof attemptDebrief_model;
  "attemptDebrief/validators": typeof attemptDebrief_validators;
  "attemptEnding/access": typeof attemptEnding_access;
  "attemptEnding/model": typeof attemptEnding_model;
  "attemptEnding/validators": typeof attemptEnding_validators;
  "attemptInteraction/access": typeof attemptInteraction_access;
  "attemptInteraction/clinicalActions": typeof attemptInteraction_clinicalActions;
  "attemptInteraction/gemini": typeof attemptInteraction_gemini;
  "attemptInteraction/generation": typeof attemptInteraction_generation;
  "attemptInteraction/model": typeof attemptInteraction_model;
  "attemptInteraction/patientPrompt": typeof attemptInteraction_patientPrompt;
  "attemptInteraction/replyScreening": typeof attemptInteraction_replyScreening;
  "attemptInteraction/validators": typeof attemptInteraction_validators;
  "attemptReview/access": typeof attemptReview_access;
  "attemptReview/model": typeof attemptReview_model;
  "attemptStart/access": typeof attemptStart_access;
  "attemptStart/model": typeof attemptStart_model;
  "attemptStart/pilotProvisioning": typeof attemptStart_pilotProvisioning;
  "attemptStart/scenarioContent": typeof attemptStart_scenarioContent;
  crons: typeof crons;
  health: typeof health;
  "institutionAdmin/access": typeof institutionAdmin_access;
  "institutionAdmin/lifecycle": typeof institutionAdmin_lifecycle;
  "institutionAdmin/model": typeof institutionAdmin_model;
  "institutionAdmin/operator": typeof institutionAdmin_operator;
  "institutionAdmin/roster": typeof institutionAdmin_roster;
  "institutionAdmin/validators": typeof institutionAdmin_validators;
  "learnerAttemptHistory/access": typeof learnerAttemptHistory_access;
  "learnerAttemptHistory/model": typeof learnerAttemptHistory_model;
  "learningGroups/access": typeof learningGroups_access;
  "learningGroups/model": typeof learningGroups_model;
  "membershipAccess/access": typeof membershipAccess_access;
  "membershipAccess/authorization": typeof membershipAccess_authorization;
  "membershipAccess/model": typeof membershipAccess_model;
  "membershipAccess/pilotInstitutions": typeof membershipAccess_pilotInstitutions;
  "membershipAccess/roles": typeof membershipAccess_roles;
  "membershipAccess/roster": typeof membershipAccess_roster;
  "retention/model": typeof retention_model;
  "retention/purge": typeof retention_purge;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
