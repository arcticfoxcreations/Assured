// src/lib/safety/scamCheck.ts — pure, on-device. It looks for common red flags in text the
// person typed. It cannot tell whether a caller is genuine, so it never says "safe" or "scam".
export interface ScamFlag {
  id: string;
  label: string;
  why: string;
}
export interface ScamCheck {
  flags: ScamFlag[];
  numberNotes: string[];
  level: "none" | "some" | "many";
}

const RULES: { id: string; label: string; why: string; re: RegExp; raw?: boolean }[] = [
  { id: "otp", label: "Asks for an OTP, PIN or CVV", why: "Genuine banks, apps and agencies never ask you to share these.", re: /\b(otp|cvv|upi pin|atm pin|one time password)\b/ },
  { id: "urgency", label: "Creates urgency or fear of a block", why: "Scammers rush you so you don't stop to check.", re: /\b(urgent\w*|immediately|right now|last chance|final notice|within \d+ (?:hours?|minutes?)|expire[sd]?|suspended|deactivat\w*|blocked)\b/ },
  { id: "authority", label: "Claims to be police, a court or an agency", why: "Real agencies don't demand money or details over a call or video call.", re: /\b(arrest\w*|warrant|cbi|customs|narcotics|court|legal action|digital arrest|cyber cell|trai|rbi)\b/ },
  { id: "remote", label: "Asks you to install an app or share your screen", why: "Remote-access apps let a stranger see and control your phone and banking apps.", re: /\b(anydesk|teamviewer|quicksupport|screen ?shar\w*|remote access|(?:install|download) (?:this|the|an?) app|apk)\b/ },
  { id: "payment", label: "Asks you to pay or transfer money", why: "Being asked to pay a fee, fine or deposit to fix a problem is a classic scam pattern.", re: /\b(processing fee|registration fee|security deposit|refundable|(?:pay|transfer|send|deposit)\b.{0,30}\b(?:fee|money|amount|rupees|fine|penalty|charges))\b/ },
  { id: "prize", label: "Offers a prize, reward or easy money", why: "Unexpected prizes, lotteries and easy-income tasks are common bait.", re: /\b(lottery|prize|winner|you have won|reward|cashback|free gift|work from home|part time job|earn \d+)\b/ },
  { id: "kyc", label: "Says your KYC, SIM or account needs urgent updating", why: "Banks and operators don't block services over a phone call or text link.", re: /\b(kyc|pan (?:card )?(?:update|expire)|aadhaar (?:update|link|block)|sim (?:block|deactivat)\w*|electricity (?:bill|disconnect)\w*)\b/ },
  { id: "secrecy", label: "Tells you to stay on the line or keep it secret", why: "Isolating you from people who could say 'that sounds like a scam' is a tactic.", re: /\b(don'?t tell|do not tell|keep (?:this )?(?:secret|confidential)|stay on (?:the )?(?:line|call)|don'?t (?:hang up|disconnect))\b/ },
  { id: "parcel", label: "Says a parcel or courier has something illegal", why: "'Illegal parcel' calls are a known route into 'digital arrest' scams.", re: /\b(parcel|courier|fedex|package)\b.{0,40}\b(drugs?|illegal|seized|held|customs|contraband)\b/ },
  { id: "link", label: "Contains a link or shortened link", why: "Don't open links from unexpected messages. Go to the official app or site yourself.", re: /(https?:\/\/|www\.|\b(?:bit\.ly|tinyurl|t\.co|cutt\.ly|shorturl)\b)/, raw: true },
];

export function analyseScam(input: { phone?: string; message?: string; description?: string }): ScamCheck {
  const raw = `${input.message ?? ""} ${input.description ?? ""}`.toLowerCase();
  const norm = raw.replace(/[’‘`]/g, "'").replace(/[^a-z0-9'+\s]/g, " ").replace(/\s+/g, " ");
  const flags: ScamFlag[] = [];
  for (const r of RULES) {
    if ((r.raw ? r.re.test(raw) : r.re.test(norm))) flags.push({ id: r.id, label: r.label, why: r.why });
  }

  const numberNotes: string[] = [];
  const phone = (input.phone ?? "").trim();
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits) {
    if (phone.startsWith("+") && !phone.startsWith("+91")) {
      numberNotes.push("This is an international number. Unexpected calls from abroad asking for money or details deserve extra caution.");
    } else if ((digits.length === 10 && /^[6-9]/.test(digits)) || (digits.length === 12 && digits.startsWith("91"))) {
      numberNotes.push("This looks like an ordinary Indian mobile number. That says nothing about whether the caller is genuine.");
    } else {
      numberNotes.push("This doesn't look like a standard 10-digit Indian mobile number, so check it carefully.");
    }
    numberNotes.push("Caller numbers can be faked, so a familiar-looking number isn't proof either way.");
  }

  const level = flags.length === 0 ? "none" : flags.length <= 2 ? "some" : "many";
  return { flags, numberNotes, level };
}
