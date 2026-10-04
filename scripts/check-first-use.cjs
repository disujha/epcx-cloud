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

const { getSafePostAuthPath } = require(path.join(__dirname, "..", "src", "lib", "auth-redirect.ts"));
const importModulePath = path.join(__dirname, "..", "src", "lib", "billcheck", "imports.ts");
const { readImportedTable } = require(importModulePath);
const { getAIProvider } = require(path.join(__dirname, "..", "src", "lib", "ai", "index.ts"));
const heroPath = path.join(__dirname, "..", "src", "components", "marketing", "HeroSection.tsx");
const heroSource = fs.readFileSync(heroPath, "utf8");

assert.equal(getSafePostAuthPath("/billcheck"), "/billcheck", "the RA task survives sign-in");
assert.equal(getSafePostAuthPath("/billcheck/contract-1"), "/billcheck/contract-1");
assert.equal(getSafePostAuthPath("https://example.com"), "/dashboard", "external redirect is rejected");
assert.equal(getSafePostAuthPath("//example.com"), "/dashboard", "protocol-relative redirect is rejected");
assert.equal(getSafePostAuthPath("/\\example.com"), "/dashboard", "backslash redirect is rejected");
assert.equal(getSafePostAuthPath("/login"), "/dashboard", "auth redirect loops are rejected");
assert.equal(getSafePostAuthPath(null), "/dashboard");
assert.throws(() => getAIProvider(undefined), /No supported AI provider/, "an omitted provider never silently selects mock output");
assert.throws(() => getAIProvider("gemini"), /Gemini provider not yet configured/, "unconfigured Gemini fails honestly");

for (const task of [
  "RA bill preparation / checking",
  "TBT record digitization",
  "Drawing material extraction",
  "Fit-up photo assistance",
  "Welding photo assistance",
  "Work order extraction",
]) {
  assert(heroSource.includes(task), `the task selector includes ${task}`);
}
assert(heroSource.includes("Coming soon"), "unavailable tasks are labeled");
assert(heroSource.includes("No trial allowance"), "the available task does not invent a trial limit");
assert(heroSource.includes("Free to start"), "free account signup is described near the task selector");
assert(heroSource.includes("Sign in to EPCX Cloud"), "BillCheck authentication uses the customer-facing product name");
assert(heroSource.includes('href: "/login?redirect=%2Fbillcheck"'), "BillCheck goes through the safe sign-in redirect");
assert(heroSource.includes("Register interest"), "unavailable tasks have an optional interest action");
assert(heroSource.includes("file handling"), "privacy information is available beside the active task");
assert(heroSource.includes("existing EPCX organization"), "sign-up alone does not claim organization access");
assert(!heroSource.includes("MIV"), "drawing output uses a neutral material-schedule term without real samples");
assert(!fs.existsSync(path.join(__dirname, "..", "src", "app", "api", "guest")), "no guest processing endpoint is exposed");
assert(!heroSource.includes("getAIProvider"), "the task selector does not call a mock AI provider");
const marketingNavSource = fs.readFileSync(path.join(__dirname, "..", "src", "components", "marketing", "Navbar.tsx"), "utf8");
const footerSource = fs.readFileSync(path.join(__dirname, "..", "src", "components", "marketing", "Footer.tsx"), "utf8");
assert(!marketingNavSource.includes("Sign in to BillCheck"), "navigation does not present BillCheck as an account/product");
assert(!footerSource.includes("Sign in to BillCheck"), "footer does not present BillCheck as an account/product");
const importPanelSource = fs.readFileSync(path.join(__dirname, "..", "src", "components", "billcheck", "ImportPanel.tsx"), "utf8");
assert(importPanelSource.includes("No task trial allowance or remaining-use counter is configured"), "upload explains that no task trial meter is active");
assert(importPanelSource.includes("do not expire automatically"), "upload explains the actual retention behavior");
const pdfUploadSource = fs.readFileSync(path.join(__dirname, "..", "src", "app", "(dashboard)", "documents", "upload", "page.tsx"), "utf8");
const documentLibrarySource = fs.readFileSync(path.join(__dirname, "..", "src", "app", "(dashboard)", "documents", "page.tsx"), "utf8");
assert(pdfUploadSource.includes("uploadDocument(file"), "PDF upload uses real Firebase upload progress");
assert(!pdfUploadSource.includes("Simulate upload progress"), "PDF upload never displays simulated progress");
assert(documentLibrarySource.includes("listUserDocuments"), "the document library displays stored files instead of sample rows");
assert(!documentLibrarySource.includes("MOCK_DOCS"), "the production document library contains no mock files");

async function checkImportValidation() {
  await assert.rejects(
    () => readImportedTable({ name: "large.xlsx", size: 10 * 1024 * 1024 + 1 }),
    /10 MB or smaller/,
    "oversized files are rejected before parsing",
  );
  await assert.rejects(
    () => readImportedTable({ name: "drawing.pdf", size: 1024 }),
    /Choose an \.xlsx, \.csv, or \.tsv file/,
    "unsupported PDF input is not accepted as an RA spreadsheet",
  );
}

checkImportValidation().then(() => {
  console.log("First-use routing, provider guard, and RA input validation passed.");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
