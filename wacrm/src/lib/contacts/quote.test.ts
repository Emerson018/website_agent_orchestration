import { describe, expect, it } from "vitest";
import { quoteOf } from "./quote";

describe("quoteOf", () => {
  it("reads the quote the portal computed for a Combinação", () => {
    const contact = {
      additional_data: {
        orcamento: {
          valor: 2990,
          moeda: "BRL",
          tipos: ["site", "agenda"],
          profissionais: 1,
          mensalidade: 148,
          economia: 490,
          prazo_dias_uteis: 15,
          parcela_10x: 299,
          pix: 2840.5,
        },
      },
    };
    expect(quoteOf(contact)).toEqual({
      implantacao: 2990,
      moeda: "BRL",
      mensalidade: 148,
      economia: 490,
      prazoDiasUteis: 15,
    });
  });

  it("keeps an old quote that only has the value", () => {
    expect(quoteOf({ additional_data: { orcamento: { valor: 1590, moeda: "BRL" } } })).toEqual({
      implantacao: 1590,
      moeda: "BRL",
      mensalidade: null,
      economia: 0,
      prazoDiasUteis: null,
    });
  });

  it("has no quote when the contact has none or it is malformed", () => {
    expect(quoteOf(null)).toBeNull();
    expect(quoteOf({ additional_data: null })).toBeNull();
    expect(quoteOf({ additional_data: { orcamento: { moeda: "BRL" } } })).toBeNull();
    expect(quoteOf({ additional_data: { orcamento: "2990" } })).toBeNull();
  });
});
