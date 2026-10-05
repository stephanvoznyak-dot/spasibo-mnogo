/**
 * Domain separation prefixes.
 *
 * ClearingAssertion already signs a structured body (version, cycle, residual, …).
 * Act M1/M2 still use raw body hash without prefix — changing that requires ACT_VERSION=2
 * and migration of every existing act (see ROADMAP).
 */
export const DOMAIN_ACT = "normal-project/act/v1";
export const DOMAIN_CLEARING = "normal-project/clearing/v1";
export const DOMAIN_M2 = "normal-project/m2/v1";

/** Reserved for ACT_VERSION 2. Do not use for ACT_VERSION 1 wire. */
export function domainSeparatedMessage(domain: string, body: Uint8Array): Uint8Array {
  const prefix = new TextEncoder().encode(domain + "\0");
  const out = new Uint8Array(prefix.length + body.length);
  out.set(prefix, 0);
  out.set(body, prefix.length);
  return out;
}
