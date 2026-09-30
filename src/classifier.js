// Local rule-based triage: safety-first priority urgent > appointment > admin.

const URGENT = [
  /chest pain/, /can'?t breathe|cannot breathe|short(ness)? of breath|difficulty breathing/,
  /emergency/, /bleeding/, /faint(ed|ing)?|unconscious|passed out/,
  /severe|intense|unbearable/, /allergic|allergy|reaction|rash|swelling|swollen/,
  /seizure|stroke|heart attack|palpitation/, /vomit|dizzy|dizziness/,
  /high fever|fever/, /pain/, /overdose|side effect/,
  /run(ning)? out of (my )?(medication|medicine|insulin|pills)/,
  /(ran|run) out of (my )?(medication|medicine|insulin|pills)/,
  /(no|last) (more )?(insulin|medication|medicine|pills)/,
  /suicid|self.harm|hurt myself/,
  /worse|getting worse|numb/, /urgent|immediately|right now|asap/,
];

const APPOINTMENT = [
  /appointment|appt/, /book(ing)?|schedule|reschedule|rebook/,
  /cancel/, /availab(le|ility)/, /slot|opening|next week|tomorrow|see (the )?doctor/,
  /consultation|visit|follow.?up/, /postpone|move (my|the)/,
];

const ADMIN = [
  /invoice|bill(ing)?|receipt|payment|price|cost|fee|charge/,
  /insurance|coverage|policy/, /certificate|paperwork|form|document|letter/,
  /opening hours|open on|hours|closed/, /address|phone number|email|personal (details|data)|update my/,
  /report|records|prescription copy/,
];

const test = (list, text) => list.some((re) => re.test(text));

export function classify(message) {
  const text = String(message ?? '').toLowerCase();
  if (test(URGENT, text)) return 'urgent';
  if (test(APPOINTMENT, text)) return 'appointment';
  if (test(ADMIN, text)) return 'admin';
  // Unknown: safest non-admin fallback so nothing risky lands in billing.
  return 'appointment';
}
