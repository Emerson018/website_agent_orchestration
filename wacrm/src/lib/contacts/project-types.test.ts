import { describe, expect, it } from "vitest";
import { projectTypesOf } from "./project-types";

describe("projectTypesOf", () => {
  it("returns the project types chosen on the portal form", () => {
    expect(projectTypesOf({ additional_data: { tipos_projeto: ["Site", "Agenda"] } })).toEqual(["Site", "Agenda"]);
  });

  it("returns an empty list when the contact has none", () => {
    expect(projectTypesOf({ additional_data: null })).toEqual([]);
    expect(projectTypesOf({ additional_data: {} })).toEqual([]);
    expect(projectTypesOf(null)).toEqual([]);
  });

  it("ignores malformed data", () => {
    expect(projectTypesOf({ additional_data: { tipos_projeto: "Site" } })).toEqual([]);
    expect(projectTypesOf({ additional_data: { tipos_projeto: ["Site", 3, "", null, "Dashboard"] } })).toEqual([
      "Site",
      "Dashboard",
    ]);
  });
});
