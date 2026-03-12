import { describe, it, expect } from "vitest";
import { buildAnnotation, getChangesetDir } from "./index.js";

describe("getChangesetDir", () => {
  it("returns path to .changeset directory", () => {
    const result = getChangesetDir();
    expect(result).toMatch(/\.changeset$/);
  });
});

describe("buildAnnotation", () => {
  it("builds annotation with all fields populated", () => {
    const result = buildAnnotation({
      businessValue: "Improves performance",
      hasClientImpact: true,
      clientImpactDetail: "API changes required",
      isTested: true,
      testingDetail: "Unit tests added",
    });

    expect(result).toContain("## Business Context");
    expect(result).toContain("**Business value:** Improves performance");
    expect(result).toContain("**Client impact:** Yes — API changes required");
    expect(result).toContain("**Tested:** Yes — Unit tests added");
  });

  it("builds annotation with no client impact", () => {
    const result = buildAnnotation({
      businessValue: "Bug fix",
      hasClientImpact: false,
      clientImpactDetail: "",
      isTested: false,
      testingDetail: "",
    });

    expect(result).toContain("**Client impact:** No");
    expect(result).not.toContain("Yes —");
  });

  it("builds annotation with no testing", () => {
    const result = buildAnnotation({
      businessValue: "Docs update",
      hasClientImpact: false,
      clientImpactDetail: "",
      isTested: false,
      testingDetail: "",
    });

    expect(result).toContain("**Tested:** No");
  });
});
