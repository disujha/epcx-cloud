import {
  looseLineKey,
  lineAliasKey,
  normalizeLineNumber,
  type NormalizedLineNumber,
} from "./normalization";

export interface MatchCandidate {
  id: string;
  lineNumber: string;
  normalizedLineNumber: string;
  sizeQualifier?: string | null;
}

export interface ReconciliationClaim {
  id: string;
  lineNumber: string;
  quantity: number;
  contractItemId?: string;
  itemCode?: string;
  description?: string;
  stage?: string;
  spool?: string;
  amount?: number;
  duplicateReviewed?: boolean;
}

export interface PriorBillingRecord extends ReconciliationClaim {
  recordType: "opening_balance" | "claim" | "certification";
  raCycleId?: string;
  canonicalLineId?: string;
  certifiedQuantity?: number;
  claimedQuantity?: number;
}

export interface ReconciliationResult {
  claimId: string;
  contractorLine: NormalizedLineNumber;
  matchStatus: "MATCHED" | "PROBABLE_MATCH" | "UNMATCHED";
  canonicalLine?: MatchCandidate;
  issues: Array<"PROBABLE_MATCH" | "UNMATCHED" | "DUPLICATE" | "OVER_CLAIM">;
  ready: boolean;
  previousClaimedQuantity: number;
  previousCertifiedQuantity: number;
  currentQuantity: number;
  newClaimedCumulative: number;
  allowableQuantity?: number;
  overClaimQuantity: number;
  duplicateOf?: string;
}

function sameClaimFingerprint(
  leftLineId: string,
  left: ReconciliationClaim,
  rightLineId: string,
  right: ReconciliationClaim
): boolean {
  const leftItem = (left.contractItemId || left.itemCode || "").trim().toUpperCase();
  const rightItem = (right.contractItemId || right.itemCode || "").trim().toUpperCase();
  return leftLineId === rightLineId &&
    (!leftItem || !rightItem || leftItem === rightItem) &&
    (left.stage || "").trim().toUpperCase() === (right.stage || "").trim().toUpperCase() &&
    (left.spool || "").trim().toUpperCase() === (right.spool || "").trim().toUpperCase() &&
    roundQuantity(left.quantity) === roundQuantity(right.quantity);
}

function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function nonNegative(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, value ?? 0) : 0;
}

/** Pure deterministic reconciliation. It never edits, rounds, or drops claims. */
export function reconcileClaims(input: {
  claims: ReconciliationClaim[];
  clientLines: MatchCandidate[];
  aliases?: Map<string, string>;
  priorRecords?: PriorBillingRecord[];
  currentRACycleId: string;
  allowableQuantityByLineId?: Map<string, number>;
  allowableQuantityByContractItemId?: Map<string, number>;
}): ReconciliationResult[] {
  const aliases = input.aliases ?? new Map<string, string>();
  const priorRecords = input.priorRecords ?? [];
  const linesByNormalized = new Map<string, MatchCandidate[]>();
  const linesByLoose = new Map<string, MatchCandidate[]>();
  const lineNumbers = new Map<string, NormalizedLineNumber>();

  for (const line of input.clientLines) {
    const normalized = normalizeLineNumber(line.lineNumber);
    lineNumbers.set(line.id, normalized);
    const exact = linesByNormalized.get(normalized.normalized) ?? [];
    exact.push(line);
    linesByNormalized.set(normalized.normalized, exact);
    const loose = linesByLoose.get(looseLineKey(normalized.normalized)) ?? [];
    loose.push(line);
    linesByLoose.set(looseLineKey(normalized.normalized), loose);
  }

  const matched = input.claims.map((claim) => {
    const contractorLine = normalizeLineNumber(claim.lineNumber);
    const aliasId = aliases.get(lineAliasKey(claim.lineNumber));
    if (aliasId) {
      const canonicalLine = input.clientLines.find((line) => line.id === aliasId);
      if (canonicalLine) return { claim, contractorLine, canonicalLine, matchStatus: "MATCHED" as const };
    }

    const exactCandidates = linesByNormalized.get(contractorLine.normalized) ?? [];
    if (exactCandidates.length === 1) {
      const candidate = exactCandidates[0];
      const canonicalQualifier = lineNumbers.get(candidate.id)?.sizeQualifier ?? null;
      // A stripped diameter is still meaningful. Require it on both sides or
      // neither side before treating the normalized key as a certain match.
      if (canonicalQualifier === contractorLine.sizeQualifier) {
        return { claim, contractorLine, canonicalLine: candidate, matchStatus: "MATCHED" as const };
      }
      return { claim, contractorLine, canonicalLine: candidate, matchStatus: "PROBABLE_MATCH" as const };
    }
    if (exactCandidates.length > 1) {
      const sameQualifier = exactCandidates.filter(
        (line) => (lineNumbers.get(line.id)?.sizeQualifier ?? null) === contractorLine.sizeQualifier
      );
      if (sameQualifier.length === 1) {
        return { claim, contractorLine, canonicalLine: sameQualifier[0], matchStatus: "MATCHED" as const };
      }
      return { claim, contractorLine, canonicalLine: exactCandidates[0], matchStatus: "PROBABLE_MATCH" as const };
    }

    const possible = linesByLoose.get(looseLineKey(contractorLine.normalized)) ?? [];
    if (possible.length === 1) {
      return { claim, contractorLine, canonicalLine: possible[0], matchStatus: "PROBABLE_MATCH" as const };
    }
    return { claim, contractorLine, canonicalLine: undefined, matchStatus: "UNMATCHED" as const };
  });

  const currentFingerprintOwners: Array<{ lineId: string; claim: ReconciliationClaim }> = [];
  const currentLineTotals = new Map<string, number>();
  const currentItemTotals = new Map<string, number>();
  const results: ReconciliationResult[] = [];
  const resolvePriorLineId = (record: PriorBillingRecord) => {
    if (record.canonicalLineId) return record.canonicalLineId;
    const normalized = normalizeLineNumber(record.lineNumber).normalized;
    const aliasId = aliases.get(lineAliasKey(record.lineNumber));
    if (aliasId) return aliasId;
    const candidates = linesByNormalized.get(normalized) ?? [];
    return candidates.length === 1 ? candidates[0].id : normalized;
  };

  for (const { claim, contractorLine, canonicalLine, matchStatus } of matched) {
    const canonicalId = canonicalLine?.id ?? contractorLine.normalized;
    const lineKey = canonicalId;
    const issues: ReconciliationResult["issues"] = [];
    if (matchStatus === "PROBABLE_MATCH") issues.push("PROBABLE_MATCH");
    if (matchStatus === "UNMATCHED") issues.push("UNMATCHED");

    const previousDuplicate = priorRecords.find((record) => {
      if (record.recordType !== "claim") return false;
      const priorLineId = resolvePriorLineId(record);
      return sameClaimFingerprint(priorLineId, record, lineKey, claim);
    });
    const currentDuplicate = currentFingerprintOwners.find((entry) => sameClaimFingerprint(entry.lineId, entry.claim, lineKey, claim))?.claim.id;
    const duplicateOf = claim.duplicateReviewed ? undefined : previousDuplicate?.id ?? currentDuplicate;
    if (duplicateOf) issues.push("DUPLICATE");
    else currentFingerprintOwners.push({ lineId: lineKey, claim });

    const priorLineRecords = priorRecords.filter((record) => {
      if (record.recordType === "certification") return false;
      const priorLineId = resolvePriorLineId(record);
      return priorLineId === lineKey;
    });
    const previousClaimedQuantity = roundQuantity(
      priorLineRecords.reduce((sum, record) => sum + nonNegative(record.claimedQuantity ?? record.quantity), 0)
    );
    const previousCertifiedQuantity = roundQuantity(
      priorLineRecords.reduce((sum, record) => sum + nonNegative(record.certifiedQuantity), 0)
    );

    const alreadyCurrent = currentLineTotals.get(lineKey) ?? 0;
    currentLineTotals.set(lineKey, alreadyCurrent + nonNegative(claim.quantity));

    const lineAllowable = canonicalLine
      ? input.allowableQuantityByLineId?.get(canonicalLine.id)
      : undefined;
    const itemAllowable = claim.contractItemId
      ? input.allowableQuantityByContractItemId?.get(claim.contractItemId)
      : undefined;
    const priorItemRecords = claim.contractItemId
      ? priorRecords.filter((record) => record.recordType !== "certification" && record.contractItemId === claim.contractItemId)
      : [];
    const previousItemQuantity = roundQuantity(
      priorItemRecords.reduce((sum, record) => sum + nonNegative(record.claimedQuantity ?? record.quantity), 0)
    );
    const previousItemCertified = roundQuantity(
      priorItemRecords.reduce((sum, record) => sum + nonNegative(record.certifiedQuantity), 0)
    );
    const alreadyCurrentForItem = claim.contractItemId ? currentItemTotals.get(claim.contractItemId) ?? 0 : 0;
    const currentItemCumulative = roundQuantity(previousItemQuantity + alreadyCurrentForItem + nonNegative(claim.quantity));
    if (claim.contractItemId) currentItemTotals.set(claim.contractItemId, alreadyCurrentForItem + nonNegative(claim.quantity));

    const newClaimedCumulative = itemAllowable == null
      ? roundQuantity(previousClaimedQuantity + alreadyCurrent + nonNegative(claim.quantity))
      : currentItemCumulative;
    const previousForDisplay = itemAllowable == null ? previousClaimedQuantity : previousItemQuantity;
    const certifiedForDisplay = itemAllowable == null ? previousCertifiedQuantity : previousItemCertified;
    const allowable = lineAllowable == null
      ? itemAllowable
      : itemAllowable == null ? lineAllowable : Math.min(lineAllowable, itemAllowable);
    const lineCumulative = roundQuantity(previousClaimedQuantity + alreadyCurrent + nonNegative(claim.quantity));
    const lineOverClaim = lineAllowable == null ? 0 : Math.max(0, lineCumulative - lineAllowable);
    const itemOverClaim = itemAllowable == null ? 0 : Math.max(0, currentItemCumulative - itemAllowable);
    const overClaimQuantity = roundQuantity(Math.max(lineOverClaim, itemOverClaim));
    if (overClaimQuantity > 0) issues.push("OVER_CLAIM");
    results.push({
      claimId: claim.id,
      contractorLine,
      matchStatus,
      canonicalLine,
      issues,
      ready: issues.length === 0,
      previousClaimedQuantity: previousForDisplay,
      previousCertifiedQuantity: certifiedForDisplay,
      currentQuantity: claim.quantity,
      newClaimedCumulative,
      allowableQuantity: allowable,
      overClaimQuantity,
      duplicateOf,
    });
  }

  return results;
}

export function toClaimIssueCodes(result: ReconciliationResult) {
  return result.issues;
}
