// src/lib/travel/share.ts — message + share-target builders. Nothing here
// sends anything: every helper only builds a link/text for the user to confirm.
export const LINK_TOKEN = "[link]";

export const LOCATION_TEMPLATE =
  `My current location is ${LINK_TOKEN}.\n\nI'm sharing this with you for safety. Please keep an eye on my journey.`;

export const withLink = (template: string, link: string) => template.split(LINK_TOKEN).join(link);
export const hasLink = (text: string, link: string) => text.includes(link);
export const digits = (phone: string) => phone.replace(/[^0-9]/g, "");

/** wa.me needs a country code; a bare 10-digit Indian mobile gets 91 prepended. */
export function whatsappLink(text: string, phone?: string): string {
  let d = phone ? digits(phone) : "";
  if (d.length === 10) d = `91${d}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

export function smsLink(text: string, phone?: string, ios = false): string {
  return `sms:${phone ? digits(phone) : ""}${ios ? "&" : "?"}body=${encodeURIComponent(text)}`;
}
export const telegramLink = (text: string, link: string) =>
  `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text.split(link).join("").trim())}`;
export const mailLink = (subject: string, text: string) =>
  `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
