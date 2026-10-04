import { normalizeLineNumber } from "../normalization";
import type { MatchCandidate, PriorBillingRecord, ReconciliationClaim } from "../reconciliation";

const clientLines: MatchCandidate[] = Array.from({ length: 120 }, (_, index) => {
  const lineNumber = `P-${String(index + 1).padStart(4, "0")}`;
  return { id: `client-${index + 1}`, lineNumber, normalizedLineNumber: normalizeLineNumber(lineNumber).normalized };
});

const priorRecords: PriorBillingRecord[] = [
  { id: "ra01-line1", recordType: "claim", raCycleId: "ra01", lineNumber: "P-0001", canonicalLineId: "client-1", quantity: 30, claimedQuantity: 30, stage: "Fabrication", spool: "SP-01" },
  { id: "ra02-line1", recordType: "claim", raCycleId: "ra02", lineNumber: "P-0001", canonicalLineId: "client-1", quantity: 20, claimedQuantity: 20, stage: "Fabrication", spool: "SP-01" },
  { id: "ra01-dup10", recordType: "claim", raCycleId: "ra01", lineNumber: "P-0010", canonicalLineId: "client-10", quantity: 10, claimedQuantity: 10, stage: "Fabrication", spool: "SP-10" },
  { id: "ra01-dup12", recordType: "claim", raCycleId: "ra01", lineNumber: "P-0012", canonicalLineId: "client-12", quantity: 12, claimedQuantity: 12, stage: "Welding", spool: "SP-12" },
  { id: "ra02-dup13", recordType: "claim", raCycleId: "ra02", lineNumber: "P-0013", canonicalLineId: "client-13", quantity: 13, claimedQuantity: 13, stage: "Erection", spool: "SP-13" },
  ...[20, 21, 22].map((number) => ({ id: `prior-over-${number}`, recordType: "claim" as const, raCycleId: "ra02", lineNumber: `P-${String(number).padStart(4, "0")}`, canonicalLineId: `client-${number}`, quantity: 60, claimedQuantity: 60 })),
];

const currentClaims: ReconciliationClaim[] = [
  { id: "current-1", lineNumber: "P-0001", quantity: 15, stage: "Fabrication", spool: "SP-01" },
  { id: "current-zero-pad", lineNumber: "P-2", quantity: 5 },
  { id: "current-size-prefix", lineNumber: '6"-P-0003', quantity: 8 },
  { id: "current-dup10", lineNumber: "P-0010", quantity: 10, stage: "Fabrication", spool: "SP-10" },
  { id: "current-dup11-a", lineNumber: "P-0011", quantity: 11, stage: "Fabrication", spool: "SP-11" },
  { id: "current-dup11-b", lineNumber: "P-0011", quantity: 11, stage: "Fabrication", spool: "SP-11" },
  { id: "current-dup12", lineNumber: "P-0012", quantity: 12, stage: "Welding", spool: "SP-12" },
  { id: "current-dup13", lineNumber: "P-0013", quantity: 13, stage: "Erection", spool: "SP-13" },
  ...[20, 21, 22].map((number) => ({ id: `current-over-${number}`, lineNumber: `P-${String(number).padStart(4, "0")}`, quantity: 45 })),
  ...Array.from({ length: 91 }, (_, index) => ({ id: `current-ready-${index + 1}`, lineNumber: `P-${String(index + 30).padStart(4, "0")}`, quantity: 1 })),
];

const allowableQuantityByLineId = new Map(clientLines.map((line) => [line.id, 100]));

export const billCheckAcceptanceDataset = {
  clientLines,
  priorRecords,
  currentClaims,
  allowableQuantityByLineId,
  confirmedAlias: {
    contractorValue: '6"-P-0003',
    normalizedKey: '6"|P-0003',
    canonicalLineId: "client-3",
  },
};
