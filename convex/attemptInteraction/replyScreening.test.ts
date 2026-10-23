import { describe, expect, it } from "vitest";
import { initialPacuAssessment } from "../attemptStart/scenarioContent";
import { screenReply } from "./replyScreening";

const screen = (reply: string) => screenReply(reply, "Elena Ruiz");

describe("Patient reply screening", () => {
  it("accepts ordinary in-character speech, including her own pain rating", () => {
    for (const reply of [
      "Mm... I'm not sure. Where am I?",
      "It hurts... my belly. Maybe a five out of ten.",
      "It's about 5/10, I guess.",
      "Ten out of ten... no, 10/10, it's bad.",
      "I'm cold... so cold.",
      "I don't know my blood pressure.",
      "I'm not 100% sure what happened.",
      "I sat in the waiting room for 2 hours before surgery.",
      "Elena. My name is Elena Ruiz.",
      "Ay... I feel sick to my stomach.",
    ]) {
      expect(screen(reply), reply).toBeNull();
    }
  });

  it("rejects measured values, including the authored vital signs", () => {
    const authoredVitals = initialPacuAssessment.clinicalTruth.initialState.find(
      (line) => line.includes("SpO2"),
    )!;
    for (const reply of [
      authoredVitals,
      "My blood pressure is 124/84.",
      "My oxygen is 93.",
      "My heart rate is about 92 bpm.",
      "The monitor says 93%.",
      "My temperature is 98.4 F.",
      "My SpO2 is low, I think.",
      "I'm breathing 8 breaths per minute.",
    ]) {
      expect(screen(reply), reply).toBe("measured_value");
    }
  });

  it("rejects disclosure that she is an AI or a simulation", () => {
    for (const reply of [
      "As an AI, I can't feel pain.",
      "I'm just a language model.",
      "This is only a simulation, nurse.",
      "Let's continue the role-play.",
    ]) {
      expect(screen(reply), reply).toBe("ai_disclosure");
    }
  });

  it("rejects narration and stage directions", () => {
    for (const reply of [
      "*shivers* I'm so cold.",
      "(groans) It hurts.",
      "I... [moans] where am I?",
    ]) {
      expect(screen(reply), reply).toBe("narration");
    }
  });

  it("rejects replies that voice another speaker or script the conversation", () => {
    for (const reply of [
      "Nurse: How are you feeling?",
      "I'm tired.\nNurse: Okay, rest now.",
      "Okay.\nElena: Where am I?",
      "Patient: I don't know.",
    ]) {
      expect(screen(reply), reply).toBe("speaker_label");
    }
  });
});
