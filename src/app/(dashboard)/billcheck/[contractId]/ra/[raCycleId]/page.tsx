"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronDown, Download, Plus, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { ImportPanel } from "@/components/billcheck/ImportPanel";
import { WorkspaceHeader, WorkspaceUnavailable } from "@/components/billcheck/WorkspaceHeader";
import { useBillCheckWorkspace } from "@/components/billcheck/use-billcheck-workspace";
import {
  addCycleSourceFile,
  getWorkOrder,
  importBillCheckFile,
  listBillCheckRows,
  saveConfirmedAlias,
  saveRows,
  serverImportTrace,
  updateBillCheckRow,
  updateBillCheckRowsBatch,
  updateRACycle,
} from "@/lib/billcheck/data";
import { downloadWorkbook, mappedValue, parseImportNumber, type ImportedTable } from "@/lib/billcheck/imports";
import { lineAliasKey, normalizeLineNumber } from "@/lib/billcheck/normalization";
import { calculateLineAmount } from "@/lib/billcheck/calculations";
import { reconcileClaims, type MatchCandidate, type PriorBillingRecord, type ReconciliationResult } from "@/lib/billcheck/reconciliation";
import type { BillCheckAlias, BillCheckBillingRecord, BillCheckContractItem, BillCheckLine, BillCheckRACycle, BillCheckWorkOrder } from "@/types/firebase";

export default function BillCheckRACyclePage() {
  const params = useParams<{ contractId: string; raCycleId: string }>();
  const { contractId, raCycleId } = params;
  const workspace = useBillCheckWorkspace();
  const [workOrder, setWorkOrder] = useState<BillCheckWorkOrder | null>(null);
  const [cycle, setCycle] = useState<BillCheckRACycle | null>(null);
  const [items, setItems] = useState<BillCheckContractItem[]>([]);
  const [lines, setLines] = useState<BillCheckLine[]>([]);
  const [aliases, setAliases] = useState<BillCheckAlias[]>([]);
  const [ledger, setLedger] = useState<BillCheckBillingRecord[]>([]);
  const [results, setResults] = useState<ReconciliationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [showPreviousImport, setShowPreviousImport] = useState(false);
  const [manualOpening, setManualOpening] = useState({ lineNumber: "", quantity: "", certifiedQuantity: "" });
  const [savingManual, setSavingManual] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const load = useCallback(async () => {
    if (!workspace.organization) return;
    setLoading(true);
    setError("");
    try {
      const [order, itemRows, lineRows, aliasRows, ledgerRows, cycles] = await Promise.all([
        getWorkOrder(workspace.organization.id, contractId),
        listBillCheckRows<BillCheckContractItem>(workspace.organization.id, contractId, "contractItems"),
        listBillCheckRows<BillCheckLine>(workspace.organization.id, contractId, "clientLines"),
        listBillCheckRows<BillCheckAlias>(workspace.organization.id, contractId, "aliases"),
        listBillCheckRows<BillCheckBillingRecord>(workspace.organization.id, contractId, "billingLedger"),
        listBillCheckRows<BillCheckRACycle>(workspace.organization.id, contractId, "raCycles"),
      ]);
      setWorkOrder(order);
      setItems(itemRows);
      setLines(lineRows);
      setAliases(aliasRows);
      setLedger(ledgerRows);
      setCycle(cycles.find((candidate) => candidate.id === raCycleId) ?? null);
      const current = ledgerRows.filter((record) => record.recordType === "claim" && record.raCycleId === raCycleId);
      if (current.some((record) => record.matchStatus)) {
        const priorRecords = ledgerRows.filter((record) => record.raCycleId !== raCycleId) as unknown as PriorBillingRecord[];
        const matchCandidates: MatchCandidate[] = lineRows.map((line) => ({ id: line.id, lineNumber: line.originalLineNumber, normalizedLineNumber: line.normalizedLineNumber }));
        const aliasMap = new Map(aliasRows.map((alias) => [alias.normalizedAlias, alias.canonicalLineId]));
        const itemById = new Map(itemRows.map((item) => [item.id, item]));
        const allowed = new Map<string, number>();
        for (const line of lineRows) {
          const itemForLine = itemRows.find((item) => item.itemCode && (line.identifiers?.itemCode ?? "").toUpperCase() === item.itemCode.toUpperCase());
          const candidates = [line.quantity, itemForLine?.contractQuantity].filter((value): value is number => Number.isFinite(value));
          if (candidates.length) allowed.set(line.id, Math.min(...candidates));
        }
        const allowedByItem = new Map(itemRows.map((item) => [item.id, item.contractQuantity]));
        const checked = reconcileClaims({
          claims: current.map((record) => ({ id: record.id, lineNumber: record.lineNumber, quantity: record.claimedQuantity ?? 0, contractItemId: record.contractItemId, itemCode: record.itemCode ?? (record.contractItemId ? itemById.get(record.contractItemId)?.itemCode : undefined), description: record.description, stage: record.stage, spool: record.spool, duplicateReviewed: record.duplicateReviewed })),
          clientLines: matchCandidates,
          aliases: aliasMap,
          priorRecords: priorRecords.filter((record) => record.recordType !== "certification"),
          currentRACycleId: raCycleId,
          allowableQuantityByLineId: allowed,
          allowableQuantityByContractItemId: allowedByItem,
        });
        setResults(checked);
      } else setResults([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load this RA cycle.");
    } finally { setLoading(false); }
  }, [workspace.organization, contractId, raCycleId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const currentClaims = useMemo(() => ledger.filter((record) => record.recordType === "claim" && record.raCycleId === raCycleId), [ledger, raCycleId]);
  const priorRecords = useMemo(() => ledger.filter((record) => record.raCycleId !== raCycleId), [ledger, raCycleId]);
  const resultsById = useMemo(() => new Map(results.map((result) => [result.claimId, result])), [results]);
  const counts = useMemo(() => {
    const ready = results.filter((result) => result.ready).length;
    const needsReview = results.filter((result) => result.issues.includes("PROBABLE_MATCH")).length;
    const blocked = results.filter((result) => result.issues.some((issue) => issue === "UNMATCHED" || issue === "DUPLICATE" || issue === "OVER_CLAIM")).length;
    return { ready, needsReview, blocked, processed: results.length };
  }, [results]);
  const canEdit = Boolean(workspace.isEditor && cycle && cycle.status !== "SUBMITTED" && cycle.status !== "CERTIFIED");
  const canCertify = Boolean(workspace.isEditor && cycle && cycle.status !== "CERTIFIED");

  const sourceColumns = (mapping: Record<string, string>) => Object.fromEntries(Object.entries(mapping).filter(([, value]) => value).map(([key, value]) => [key, value]));

  async function storeImport(file: File, kind: "current_progress" | "opening_balance" | "previous_ra", table: ImportedTable, mapping: Record<string, string>, records: Array<Record<string, unknown>>) {
    if (!workspace.organization || !workspace.user || !cycle) throw new Error("Your organization or RA cycle session is unavailable.");
    const batch = await importBillCheckFile({ organizationId: workspace.organization.id, contractId, raCycleId, file, kind, importedBy: workspace.user.uid, mapping, rowCount: records.length });
    const completed = records.map((record) => ({
      organizationId: workspace.organization!.id,
      contractId,
      createdBy: workspace.user!.uid,
      ...record,
      ...(record.source && typeof record.source === "object" ? { source: { ...(record.source as Record<string, unknown>), importBatchId: batch.id } } : {}),
    }));
    await saveRows(workspace.organization.id, contractId, "billingLedger", completed);
    await addCycleSourceFile(workspace.organization.id, contractId, raCycleId, { fileName: file.name, storagePath: batch.storagePath, importBatchId: batch.id, importedBy: workspace.user.uid });
    await load();
    void table;
  }

  async function importCurrent(file: File, table: ImportedTable, mapping: Record<string, string>) {
    const itemCodeMap = new Map(items.filter((item) => item.itemCode).map((item) => [item.itemCode.trim().toUpperCase(), item]));
    const records = table.rows.map((row) => {
      const lineNumber = mappedValue(row, table.headers, mapping.lineNumber).trim();
      if (!lineNumber) throw new Error(`Row ${row.sourceRow} has no line number.`);
      const quantity = parseImportNumber(mappedValue(row, table.headers, mapping.quantity), `Row ${row.sourceRow} quantity`);
      const code = mappedValue(row, table.headers, mapping.itemCode).trim();
      const item = code ? itemCodeMap.get(code.toUpperCase()) : undefined;
      const sourceAmount = mapping.amount ? parseImportNumber(mappedValue(row, table.headers, mapping.amount), `Row ${row.sourceRow} amount`) : undefined;
      const normalized = normalizeLineNumber(lineNumber);
      return {
        raCycleId,
        raNumber: cycle?.raNumber,
        recordType: "claim",
        lineNumber,
        normalizedLineNumber: normalized.normalized,
        normalizationVersion: normalized.version,
        contractItemId: item?.id,
        itemCode: code || undefined,
        description: mappedValue(row, table.headers, mapping.description).trim() || undefined,
        stage: mappedValue(row, table.headers, mapping.stage).trim() || undefined,
        spool: mappedValue(row, table.headers, mapping.spool).trim() || undefined,
        claimedQuantity: quantity,
        amount: item ? calculateLineAmount(quantity, item.rate) : undefined,
        sourceAmount,
        source: serverImportTrace({ fileName: file.name, sourceRow: row.sourceRow, sourceColumns: sourceColumns(mapping), importBatchId: "pending", importedBy: workspace.user?.uid ?? "" }),
      };
    });
    await storeImport(file, "current_progress", table, mapping, records);
  }

  async function importPrevious(file: File, table: ImportedTable, mapping: Record<string, string>) {
    const byCode = new Map(items.filter((item) => item.itemCode).map((item) => [item.itemCode.trim().toUpperCase(), item]));
    const lineByNormalized = new Map(lines.map((line) => [line.normalizedLineNumber, line]));
    const aliasMap = new Map(aliases.map((alias) => [alias.normalizedAlias, alias.canonicalLineId]));
    const isPreviousRA = Boolean(mapping.raNumber);
    const records = table.rows.map((row) => {
      const lineNumber = mappedValue(row, table.headers, mapping.lineNumber).trim();
      if (!lineNumber) throw new Error(`Row ${row.sourceRow} has no line number.`);
      const quantity = parseImportNumber(mappedValue(row, table.headers, mapping.quantity), `Row ${row.sourceRow} quantity`);
      const code = mappedValue(row, table.headers, mapping.itemCode).trim();
      const item = code ? byCode.get(code.toUpperCase()) : undefined;
      const normalized = normalizeLineNumber(lineNumber);
      const canonicalLineId = aliasMap.get(lineAliasKey(lineNumber)) ?? lineByNormalized.get(normalized.normalized)?.id;
      const certifiedRaw = mapping.certifiedQuantity ? mappedValue(row, table.headers, mapping.certifiedQuantity) : "";
      const certifiedQuantity = certifiedRaw ? parseImportNumber(certifiedRaw, `Row ${row.sourceRow} certified quantity`) : undefined;
      return {
        recordType: isPreviousRA ? "claim" : "opening_balance",
        raNumber: mappedValue(row, table.headers, mapping.raNumber).trim() || undefined,
        lineNumber,
        normalizedLineNumber: normalized.normalized,
        normalizationVersion: normalized.version,
        canonicalLineId,
        contractItemId: item?.id,
        itemCode: code || undefined,
        description: mappedValue(row, table.headers, mapping.description).trim() || undefined,
        stage: mappedValue(row, table.headers, mapping.stage).trim() || undefined,
        spool: mappedValue(row, table.headers, mapping.spool).trim() || undefined,
        claimedQuantity: quantity,
        certifiedQuantity,
        amount: item ? calculateLineAmount(quantity, item.rate) : undefined,
        sourceAmount: mapping.amount ? parseImportNumber(mappedValue(row, table.headers, mapping.amount), `Row ${row.sourceRow} amount`) : undefined,
        source: serverImportTrace({ fileName: file.name, sourceRow: row.sourceRow, sourceColumns: sourceColumns(mapping), importBatchId: "pending", importedBy: workspace.user?.uid ?? "" }),
      };
    });
    await storeImport(file, isPreviousRA ? "previous_ra" : "opening_balance", table, mapping, records);
  }

  async function addManualOpening(event: React.FormEvent) {
    event.preventDefault();
    if (!workspace.organization || !workspace.user || !manualOpening.lineNumber.trim()) return;
    setSavingManual(true);
    try {
      const normalized = normalizeLineNumber(manualOpening.lineNumber);
      const lineId = lines.find((line) => line.normalizedLineNumber === normalized.normalized)?.id;
      const record: Record<string, unknown> = {
        organizationId: workspace.organization.id,
        contractId,
        createdBy: workspace.user.uid,
        recordType: "opening_balance",
        lineNumber: manualOpening.lineNumber.trim(),
        normalizedLineNumber: normalized.normalized,
        normalizationVersion: normalized.version,
        canonicalLineId: lineId,
        claimedQuantity: parseImportNumber(manualOpening.quantity, "Opening quantity"),
      };
      if (manualOpening.certifiedQuantity) record.certifiedQuantity = parseImportNumber(manualOpening.certifiedQuantity, "Certified quantity");
      await saveRows(workspace.organization.id, contractId, "billingLedger", [record]);
      setManualOpening({ lineNumber: "", quantity: "", certifiedQuantity: "" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the opening quantity.");
    } finally { setSavingManual(false); }
  }

  async function runCheck() {
    if (!workspace.organization || !cycle) return;
    if (!lines.length || !currentClaims.length) {
      setError("Import the client line list and current progress before checking this RA.");
      return;
    }
    setChecking(true);
    setError("");
    try {
      const aliasMap = new Map(aliases.map((alias) => [alias.normalizedAlias, alias.canonicalLineId]));
      const itemByCode = new Map(items.filter((item) => item.itemCode).map((item) => [item.itemCode.trim().toUpperCase(), item]));
      const allowable = new Map<string, number>();
      for (const line of lines) {
        const itemCode = line.identifiers?.itemCode?.toUpperCase();
        const item = itemCode ? itemByCode.get(itemCode) : undefined;
        const caps = [line.quantity, item?.contractQuantity].filter((value): value is number => Number.isFinite(value));
        if (caps.length) allowable.set(line.id, Math.min(...caps));
      }
      const allowableByItem = new Map(items.map((item) => [item.id, item.contractQuantity]));
      const checked = reconcileClaims({
        claims: currentClaims.map((record) => ({ id: record.id, lineNumber: record.lineNumber, quantity: record.claimedQuantity ?? 0, contractItemId: record.contractItemId, itemCode: record.itemCode, description: record.description, stage: record.stage, spool: record.spool, duplicateReviewed: record.duplicateReviewed } as PriorBillingRecord)),
        clientLines: lines.map((line) => ({ id: line.id, lineNumber: line.originalLineNumber, normalizedLineNumber: line.normalizedLineNumber })),
        aliases: aliasMap,
        priorRecords: priorRecords as unknown as PriorBillingRecord[],
        currentRACycleId: raCycleId,
        allowableQuantityByLineId: allowable,
        allowableQuantityByContractItemId: allowableByItem,
      });
      const updates = checked.flatMap((result) => {
        const record = currentClaims.find((item) => item.id === result.claimId);
        if (!record) return [];
        return [{ id: record.id, values: {
          matchStatus: result.matchStatus,
          canonicalLineId: result.canonicalLine?.id ?? null,
          issueCodes: result.issues,
          duplicateOf: result.duplicateOf ?? null,
          checkSnapshot: {
            previousClaimedQuantity: result.previousClaimedQuantity,
            previousCertifiedQuantity: result.previousCertifiedQuantity,
            newClaimedCumulative: result.newClaimedCumulative,
            allowableQuantity: result.allowableQuantity ?? null,
            overClaimQuantity: result.overClaimQuantity,
          },
        } }];
      });
      await updateBillCheckRowsBatch(workspace.organization.id, contractId, "billingLedger", updates);
      const ready = checked.filter((result) => result.ready).length;
      const needsReview = checked.filter((result) => result.issues.includes("PROBABLE_MATCH")).length;
      const blocked = checked.filter((result) => result.issues.some((issue) => ["UNMATCHED", "DUPLICATE", "OVER_CLAIM"].includes(issue))).length;
      await updateRACycle(workspace.organization.id, contractId, raCycleId, {
        status: blocked || needsReview ? "NEEDS_REVIEW" : "READY_TO_SUBMIT",
        reconciliation: { processed: checked.length, ready, needsReview, blocked, checkedAt: new Date() },
      });
      setResults(checked);
      await load();
      setResults(checked);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The RA check could not be completed.");
    } finally { setChecking(false); }
  }

  async function acceptMatch(record: BillCheckBillingRecord, result: ReconciliationResult, target: BillCheckLine) {
    if (!workspace.organization || !workspace.user) return;
    await saveConfirmedAlias({
      organizationId: workspace.organization.id,
      contractId,
      aliasValue: record.lineNumber,
      normalizedAlias: lineAliasKey(record.lineNumber),
      canonicalLineId: target.id,
      canonicalLineNumber: target.originalLineNumber,
      confirmedBy: workspace.user.uid,
    });
    await updateBillCheckRow(workspace.organization.id, contractId, "billingLedger", record.id, {
      canonicalLineId: target.id,
      matchStatus: "MATCHED",
      issueCodes: result.issues.filter((issue) => issue !== "PROBABLE_MATCH"),
      userConfirmedMatch: true,
    });
    await load();
    await runCheck();
  }

  async function saveQuantity(record: BillCheckBillingRecord, value: string) {
    if (!workspace.organization) return;
    const quantity = parseImportNumber(value, "Current quantity");
    await updateBillCheckRow(workspace.organization.id, contractId, "billingLedger", record.id, { claimedQuantity: quantity, matchStatus: null, issueCodes: [] });
    await load();
  }

  async function markDuplicateReviewed(record: BillCheckBillingRecord) {
    if (!workspace.organization) return;
    await updateBillCheckRow(workspace.organization.id, contractId, "billingLedger", record.id, { duplicateReviewed: true });
    await load();
    await runCheck();
  }

  async function saveCertifiedQuantity(record: BillCheckBillingRecord, value: string) {
    if (!workspace.organization) return;
    await updateBillCheckRow(workspace.organization.id, contractId, "billingLedger", record.id, {
      certifiedQuantity: value.trim() === "" ? null : parseImportNumber(value, "Certified quantity"),
    });
    await load();
  }

  async function changeCycleStatus(status: "SUBMITTED" | "CERTIFIED") {
    if (!workspace.organization || !cycle) return;
    setStatusBusy(true);
    try { await updateRACycle(workspace.organization.id, contractId, raCycleId, { status }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update the RA status."); }
    finally { setStatusBusy(false); }
  }

  async function exportWorkbook() {
    if (!cycle || !workOrder || results.some((result) => !result.ready)) return;
    const byId = new Map(items.map((item) => [item.id, item]));
    const lineById = new Map(lines.map((line) => [line.id, line]));
    const previousByItem = new Map<string, number>();
    for (const record of priorRecords) {
      if (record.recordType === "certification") continue;
      const itemKey = record.contractItemId ?? record.itemCode?.trim().toUpperCase();
      if (itemKey) previousByItem.set(itemKey, (previousByItem.get(itemKey) ?? 0) + (record.claimedQuantity ?? 0));
    }
    const currentByItem = new Map<string, number>();
    for (const claim of currentClaims) {
      const key = claim.contractItemId ?? claim.itemCode?.trim().toUpperCase() ?? "Unassigned";
      currentByItem.set(key, (currentByItem.get(key) ?? 0) + (claim.claimedQuantity ?? 0));
    }
    const lineRows: Array<Record<string, string | number | null | undefined>> = currentClaims.map((claim) => {
      const result = resultsById.get(claim.id);
      const item = claim.contractItemId ? byId.get(claim.contractItemId) : undefined;
      const line = result?.canonicalLine ? lineById.get(result.canonicalLine.id) : undefined;
      const current = claim.claimedQuantity ?? 0;
      return {
        lineNumber: line?.originalLineNumber ?? claim.lineNumber,
        contractorLine: claim.lineNumber,
        itemCode: item?.itemCode ?? claim.itemCode ?? "",
        description: claim.description ?? item?.description ?? line?.description ?? "",
        unit: item?.unit ?? line?.unit ?? "",
        previousQuantity: result?.previousClaimedQuantity ?? 0,
        currentQuantity: current,
        cumulativeQuantity: result?.newClaimedCumulative ?? current,
        balanceQuantity: result?.allowableQuantity == null ? "" : Math.max(0, result.allowableQuantity - (result.newClaimedCumulative ?? current)),
        rate: item?.rate ?? 0,
        currentAmount: item ? calculateLineAmount(current, item.rate) : 0,
        cumulativeAmount: item ? calculateLineAmount(result?.newClaimedCumulative ?? current, item.rate) : 0,
        status: result?.issues.join(" + ") || "READY",
        sourceFile: claim.source?.sourceFile ?? "",
        sourceRow: claim.source?.sourceRow ?? "",
      };
    });
    lineRows.push({
      lineNumber: "",
      contractorLine: "",
      itemCode: "",
      description: "TOTAL",
      unit: "",
      previousQuantity: "",
      currentQuantity: lineRows.reduce((sum, row) => sum + (Number(row.currentQuantity) || 0), 0),
      cumulativeQuantity: "",
      balanceQuantity: "",
      rate: "",
      currentAmount: lineRows.reduce((sum, row) => sum + (Number(row.currentAmount) || 0), 0),
      cumulativeAmount: "",
      status: "TOTAL",
      sourceFile: "",
      sourceRow: "",
    });
    const abstractRows: Array<Record<string, string | number | null | undefined>> = items.map((item) => {
      const previousQuantity = previousByItem.get(item.id) ?? previousByItem.get(item.itemCode.trim().toUpperCase()) ?? 0;
      const currentQuantity = currentByItem.get(item.id) ?? currentByItem.get(item.itemCode.trim().toUpperCase()) ?? 0;
      return {
        itemCode: item.itemCode,
        description: item.description,
        unit: item.unit,
        contractQuantity: item.contractQuantity,
        previousQuantity,
        currentQuantity,
        cumulativeQuantity: previousQuantity + currentQuantity,
        rate: item.rate,
        contractAmount: calculateLineAmount(item.contractQuantity, item.rate),
        currentAmount: calculateLineAmount(currentQuantity, item.rate),
        cumulativeAmount: calculateLineAmount(previousQuantity + currentQuantity, item.rate),
      };
    });
    abstractRows.push({
      itemCode: "",
      description: "TOTAL",
      unit: "",
      contractQuantity: abstractRows.reduce((sum, row) => sum + Number(row.contractQuantity), 0),
      previousQuantity: abstractRows.reduce((sum, row) => sum + Number(row.previousQuantity), 0),
      currentQuantity: abstractRows.reduce((sum, row) => sum + Number(row.currentQuantity), 0),
      cumulativeQuantity: abstractRows.reduce((sum, row) => sum + Number(row.cumulativeQuantity), 0),
      rate: "",
      contractAmount: abstractRows.reduce((sum, row) => sum + Number(row.contractAmount), 0),
      currentAmount: abstractRows.reduce((sum, row) => sum + Number(row.currentAmount), 0),
      cumulativeAmount: abstractRows.reduce((sum, row) => sum + Number(row.cumulativeAmount), 0),
    });
    const exceptions = results.filter((result) => result.issues.length).map((result) => {
      const claim = currentClaims.find((record) => record.id === result.claimId)!;
      return { line: result.canonicalLine?.lineNumber ?? claim.lineNumber, contractorLine: claim.lineNumber, quantity: claim.claimedQuantity ?? 0, issues: result.issues.join(", "), previousClaimed: result.previousClaimedQuantity, cumulative: result.newClaimedCumulative, allowed: result.allowableQuantity ?? "", source: claim.source?.sourceFile ?? "", row: claim.source?.sourceRow ?? "" };
    });
    const ledgerRows = ledger.map((record) => ({ raNumber: record.raNumber ?? cycle.raNumber, recordType: record.recordType, lineNumber: record.lineNumber, stage: record.stage ?? "", claimedQuantity: record.claimedQuantity ?? "", certifiedQuantity: record.certifiedQuantity ?? "", amount: record.amount ?? "", sourceFile: record.source?.sourceFile ?? "", sourceRow: record.source?.sourceRow ?? "" }));
    await downloadWorkbook(`${workOrder.workOrderNumber}-${cycle.raNumber}-BillCheck.xlsx`, [
      { name: "RA Abstract", columns: [{ header: "Item code", key: "itemCode" }, { header: "Description", key: "description", width: 34 }, { header: "Unit", key: "unit" }, { header: "Contract qty", key: "contractQuantity", numFmt: "#,##0.000" }, { header: "Previous claimed", key: "previousQuantity", numFmt: "#,##0.000" }, { header: "Current claim", key: "currentQuantity", numFmt: "#,##0.000" }, { header: "Cumulative claim", key: "cumulativeQuantity", numFmt: "#,##0.000" }, { header: "Rate", key: "rate", numFmt: "#,##0.00" }, { header: "Contract amount", key: "contractAmount", numFmt: "#,##0.00" }, { header: "Current amount", key: "currentAmount", numFmt: "#,##0.00" }, { header: "Cumulative amount", key: "cumulativeAmount", numFmt: "#,##0.00" }], rows: abstractRows },
      { name: "Line-wise Statement", columns: [{ header: "Client line", key: "lineNumber" }, { header: "Contractor line", key: "contractorLine" }, { header: "Item code", key: "itemCode" }, { header: "Description", key: "description", width: 32 }, { header: "Unit", key: "unit" }, { header: "Previous claim", key: "previousQuantity", numFmt: "#,##0.000" }, { header: "Current claim", key: "currentQuantity", numFmt: "#,##0.000" }, { header: "Cumulative", key: "cumulativeQuantity", numFmt: "#,##0.000" }, { header: "Balance", key: "balanceQuantity", numFmt: "#,##0.000" }, { header: "Rate", key: "rate", numFmt: "#,##0.00" }, { header: "Current amount", key: "currentAmount", numFmt: "#,##0.00" }, { header: "Cumulative amount", key: "cumulativeAmount", numFmt: "#,##0.00" }, { header: "Status", key: "status" }, { header: "Source file", key: "sourceFile", width: 28 }, { header: "Source row", key: "sourceRow" }], rows: lineRows },
      { name: "Exceptions", columns: [{ header: "Client line", key: "line" }, { header: "Contractor line", key: "contractorLine" }, { header: "Current qty", key: "quantity", numFmt: "#,##0.000" }, { header: "Issue", key: "issues" }, { header: "Previous claimed", key: "previousClaimed", numFmt: "#,##0.000" }, { header: "Cumulative", key: "cumulative", numFmt: "#,##0.000" }, { header: "Allowable", key: "allowed", numFmt: "#,##0.000" }, { header: "Source file", key: "source", width: 28 }, { header: "Source row", key: "row" }], rows: exceptions },
      { name: "Billing Ledger", columns: [{ header: "RA", key: "raNumber" }, { header: "Type", key: "recordType" }, { header: "Line", key: "lineNumber" }, { header: "Stage", key: "stage" }, { header: "Claimed qty", key: "claimedQuantity", numFmt: "#,##0.000" }, { header: "Certified qty", key: "certifiedQuantity", numFmt: "#,##0.000" }, { header: "Amount", key: "amount", numFmt: "#,##0.00" }, { header: "Source file", key: "sourceFile", width: 28 }, { header: "Source row", key: "sourceRow" }], rows: ledgerRows },
    ]);
  }

  if (!workspace.organization) return <div className="space-y-5"><WorkspaceHeader {...workspace} onSelect={workspace.selectOrganization} /><WorkspaceUnavailable loading={workspace.loading} error={workspace.error} signedIn={Boolean(workspace.user)} /></div>;

  const currentFields = [
    { key: "lineNumber", label: "Contractor line number", required: true, keywords: ["line number", "line no", "tag", "pipeline line"] },
    { key: "quantity", label: "Current quantity", required: true, keywords: ["current quantity", "quantity", "qty", "executed qty"] },
    { key: "itemCode", label: "Contract item code", keywords: ["item code", "boq code", "item", "code"] },
    { key: "description", label: "Description", keywords: ["description", "work description"] },
    { key: "stage", label: "Stage / activity", keywords: ["stage", "activity", "work stage"] },
    { key: "spool", label: "Spool", keywords: ["spool", "spool number"] },
    { key: "amount", label: "Source amount", keywords: ["amount", "value", "billing amount"] },
  ];

  return <div className="space-y-6">
    <Link href={`/billcheck/${contractId}`} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-accent-500"><ArrowLeft className="w-4 h-4" />{workOrder?.workOrderNumber ?? "Work order"}</Link>
    <WorkspaceHeader {...workspace} onSelect={workspace.selectOrganization} />
    {loading ? <div className="py-12 text-center text-sm text-slate-400">Loading RA check…</div> : !cycle ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">This RA cycle was not found.</div> : <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-accent-500">RA Cycle Check</p><h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">{cycle.raNumber}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{workOrder?.workOrderNumber} · {workOrder?.clientName} · {cycle.period || "Period not set"}</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void runCheck()} disabled={!canEdit || checking || !currentClaims.length || !lines.length} className="inline-flex items-center gap-2 rounded-xl bg-accent-500 hover:bg-accent-600 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white"><RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />{checking ? "Checking…" : "Check RA"}</button>
          {cycle.status === "READY_TO_SUBMIT" && <button onClick={() => void changeCycleStatus("SUBMITTED")} disabled={!workspace.isEditor || statusBusy} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">Mark submitted</button>}
          {cycle.status === "SUBMITTED" && <button onClick={() => void changeCycleStatus("CERTIFIED")} disabled={!workspace.isEditor || statusBusy} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">Mark certified</button>}
          <button onClick={() => void exportWorkbook()} disabled={!results.length || results.some((result) => !result.ready)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40"><Download className="w-4 h-4" />Download result</button>
        </div>
      </div>

      <p role="note" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-900 px-4 py-3 text-xs leading-5 text-slate-600 dark:text-slate-300">Your imported files and review edits are saved to your EPCX Cloud organization as you work. Download the result workbook when all lines are ready.</p>
      {error && <p role="alert" className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {results.length > 0 && <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Lines processed" value={counts.processed} tone="neutral" />
        <SummaryCard label="Ready" value={counts.ready} tone="green" />
        <SummaryCard label="Need review" value={counts.needsReview} tone="amber" />
        <SummaryCard label="Blocked" value={counts.blocked} tone="red" />
      </section>}
      {results.length > 0 && <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${counts.blocked || counts.needsReview ? "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300" : "border-accent-200 dark:border-accent-900 bg-accent-50 dark:bg-accent-950/30 text-accent-800 dark:text-accent-300"}`}>
        {counts.blocked || counts.needsReview ? `${cycle.raNumber} needs review before it is ready to submit.` : `${cycle.raNumber} is ready to submit.`}
      </div>}

      {canEdit && <>
        <div className="grid xl:grid-cols-2 gap-4">
          <ImportPanel title="Import current progress" description="Upload the contractor’s current claim. Quantities are preserved exactly as submitted." fields={currentFields} onImport={importCurrent} />
          <div className="space-y-4">
            <button onClick={() => setShowPreviousImport((visible) => !visible)} className="w-full flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-900 p-5 text-left"><span><span className="block font-semibold text-slate-900 dark:text-white">Previous billing / opening balance</span><span className="block mt-1 text-xs text-slate-500">Import prior RA detail or opening cumulative quantities once.</span></span><ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showPreviousImport ? "rotate-180" : ""}`} /></button>
            {showPreviousImport && <ImportPanel title="Import previous billing" description="Map RA number for previous RA detail; leave it blank for an opening cumulative balance." fields={[
              { key: "lineNumber", label: "Line number", required: true, keywords: ["line number", "line no", "tag"] },
              { key: "quantity", label: "Claimed / opening quantity", required: true, keywords: ["quantity", "qty", "cumulative"] },
              { key: "raNumber", label: "Previous RA number", keywords: ["ra number", "ra no", "bill no", "running account"] },
              { key: "certifiedQuantity", label: "Certified quantity", keywords: ["certified quantity", "certified qty", "passed quantity"] },
              { key: "itemCode", label: "Contract item code", keywords: ["item code", "boq code", "item"] },
              { key: "description", label: "Description", keywords: ["description", "work description"] },
              { key: "stage", label: "Stage / activity", keywords: ["stage", "activity"] },
              { key: "spool", label: "Spool", keywords: ["spool"] },
              { key: "amount", label: "Amount", keywords: ["amount", "billing amount"] },
            ]} onImport={importPrevious} />}
            <form onSubmit={(event) => void addManualOpening(event)} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-900 p-5 space-y-3">
              <div><h3 className="font-semibold text-sm text-slate-900 dark:text-white">Add an opening quantity manually</h3><p className="mt-1 text-xs text-slate-500">Use this when the previous bill has no usable line-level spreadsheet.</p></div>
              <div className="grid sm:grid-cols-3 gap-2"><input required value={manualOpening.lineNumber} onChange={(event) => setManualOpening({ ...manualOpening, lineNumber: event.target.value })} placeholder="Line number" className="table-input" /><input required type="number" min="0" step="any" value={manualOpening.quantity} onChange={(event) => setManualOpening({ ...manualOpening, quantity: event.target.value })} placeholder="Claimed cumulative" className="table-input" /><input type="number" min="0" step="any" value={manualOpening.certifiedQuantity} onChange={(event) => setManualOpening({ ...manualOpening, certifiedQuantity: event.target.value })} placeholder="Certified cumulative" className="table-input" /></div>
              <button disabled={savingManual} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"><Plus className="w-4 h-4" />{savingManual ? "Saving…" : "Add opening balance"}</button>
            </form>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-900 p-4 text-xs text-slate-500 dark:text-slate-400">Claimed and certified quantities are stored separately. Carry-forward uses prior contractor claims for over-claim checking and shows certified totals separately where provided.</div>
      </>}

      {results.length > 0 && <section className="space-y-3">
        <div><h2 className="font-semibold text-slate-900 dark:text-white">Exceptions to review</h2><p className="text-xs text-slate-400 mt-1">Only lines that need attention are listed here. A quantity is never reduced automatically.</p></div>
        {results.filter((result) => !result.ready).length === 0 ? <div className="rounded-2xl border border-accent-200 dark:border-accent-900 bg-white dark:bg-brand-900 p-8 text-center"><CheckCircle2 className="w-8 h-8 text-accent-500 mx-auto mb-2" /><p className="font-semibold text-slate-900 dark:text-white">No exceptions found</p><p className="text-sm text-slate-500 mt-1">This RA check is ready for submission.</p></div> : results.filter((result) => !result.ready).map((result) => {
          const record = currentClaims.find((item) => item.id === result.claimId)!;
          return <ExceptionCard key={record.id} record={record} result={result} lines={lines} isEditor={canEdit} onAccept={(target) => acceptMatch(record, result, target)} onSaveQuantity={(value) => saveQuantity(record, value)} onReviewDuplicate={() => markDuplicateReviewed(record)} />;
        })}
      </section>}

      {currentClaims.length > 0 && <details className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-900 shadow-card overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4"><span><span className="block font-semibold text-sm text-slate-900 dark:text-white">All imported claims</span><span className="block text-xs text-slate-400 mt-1">Includes source row and certified quantity entry.</span></span><Search className="w-4 h-4 text-slate-400" /></summary>
        <div className="overflow-x-auto"><table className="min-w-[900px] w-full text-xs"><thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500"><tr>{["Line", "Description / stage", "Claim qty", "Certified qty", "Result", "Source trace"].map((header) => <th key={header} className="px-3 py-2 text-left font-semibold">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{currentClaims.map((record) => <ClaimRow key={record.id} record={record} result={resultsById.get(record.id)} isEditor={canCertify} onCertified={(value) => saveCertifiedQuantity(record, value)} />)}</tbody></table></div>
      </details>}
    </>}
  </div>;
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "neutral" | "green" | "amber" | "red" }) {
  const colors = { neutral: "text-slate-900 dark:text-white", green: "text-accent-600", amber: "text-amber-600", red: "text-red-500" };
  return <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-900 p-4"><p className="text-xs text-slate-400">{label}</p><p className={`mt-1 text-2xl font-bold ${colors[tone]}`}>{value}</p></div>;
}

function ExceptionCard({ record, result, lines, isEditor, onAccept, onSaveQuantity, onReviewDuplicate }: {
  record: BillCheckBillingRecord;
  result: ReconciliationResult;
  lines: BillCheckLine[];
  isEditor: boolean;
  onAccept: (line: BillCheckLine) => Promise<void>;
  onSaveQuantity: (value: string) => Promise<void>;
  onReviewDuplicate: () => Promise<void>;
}) {
  const [selected, setSelected] = useState(result.canonicalLine?.id ?? "");
  const [quantity, setQuantity] = useState(String(record.claimedQuantity ?? 0));
  const [busy, setBusy] = useState(false);
  const titles: Record<string, string> = { UNMATCHED: "Line not matched", PROBABLE_MATCH: "Check suggested line", DUPLICATE: "Potential duplicate", OVER_CLAIM: "Quantity exceeds allowance" };
  return <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-900 shadow-card p-5 space-y-4">
    <div className="flex items-start gap-3"><div className={`rounded-lg p-2 ${result.issues.includes("OVER_CLAIM") || result.issues.includes("DUPLICATE") || result.issues.includes("UNMATCHED") ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-600"}`}><AlertTriangle className="w-4 h-4" /></div><div className="flex-1"><h3 className="font-semibold text-sm text-slate-900 dark:text-white">{result.issues.map((issue) => titles[issue]).join(" · ")}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Contractor line: <code className="text-slate-800 dark:text-slate-200">{record.lineNumber}</code>{result.canonicalLine && <> · Suggested client line: <code className="text-slate-800 dark:text-slate-200">{result.canonicalLine.lineNumber}</code></>}</p></div><span className="text-xs font-semibold text-slate-400">{record.stage || record.spool || "Progress row"}</span></div>
    {result.issues.includes("OVER_CLAIM") && <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl bg-red-50 dark:bg-red-950/20 p-3 text-xs"><Fact label="Allowed" value={result.allowableQuantity ?? 0} /><Fact label="Previously claimed" value={result.previousClaimedQuantity} /><Fact label="Current claim" value={result.currentQuantity} /><Fact label="Over by" value={result.overClaimQuantity} strong /></div>}
    {result.issues.includes("PROBABLE_MATCH") || result.issues.includes("UNMATCHED") ? <div className="flex flex-wrap items-end gap-2"><label className="flex-1 min-w-56 text-xs text-slate-500">Choose client line<select value={selected} onChange={(event) => setSelected(event.target.value)} className="mt-1 block w-full table-input">{lines.map((line) => <option key={line.id} value={line.id}>{line.originalLineNumber}{line.description ? ` · ${line.description}` : ""}</option>)}</select></label><button disabled={!isEditor || !selected || busy} onClick={async () => { const match = lines.find((line) => line.id === selected); if (!match) return; setBusy(true); try { await onAccept(match); } finally { setBusy(false); } }} className="inline-flex items-center gap-2 rounded-lg bg-accent-500 hover:bg-accent-600 disabled:opacity-50 px-3 py-2 text-xs font-semibold text-white"><Check className="w-4 h-4" />Accept match</button></div> : null}
    {result.issues.includes("OVER_CLAIM") && <div className="flex flex-wrap items-end gap-2"><label className="text-xs text-slate-500">Edit current quantity<input aria-label="Edit current quantity" type="number" min="0" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 block w-44 table-input" /></label><button disabled={!isEditor || busy} onClick={async () => { setBusy(true); try { await onSaveQuantity(quantity); } finally { setBusy(false); } }} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Save quantity</button></div>}
    {result.issues.includes("DUPLICATE") && <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-slate-600 dark:text-slate-300"><p>Same line, stage, and quantity appears in {result.duplicateOf ? "an earlier billing record" : "another row in this RA"}. Repeated billing can be valid; confirm whether this exact claim is intentional.</p>{record.source && <p className="mt-1 text-slate-400">Source: {record.source.sourceFile}, row {record.source.sourceRow}</p>}<button disabled={!isEditor || busy} onClick={async () => { setBusy(true); try { await onReviewDuplicate(); } finally { setBusy(false); } }} className="mt-2 rounded-lg border border-amber-300 dark:border-amber-800 px-3 py-1.5 font-semibold text-amber-700 dark:text-amber-300">Mark intentional</button></div>}
    {record.source && <p className="text-[11px] text-slate-400">Source: {record.source.sourceFile} · row {record.source.sourceRow} · imported by {record.source.importedBy}</p>}
  </article>;
}

function Fact({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return <div><p className="text-slate-400">{label}</p><p className={`mt-1 tabular-nums ${strong ? "font-bold text-red-600" : "font-semibold text-slate-800 dark:text-slate-200"}`}>{value.toLocaleString("en-IN", { maximumFractionDigits: 3 })}</p></div>;
}

function ClaimRow({ record, result, isEditor, onCertified }: { record: BillCheckBillingRecord; result?: ReconciliationResult; isEditor: boolean; onCertified: (value: string) => Promise<void> }) {
  const [certified, setCertified] = useState(record.certifiedQuantity == null ? "" : String(record.certifiedQuantity));
  const [busy, setBusy] = useState(false);
  return <tr><td className="px-3 py-2 text-slate-800 dark:text-slate-200">{result?.canonicalLine?.lineNumber ?? record.lineNumber}</td><td className="px-3 py-2 text-slate-500">{record.description || record.stage || record.spool || "—"}</td><td className="px-3 py-2 tabular-nums">{record.claimedQuantity ?? 0}</td><td className="px-3 py-2"><div className="flex items-center gap-1"><input aria-label={`Certified quantity for ${record.lineNumber}`} disabled={!isEditor} type="number" min="0" step="any" value={certified} onChange={(event) => setCertified(event.target.value)} className="table-input w-28" /><button disabled={!isEditor || busy} onClick={async () => { setBusy(true); try { await onCertified(certified); } finally { setBusy(false); } }} className="rounded p-1.5 text-accent-600 hover:bg-accent-500/10 disabled:opacity-40" title="Save certified quantity"><ShieldCheck className="w-4 h-4" /></button></div></td><td className="px-3 py-2">{result?.issues.length ? <span className="text-amber-600">{result.issues.join(", ")}</span> : result ? <span className="text-accent-600">READY</span> : <span className="text-slate-400">Not checked</span>}</td><td className="px-3 py-2 text-slate-400">{record.source ? `${record.source.sourceFile} · row ${record.source.sourceRow}` : "Manual"}</td></tr>;
}
