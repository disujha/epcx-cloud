/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const javascript = ts.transpile(source, {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  });
  module._compile(javascript, filename);
};

const fixturePath = path.join(__dirname, "..", "src", "lib", "billcheck", "fixtures", "acceptanceDataset.ts");
const enginePath = path.join(__dirname, "..", "src", "lib", "billcheck", "reconciliation.ts");
const normalizationPath = path.join(__dirname, "..", "src", "lib", "billcheck", "normalization.ts");
const importPath = path.join(__dirname, "..", "src", "lib", "billcheck", "imports.ts");
const { billCheckAcceptanceDataset: sample } = require(fixturePath);
const { reconcileClaims } = require(enginePath);
const { normalizeLineNumber, lineAliasKey } = require(normalizationPath);
const { readImportedTable } = require(importPath);

assert.equal(sample.clientLines.length, 120, "the sample contains more than 100 client lines");
assert.equal(sample.currentClaims.length, 102, "the sample includes 100+ current claims");
assert.equal(normalizeLineNumber('6"-P-0614-A1A').normalized, "P-0614-A1A");
assert.equal(normalizeLineNumber('6"-P-0614-A1A').sizeQualifier, '6"');

const baseInput = {
  claims: sample.currentClaims,
  clientLines: sample.clientLines,
  priorRecords: sample.priorRecords,
  currentRACycleId: "ra03",
  allowableQuantityByLineId: sample.allowableQuantityByLineId,
};
const results = reconcileClaims(baseInput);
const byId = new Map(results.map((result) => [result.claimId, result]));

const validCumulative = byId.get("current-1");
assert.equal(validCumulative.newClaimedCumulative, 65, "30 + 20 + 15 is valid cumulative billing");
assert(!validCumulative.issues.includes("DUPLICATE"), "different quantities on earlier RAs are not duplicates");
assert.equal(validCumulative.ready, true);

assert.equal(byId.get("current-zero-pad").matchStatus, "PROBABLE_MATCH", "zero-padding only creates a suggestion");
assert.equal(byId.get("current-size-prefix").matchStatus, "PROBABLE_MATCH", "stripped size qualifiers are not silently accepted");

const duplicates = results.filter((result) => result.issues.includes("DUPLICATE"));
assert(duplicates.length >= 3, "the sample detects at least three exact duplicate claims");
for (const claimId of ["current-dup10", "current-dup11-b", "current-dup12", "current-dup13"]) {
  assert(byId.get(claimId).issues.includes("DUPLICATE"), `${claimId} is flagged as a duplicate`);
}

for (const line of [20, 21, 22]) {
  const result = byId.get(`current-over-${line}`);
  assert(result.issues.includes("OVER_CLAIM"), `line ${line} is flagged over contract quantity`);
  assert.equal(result.overClaimQuantity, 5);
  assert.equal(result.currentQuantity, 45, "the engine never reduces the submitted quantity");
}

const aliasKey = lineAliasKey(sample.confirmedAlias.contractorValue);
assert.equal(aliasKey, sample.confirmedAlias.normalizedKey);
const withConfirmedAlias = reconcileClaims({
  ...baseInput,
  aliases: new Map([[aliasKey, sample.confirmedAlias.canonicalLineId]]),
});
assert.equal(withConfirmedAlias.find((result) => result.claimId === "current-size-prefix").matchStatus, "MATCHED", "a confirmed alias is reused automatically");

async function checkFileImports() {
  const csvText = 'Line,Description,Qty\r\nP-1,"Pipe, spool A",2.5\r\n';
  const csv = await readImportedTable({ name: "progress.csv", size: Buffer.byteLength(csvText), text: async () => csvText });
  assert.deepEqual(csv.headers, ["Line", "Description", "Qty"]);
  assert.equal(csv.rows[0].values[1], "Pipe, spool A", "quoted commas remain inside their cell");
  assert.equal(csv.rows[0].sourceRow, 2);

  const exceljs = require("exceljs");
  const workbook = new exceljs.Workbook();
  const sheet = workbook.addWorksheet("Progress");
  sheet.addRows([["Line", "Current qty"], ["P-0001", 12.5]]);
  const xlsxBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const xlsx = await readImportedTable({
    name: "progress.xlsx",
    size: xlsxBuffer.length,
    arrayBuffer: async () => xlsxBuffer.buffer.slice(xlsxBuffer.byteOffset, xlsxBuffer.byteOffset + xlsxBuffer.byteLength),
  });
  assert.deepEqual(xlsx.headers, ["Line", "Current qty"]);
  assert.equal(xlsx.rows[0].values[1], "12.5", "XLSX numeric cells import as plain values");
  assert.equal(xlsx.rows[0].sourceRow, 2);
}

checkFileImports().then(() => {
  console.log(JSON.stringify({
    clientLines: sample.clientLines.length,
    processed: results.length,
    validCumulative: validCumulative.newClaimedCumulative,
    duplicates: duplicates.length,
    overClaims: [20, 21, 22].length,
    confirmedAliasReused: true,
    csvImport: "passed",
    xlsxImport: "passed",
  }, null, 2));
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
