// Deterministic checks on a generated patient reply before it is recorded.
// They enforce the prompt's rules that can be checked without judgment;
// whether a reply introduces a new symptom or history is not screened here.
export type ScreeningReason =
  | "measured_value"
  | "ai_disclosure"
  | "narration"
  | "speaker_label";

// Vital-sign vocabulary followed closely by a number ("my oxygen is 93").
const vitalWithNumber =
  /\b(blood pressure|bp|heart rate|pulse|oxygen|saturation|sats|temperature|temp|respiratory rate|respirations|breathing rate)\b[^.?!\d]{0,20}\d/i;
// A number with a measurement unit ("92 bpm", "93%", "98.4 F"). "100% sure"
// is ordinary speech, not a reading.
const numberWithUnit =
  /\d\s*(%|percent\b)(?!\s*(sure|certain))|\d\s*(mm ?hg|bpm|beats per minute|breaths per minute|degrees)\b|\d\s*°|\b\d{2,3}(\.\d)?\s*[fc]\b/i;
// A blood pressure reading ("124/84"); pain ratings out of ten ("10/10") are
// the patient's own report and stay allowed.
const bloodPressure = /\b\d{2,3}\s*\/\s*(?!10\b)\d{2,3}\b/;
// Monitor terms a patient would not use.
const monitorTerm = /\b(spo2|o2 sat\w*)\b/i;

const aiDisclosure =
  /\b(as an ai|an ai\b|artificial intelligence|language model|chatbot|simulat(ion|ed|or)|system prompt|role-?play)/i;

// Stage directions such as *shivers*, (groans), or [moans].
const narration = /\*[^*\n]+\*|\([^)\n]*\)|\[[^\]\n]*\]/;

export function screenReply(
  reply: string,
  patientName: string,
): ScreeningReason | null {
  if (
    vitalWithNumber.test(reply) ||
    numberWithUnit.test(reply) ||
    bloodPressure.test(reply) ||
    monitorTerm.test(reply)
  ) {
    return "measured_value";
  }
  if (aiDisclosure.test(reply)) {
    return "ai_disclosure";
  }
  if (narration.test(reply)) {
    return "narration";
  }
  // A line that opens with a speaker label voices someone else, or scripts
  // the conversation.
  const names = patientName.split(" ").filter(Boolean).map(escape);
  const speakerLabel = new RegExp(
    `(^|\\n)\\s*(nurse|learner|patient|user|assistant|model|${[
      names.join(" "),
      ...names,
    ].join("|")})\\s*:`,
    "i",
  );
  if (speakerLabel.test(reply)) {
    return "speaker_label";
  }
  return null;
}

function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
