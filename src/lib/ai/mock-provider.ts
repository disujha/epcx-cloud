import type { AIProvider, AIRequest, AIResponse, AIStreamChunk } from "./types";

// Pre-written engineering responses for mocked demo
const MOCK_RESPONSES: Record<string, string> = {
  default: `I've analyzed the document and here's my assessment:\n\n**Document Overview**\nThis engineering specification document covers technical requirements and standards applicable to the project scope.\n\n**Key Findings**\n- Specification references industry standards (ASME, API, ASTM)\n- Material requirements clearly defined for primary components\n- Inspection and testing requirements outlined in Section 6\n\n**Recommended Actions**\n1. Cross-reference material certificates against spec requirements\n2. Verify inspection hold points are captured in ITP\n3. Confirm vendor qualification requirements are met\n\nWould you like me to examine any specific section in more detail?`,
  summarize: `**Document Summary**\n\nThis is an engineering specification for process equipment used in refinery service. Key aspects:\n\n- **Scope**: Pressure vessel fabrication per ASME VIII Div. 1\n- **Service**: High-temperature, high-pressure hydrocarbon service\n- **Design Pressure**: 150 PSIG at 400°F\n- **Material**: SA-516 Gr. 70 carbon steel\n- **Corrosion Allowance**: 3mm minimum\n\n**Applicable Standards**\nASME VIII, ASME IX, API 650, ASTM A-370\n\n**Inspection Requirements**\n- 100% radiographic examination on seam welds\n- Post-weld heat treatment required\n- Hydrostatic test at 1.3× design pressure`,
  compare: `**Revision Comparison: Rev B vs Rev C**\n\n| Section | Rev B | Rev C | Change Type |\n|---------|-------|-------|-------------|\n| 3.1 | 125 PSIG | 150 PSIG | **CRITICAL** — Design pressure increased |\n| 4.2 | SA-516 Gr. 60 | SA-516 Gr. 70 | Material upgrade |\n| 6.1 | Spot RT | 100% RT | Inspection scope expanded |\n| 7.3 | Optional PWHT | Mandatory PWHT | Requirement added |\n\n**Impact Assessment**\n- Pressure increase requires full structural recalculation\n- Material change affects procurement lead time (~6 weeks)\n- Inspection scope change will impact schedule and cost\n\n⚠️ **Action Required**: Engineering review and approval before fabrication continues.`,
  welding: `**Welding Requirements Summary**\n\n**Applicable Standards**: ASME IX, AWS D1.1\n\n**Process**: SMAW (primary), GTAW (root pass)\n\n**Qualification Requirements**\n- Welders must hold current PQR per ASME IX\n- WPS to be submitted for approval prior to work\n- Welder qualifications valid within 6 months\n\n**Preheat & Interpass**\n- Preheat: 10°C minimum for thickness > 25mm\n- Interpass temperature: 250°C maximum\n\n**Post-Weld Requirements**\n- PWHT: 620°C ± 14°C for 1 hour per 25mm thickness\n- Hardness testing after PWHT: max 248 HBW\n\n**Inspection Hold Points**\n1. Fit-up inspection before welding\n2. Root pass inspection (GTAW)\n3. Final visual and NDE\n4. PWHT completion verification`,
  inspection: `**Inspection Checkpoints (ITP)**\n\n| # | Description | Type | Hold/Witness |\n|---|-------------|------|---------------|\n| 1 | Material receiving & cert review | Document | Hold |\n| 2 | Fit-up & dimensional check | Visual | Witness |\n| 3 | Root pass examination | VT + PT | Hold |\n| 4 | In-process welding | Visual | Monitor |\n| 5 | NDE — RT/UT | NDE | Hold |\n| 6 | PWHT cycle verification | Document | Hold |\n| 7 | Hardness testing post-PWHT | Test | Witness |\n| 8 | Hydrotest | Test | Hold |\n| 9 | Final dimensional inspection | Dimensional | Witness |\n| 10 | Documentation package review | Document | Hold |\n\n**NDE Summary**\n- Radiographic Testing: 100% seam welds\n- Penetrant Testing: All nozzle welds\n- Ultrasonic Testing: Per ASME VIII UW-11`,
  compliance: `**Compliance Gap Analysis**\n\n⚠️ **Missing Items Identified**\n\n| # | Item | Risk Level | Action Required |\n|---|------|------------|------------------|\n| 1 | MDMT marking not specified | Medium | Add to drawing |\n| 2 | Corrosion allowance not stated | High | Engineer to confirm |\n| 3 | Nameplate requirements missing | Low | Add to spec Section 8 |\n| 4 | Pressure relief device sizing | Critical | PSV calculation required |\n| 5 | Nozzle schedule incomplete | Medium | Drawing update needed |\n\n**Regulatory Compliance**\n- ASME stamp required: ✅ Specified\n- National Board registration: ❌ Not mentioned\n- Third-party inspection: ✅ Specified\n\n**Recommendation**: Address items 4 (PSV sizing) immediately before proceeding.`,
};

function getMockResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("summar")) return MOCK_RESPONSES.summarize;
  if (lower.includes("compar") || lower.includes("revision")) return MOCK_RESPONSES.compare;
  if (lower.includes("weld")) return MOCK_RESPONSES.welding;
  if (lower.includes("inspect") || lower.includes("checkpoint")) return MOCK_RESPONSES.inspection;
  if (lower.includes("compliance") || lower.includes("missing")) return MOCK_RESPONSES.compliance;
  return MOCK_RESPONSES.default;
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockProvider: AIProvider = {
  name: "mock",
  model: "epcx-demo-v1",

  async complete(request: AIRequest): Promise<AIResponse> {
    // Simulate network latency
    await delay(1200 + Math.random() * 800);
    const lastUserMessage = [...request.messages]
      .reverse()
      .find((m) => m.role === "user");
    const content = getMockResponse(lastUserMessage?.content ?? "");
    return {
      content,
      provider: "mock",
      model: "epcx-demo-v1",
      usage: { promptTokens: 250, completionTokens: 180, totalTokens: 430 },
      finishReason: "stop",
    };
  },

  async *stream(request: AIRequest): AsyncIterable<AIStreamChunk> {
    const lastUserMessage = [...request.messages]
      .reverse()
      .find((m) => m.role === "user");
    const fullContent = getMockResponse(lastUserMessage?.content ?? "");
    const words = fullContent.split(" ");

    for (let i = 0; i < words.length; i++) {
      await delay(30 + Math.random() * 20);
      yield {
        delta: words[i] + (i < words.length - 1 ? " " : ""),
        done: i === words.length - 1,
      };
    }
  },
};
