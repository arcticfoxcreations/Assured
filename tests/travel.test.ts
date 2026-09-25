import test from "node:test";
import assert from "node:assert/strict";
import { checkDeviation, haversineM, nearestOnLine, parseLatLng, remainingAlongM, simplify, fmtClock, fmtDistance } from "../src/lib/travel/geo";
import { pickProfiles, scoreRoute } from "../src/lib/travel/scoring";
import { LOCATION_TEMPLATE, smsLink, whatsappLink, withLink } from "../src/lib/travel/share";
import { checkReportText, roundCoord } from "../src/lib/travel/moderation";
import { createJourney, endJourney, guardianView, patchJourney } from "../src/lib/server/journeys";
import { createReport, flagReport, listReports } from "../src/lib/server/reports";
import { rateLimit } from "../src/lib/server/rateLimit";
import { storageMode } from "../src/lib/server/store";
import type { PublicReport, Resource } from "../src/lib/travel/types";

const A = { lat: 26.9124, lng: 75.7873 };
const line = [A, { lat: 26.9124, lng: 75.7973 }];

test("geo: distance, deviation, remaining, simplify, parse", () => {
  assert.ok(Math.abs(haversineM(A, line[1]) - 1000) < 30);
  assert.equal(checkDeviation({ lat: 26.91245, lng: 75.792, accuracy: 10 }, line, 200).off, false);
  assert.equal(checkDeviation({ lat: 26.9214, lng: 75.792, accuracy: 15 }, line, 200).off, true);
  const noisy = checkDeviation({ lat: 26.9214, lng: 75.792, accuracy: 900 }, line, 200);
  assert.equal(noisy.off, false); assert.equal(noisy.uncertain, true);
  assert.equal(checkDeviation({ lat: 26.9146, lng: 75.792, accuracy: 100 }, line, 200).off, false);
  assert.ok(Math.abs(remainingAlongM({ lat: 26.9124, lng: 75.7923 }, line) - 500) < 30);
  assert.equal(nearestOnLine(A, []).distanceM, Infinity);
  const dense = Array.from({ length: 200 }, (_, i) => ({ lat: 26.9124, lng: 75.7873 + i * 0.0001 }));
  assert.equal(simplify(dense, 5).length, 2);
  assert.deepEqual(parseLatLng("26.9124, 75.7873"), A);
  assert.equal(parseLatLng("hello"), null);
  assert.equal(parseLatLng("120, 75"), null);
  assert.equal(fmtClock(65_000), "01:05"); assert.equal(fmtDistance(1500), "1.5 km");
});

test("scoring: reports raise concern, resources lower it, reasons explained", () => {
  const now = Date.now();
  const r1 = { id: "a", coords: line, distanceM: 1000, durationS: 700 };
  const r2 = { id: "b", coords: [A, { lat: 26.9224, lng: 75.7873 }, { lat: 26.9224, lng: 75.7973 }, line[1]], distanceM: 1500, durationS: 900 };
  const reports: PublicReport[] = [1, 2, 3].map((i) => ({ id: `r${i}`, category: "harassment", description: "x".repeat(12), lat: 26.9124, lng: 75.7923, occurredAt: now - 86_400_000, createdAt: now }));
  const resources: Resource[] = [{ id: "p", kind: "police", name: "Station", lat: 26.9224, lng: 75.7923 }];
  const s1 = scoreRoute(r1, r1, reports, resources, now, 14);
  const s2 = scoreRoute(r2, r1, reports, resources, now, 14);
  assert.ok(s1.concern > s2.concern);
  assert.ok(s1.indicators.some((i) => i.label === "Several community reports nearby"));
  assert.ok(s2.indicators.some((i) => i.label === "Near emergency resource"));
  assert.ok(s2.indicators.some((i) => i.label === "Longer route"));
  const p = pickProfiles([s1, s2]);
  assert.equal(p.fastest.id, "a"); assert.equal(p.safety.id, "b");
  assert.ok(scoreRoute(r1, r1, [], [], now, 23).indicators.some((i) => i.id === "night"));
});

test("share + moderation", () => {
  assert.ok(withLink(LOCATION_TEMPLATE, "https://x/y").startsWith("My current location is https://x/y."));
  assert.ok(whatsappLink("hi", "98765 43210").startsWith("https://wa.me/919876543210?text="));
  assert.ok(smsLink("hi", "+91 98765 43210", true).startsWith("sms:919876543210&body="));
  assert.equal(checkReportText("Street light broken near the bus stop").ok, true);
  for (const bad of ["call 98765 43210 he did it", "mail a@b.com", "see http://x.com", "car RJ14 AB 1234 stalks"])
    assert.equal(checkReportText(bad).ok, false, bad);
  assert.equal(roundCoord(26.912437), 26.912);
});

test("journeys: tokens, overdue, extend, help, arrive, end", async () => {
  assert.equal(storageMode(), "memory");
  const now = Date.now();
  const j = await createJourney({ destinationLabel: "Home", dest: { lat: 26.92, lng: 75.8 }, route: line, mode: "walking", expectedArrival: now + 600_000 }, now);
  assert.equal(await guardianView("nope"), null);
  assert.equal((await guardianView(j.guardianToken, now))?.status, "active");
  assert.equal(await patchJourney(j.id, j.guardianToken, { status: "arrived" }), false);
  await patchJourney(j.id, j.ownerKey, { fix: { lat: 26.9, lng: 75.79, accuracy: 12, at: now, battery: { level: 0.5, charging: false } } }, now);
  assert.equal((await guardianView(j.guardianToken, now))?.lastFix?.battery?.level, 0.5);
  assert.equal((await guardianView(j.guardianToken, now + 700_000))?.status, "overdue");
  await patchJourney(j.id, j.ownerKey, { extendMs: 900_000 }, now + 700_000);
  assert.equal((await guardianView(j.guardianToken, now + 710_000))?.status, "active");
  await patchJourney(j.id, j.ownerKey, { status: "help" }, now + 720_000);
  assert.equal((await guardianView(j.guardianToken, now + 730_000))?.status, "help");
  await patchJourney(j.id, j.ownerKey, { status: "active" }, now + 731_000);
  assert.equal((await guardianView(j.guardianToken, now + 732_000))?.status, "active");
  await patchJourney(j.id, j.ownerKey, { status: "arrived" }, now + 740_000);
  const v = await guardianView(j.guardianToken, now + 750_000);
  assert.equal(v?.status, "arrived"); assert.equal(v?.lastFix, null); assert.equal(v?.route, null);
  assert.equal(await endJourney(j.id, j.ownerKey), true);
  assert.equal(await guardianView(j.guardianToken), null);
});

test("reports: validation, rounding, auto-hide", async () => {
  const now = Date.now();
  const base = { category: "poor_lighting", description: "Street lights are out along this lane after dark.", lat: 26.912437, lng: 75.787312, occurredAt: now - 3600_000 };
  assert.equal((await createReport({ ...base, category: "nope" }, now)).ok, false);
  assert.equal((await createReport({ ...base, description: "Man named Ravi, call 9876543210" }, now)).ok, false);
  assert.ok((await createReport(base, now)).ok);
  const bbox = { south: 26.9, north: 26.93, west: 75.78, east: 75.8 };
  const list = await listReports(bbox);
  assert.equal(list[0].lat, 26.912);
  const id = list[0].id;
  await flagReport(id, "1.1.1.1"); await flagReport(id, "1.1.1.1"); await flagReport(id, "2.2.2.2");
  assert.ok((await flagReport(id, "3.3.3.3") as { ok: true; value: { hidden: boolean } }).value.hidden);
  assert.equal((await listReports(bbox)).length, 0);
});

test("rate limit", () => {
  const t = Date.now();
  assert.ok(rateLimit("k", 2, 1000, t)); assert.ok(rateLimit("k", 2, 1000, t));
  assert.equal(rateLimit("k", 2, 1000, t), false);
});

import { setTransport } from "../src/lib/server/notify";
import { runDueAlerts } from "../src/lib/server/journeys";

test("alerts: started, help (immediate), overdue (cron, once), extend re-arms, arrived wipes contact", async () => {
  process.env.SHARE_TOKEN_SECRET = "test-secret-test-secret-1234";
  const out: string[] = [];
  setTransport({ email: async (to, s) => { out.push(`email:${to}:${s}`); }, sms: async (to) => { out.push(`sms:${to}`); } });
  try {
    const now = Date.now();
    const j = await createJourney({ destinationLabel: "Home", dest: null, route: null, mode: "walking", expectedArrival: now + 60_000,
      travellerName: "Asha", alertTo: { name: "Mum", email: "m@x.com", phone: "+919876543210" }, linkBase: "https://a.example" }, now);
    assert.ok(j.alerts.on && j.alerts.via.length === 2);
    assert.equal(out.length, 2); // started: email + sms
    await runDueAlerts(now + 30_000); assert.equal(out.length, 2); // not due yet
    await runDueAlerts(now + 120_000); assert.equal(out.length, 4); // overdue sent
    await runDueAlerts(now + 400_000); assert.equal(out.length, 4); // and only once
    await patchJourney(j.id, j.ownerKey, { extendMs: 600_000 }, now + 130_000);
    await patchJourney(j.id, j.ownerKey, { status: "help" }, now + 140_000);
    assert.equal(out.length, 6); // help sent immediately
    await patchJourney(j.id, j.ownerKey, { status: "arrived" }, now + 150_000);
    assert.equal(out.length, 8); // arrived notice
    assert.equal(out.filter((x) => x.startsWith("email")).length, 4);
    const v = await guardianView(j.guardianToken, now + 160_000);
    assert.equal(v?.status, "arrived");
  } finally { setTransport(null); }
});
