/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

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
