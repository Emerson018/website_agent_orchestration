import { describe, expect, it } from "vitest";
import { openingHoursOf, summarizeOpeningHours } from "./opening-hours";

const google = (hours: string[]) =>
  ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"].map(
    (day, i) => `${day}: ${hours[i]}`,
  );
const H = "11:00 – 23:00";

describe("summarizeOpeningHours", () => {
  it("groups consecutive days with equal hours", () => {
    expect(summarizeOpeningHours(google([H, H, H, H, H, "10:00 – 14:00", "10:00 – 14:00"]))).toEqual([
      "Segunda a sexta: 11:00 até 23:00",
      "Sábado e domingo: 10:00 até 14:00",
    ]);
    expect(summarizeOpeningHours(google(["Fechado", H, H, H, H, H, H]))).toEqual([
      "Segunda: Fechado",
      "Terça a domingo: 11:00 até 23:00",
    ]);
  });

  it("keeps equal days that are not consecutive apart", () => {
    const other = "08:00 – 12:00";
    expect(summarizeOpeningHours(google([H, other, H, other, H, other, other]))).toEqual([
      "Segunda: 11:00 até 23:00",
      "Terça: 08:00 até 12:00",
      "Quarta: 11:00 até 23:00",
      "Quinta: 08:00 até 12:00",
      "Sexta: 11:00 até 23:00",
      "Sábado e domingo: 08:00 até 12:00",
    ]);
  });

  it("writes split shifts and 24-hour days", () => {
    const split = "12:00 – 15:00, 18:00 – 23:00";
    const open = "Atendimento 24 horas";
    expect(summarizeOpeningHours(google([split, split, split, split, split, open, open]))).toEqual([
      "Segunda a sexta: 12:00 até 15:00 e 18:00 até 23:00",
      "Sábado e domingo: Aberto 24 horas",
    ]);
  });

  it("leaves text it cannot read as it came", () => {
    expect(summarizeOpeningHours(["Ter-Dom: 12h às 23h"])).toEqual(["Ter-Dom: 12h às 23h"]);
    expect(summarizeOpeningHours(undefined)).toEqual([]);
  });
});

describe("openingHoursOf", () => {
  it("prefers the summary saved on the dossier", () => {
    expect(openingHoursOf({ horarios_resumidos: ["Todos os dias: 09:00 até 18:00"], horarios_funcionamento: google(Array(7).fill(H)) })).toEqual([
      "Todos os dias: 09:00 até 18:00",
    ]);
  });

  it("computes it for old leads that only have Google's text", () => {
    expect(openingHoursOf({ horarios_funcionamento: google(Array(7).fill(H)) })).toEqual(["Segunda a domingo: 11:00 até 23:00"]);
    expect(openingHoursOf(null)).toEqual([]);
  });
});
