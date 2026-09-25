/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as attemptInteraction_access from "../attemptInteraction/access.js";
import type * as attemptInteraction_gemini from "../attemptInteraction/gemini.js";
import type * as attemptInteraction_generation from "../attemptInteraction/generation.js";
import type * as attemptInteraction_model from "../attemptInteraction/model.js";
import type * as attemptInteraction_patientPrompt from "../attemptInteraction/patientPrompt.js";
import type * as attemptInteraction_validators from "../attemptInteraction/validators.js";
import type * as attemptStart_access from "../attemptStart/access.js";
import type * as attemptStart_model from "../attemptStart/model.js";
import type * as attemptStart_pilotProvisioning from "../attemptStart/pilotProvisioning.js";
import type * as attemptStart_scenarioContent from "../attemptStart/scenarioContent.js";
import type * as health from "../health.js";
import type * as membershipAccess_access from "../membershipAccess/access.js";
import type * as membershipAccess_authorization from "../membershipAccess/authorization.js";
import type * as membershipAccess_model from "../membershipAccess/model.js";
import type * as membershipAccess_pilotInstitutions from "../membershipAccess/pilotInstitutions.js";
import type * as membershipAccess_roles from "../membershipAccess/roles.js";
import type * as membershipAccess_roster from "../membershipAccess/roster.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "attemptInteraction/access": typeof attemptInteraction_access;
  "attemptInteraction/gemini": typeof attemptInteraction_gemini;
  "attemptInteraction/generation": typeof attemptInteraction_generation;
  "attemptInteraction/model": typeof attemptInteraction_model;
  "attemptInteraction/patientPrompt": typeof attemptInteraction_patientPrompt;
  "attemptInteraction/validators": typeof attemptInteraction_validators;
  "attemptStart/access": typeof attemptStart_access;
  "attemptStart/model": typeof attemptStart_model;
  "attemptStart/pilotProvisioning": typeof attemptStart_pilotProvisioning;
  "attemptStart/scenarioContent": typeof attemptStart_scenarioContent;
  health: typeof health;
  "membershipAccess/access": typeof membershipAccess_access;
  "membershipAccess/authorization": typeof membershipAccess_authorization;
  "membershipAccess/model": typeof membershipAccess_model;
  "membershipAccess/pilotInstitutions": typeof membershipAccess_pilotInstitutions;
  "membershipAccess/roles": typeof membershipAccess_roles;
  "membershipAccess/roster": typeof membershipAccess_roster;
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
