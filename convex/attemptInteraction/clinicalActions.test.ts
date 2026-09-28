import { describe, expect, it } from "vitest";
import { initialPacuAssessment } from "../attemptStart/scenarioContent";
import { currentStage, observe } from "./clinicalActions";

const content = initialPacuAssessment.clinicalTruth.clinicalActions;

describe("Authored Clinical Action progression", () => {
  it("offers the eight approved actions", () => {
    expect(content.actions.map(({ label }) => label)).toEqual([
      "Perform hand hygiene",
      "Verify two patient identifiers",
      "Obtain all vital signs",
      "Assess level of consciousness",
      "Assess pain",
      "Position for airway safety",
      "Apply oxygen and monitoring",
      "Provide an emesis basin and position for nausea",
    ]);
  });

  it("reveals arrival vital signs until both airway positioning and oxygen are recorded", () => {
    expect(observe(content, [], "vital_signs")).toBe(
      "BP 124/84, HR 92, RR 8, SpO2 93% on room air, temperature 98.4 F.",
    );
    expect(observe(content, ["oxygen_monitoring"], "vital_signs")).toBe(
      "BP 124/84, HR 92, RR 8, SpO2 93% on oxygen, temperature 98.4 F.",
    );
    expect(observe(content, ["position_airway"], "vital_signs")).toBe(
      "BP 124/84, HR 92, RR 8, SpO2 93% on room air, temperature 98.4 F.",
    );
    expect(currentStage(content, ["oxygen_monitoring"]).key).toBe("arrival");
  });

  it("stabilizes after both actions in either order and reports nausea then", () => {
    for (const [first, second] of [
      ["position_airway", "oxygen_monitoring"],
      ["oxygen_monitoring", "position_airway"],
    ]) {
      const observation = observe(content, ["vital_signs", first], second);
      expect(observation).toMatch(/SpO2 improves to 98%/);
      expect(observation).toMatch(/feels sick to her stomach/);
      expect(currentStage(content, [first, second]).key).toBe("stabilized");
    }
    const stabilized = ["position_airway", "oxygen_monitoring"];
    expect(observe(content, stabilized, "vital_signs")).toBe(
      "BP 124/84, HR 92, RR 8, SpO2 98% on oxygen, temperature 98.4 F.",
    );
    expect(observe(content, stabilized, "assess_consciousness")).toBe(
      "More alert than on arrival. Opens eyes to voice and follows simple commands.",
    );
  });

  it("concludes only when the emesis basin follows stabilization", () => {
    const early = ["emesis_basin", "position_airway", "oxygen_monitoring"];
    expect(currentStage(content, early).key).toBe("stabilized");
    const conclusion = observe(content, early, "emesis_basin");
    expect(conclusion).toMatch(/^An emesis basin is placed within reach/);
    expect(conclusion).toMatch(/concludes the authored progression/);
    expect(currentStage(content, [...early, "emesis_basin"]).key).toBe(
      "concluded",
    );
    // Repeating an action after the conclusion reveals no further stage.
    expect(
      observe(content, [...early, "emesis_basin"], "emesis_basin"),
    ).not.toMatch(/concludes/);
  });

  it("is deterministic for the same history", () => {
    const history = ["hand_hygiene", "verify_identifiers", "assess_pain"];
    expect(observe(content, history, "vital_signs")).toBe(
      observe(content, history, "vital_signs"),
    );
    expect(() => observe(content, history, "unknown_action")).toThrow(
      "Unknown Clinical Action",
    );
  });
});
