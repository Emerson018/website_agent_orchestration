import { describe, expect, it } from "vitest";
import { designDoClienteOf, masterPromptsOf, promptChangesSince, promptTabOrder, requestedPromptKeys } from "./master-prompts";
import { computeLeadSteps } from "./lead-steps";

const AT = "2026-03-01T10:00:00.000Z";
const LATER = "2026-03-02T10:00:00.000Z";

describe("masterPromptsOf", () => {
  it("reads one prompt per Tipo de Projeto", () => {
    const prompts = masterPromptsOf({
      prompts_mestre: { site: { texto: "S", gerado_em: AT }, agenda: { texto: "A", gerado_em: LATER } },
    });
    expect(prompts.site).toEqual({ texto: "S", geradoEm: AT });
    expect(prompts.agenda).toEqual({ texto: "A", geradoEm: LATER });
    expect(prompts.dashboard).toBeUndefined();
  });

  it("opens an old single prompt_mestre as the Site prompt, so no edit is lost", () => {
    expect(masterPromptsOf({ prompt_mestre: "antigo", prompt_mestre_gerado_em: AT })).toEqual({
      site: { texto: "antigo", geradoEm: AT },
    });
  });

  it("prefers the per-type prompts over the old one and ignores malformed entries", () => {
    const prompts = masterPromptsOf({
      prompt_mestre: "antigo",
      prompts_mestre: { site: { texto: "novo", gerado_em: AT }, agenda: { texto: "" }, x: { texto: "?" } },
    });
    expect(prompts).toEqual({ site: { texto: "novo", geradoEm: AT } });
    expect(masterPromptsOf(null)).toEqual({});
  });
});

describe("requestedPromptKeys", () => {
  it("maps the labels saved on the contact to tab keys, ignoring unknown ones", () => {
    expect(requestedPromptKeys(["Dashboard", "Site", "App mobile"])).toEqual(["site", "dashboard"]);
    expect(requestedPromptKeys([])).toEqual([]);
  });
});

describe("promptTabOrder", () => {
  it("puts the types the client chose first, then the rest in fixed order", () => {
    expect(promptTabOrder(["Dashboard"])).toEqual(["dashboard", "site", "agenda"]);
    expect(promptTabOrder(["Agenda", "Site"])).toEqual(["site", "agenda", "dashboard"]);
    expect(promptTabOrder([])).toEqual(["site", "agenda", "dashboard"]);
  });
});

describe("promptChangesSince", () => {
  it("names the steps whose data changed after a prompt was generated", () => {
    const ad = {
      dossie: { consultado_em: LATER },
      catalogo_extraido: { editado_em: "2026-02-01T00:00:00.000Z" },
    };
    expect(promptChangesSince(ad, AT)).toEqual(["Dossiê"]);
    expect(promptChangesSince(ad, "2026-04-01T00:00:00.000Z")).toEqual([]);
  });
});

describe("Design do Cliente", () => {
  it("reads the pasted DESIGN.md and when it was saved", () => {
    expect(designDoClienteOf({ design_do_cliente: { markdown: "# DESIGN", salvo_em: AT } })).toEqual({ markdown: "# DESIGN", salvoEm: AT });
    expect(designDoClienteOf({ design_do_cliente: { markdown: "   " } })).toBeNull();
    expect(designDoClienteOf(null)).toBeNull();
  });

  it("makes the prompts Desatualizado when it is saved after them", () => {
    expect(promptChangesSince({ design_do_cliente: { markdown: "# D", salvo_em: LATER } }, AT)).toEqual(["Design do Cliente"]);
    expect(promptChangesSince({ design_do_cliente: { markdown: "# D", salvo_em: AT } }, LATER)).toEqual([]);
  });

  it("counts clearing it as a change too", () => {
    expect(promptChangesSince({ design_do_cliente: { markdown: "", salvo_em: LATER } }, AT)).toEqual(["Design do Cliente"]);
  });
});

describe("Etapas do Lead with per-type prompts", () => {
  it("counts the Master Prompt step as done when at least one prompt exists", () => {
    const [step] = computeLeadSteps({ additional_data: { prompts_mestre: { agenda: { texto: "A", gerado_em: AT } } } }).filter(
      (s) => s.key === "prompt",
    );
    expect(step.status).toBe("feito");
  });

  it("is Desatualizado when data changed after any existing tab, naming what changed", () => {
    const [step] = computeLeadSteps({
      additional_data: {
        dossie: { consultado_em: LATER },
        prompts_mestre: { site: { texto: "S", gerado_em: AT }, agenda: { texto: "A", gerado_em: "2026-04-01T00:00:00.000Z" } },
      },
    }).filter((s) => s.key === "prompt");
    expect(step.status).toBe("desatualizado");
    expect(step.changed).toEqual(["Dossiê"]);
  });

  it("is still Faltando with no prompt at all", () => {
    const [step] = computeLeadSteps({ additional_data: {} }).filter((s) => s.key === "prompt");
    expect(step.status).toBe("faltando");
  });
});
