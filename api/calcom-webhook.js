const crypto = require("crypto");

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}

function readBody(req) {
  if (typeof req.body === "string") return Promise.resolve(req.body);
  if (req.body && typeof req.body === "object") return Promise.resolve(JSON.stringify(req.body));
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function verifySignature(raw, signature, secret) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const supplied = String(signature).replace(/^sha256=/, "");
  return supplied.length === expected.length && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

async function frappe(path, options = {}) {
  const response = await fetch(`${process.env.FRAPPE_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}`,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.exception || payload.message || `Frappe request failed (${response.status})`);
  return payload.message ?? payload;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!process.env.CALCOM_WEBHOOK_SECRET || !process.env.FRAPPE_BASE_URL || !process.env.FRAPPE_API_KEY || !process.env.FRAPPE_API_SECRET) {
    return json(res, 500, { error: "Webhook service is not configured" });
  }

  const raw = await readBody(req);
  if (!verifySignature(raw, req.headers["x-cal-signature-256"], process.env.CALCOM_WEBHOOK_SECRET)) {
    return json(res, 401, { error: "Invalid signature" });
  }

  let event;
  try { event = JSON.parse(raw); } catch { return json(res, 400, { error: "Invalid JSON" }); }
  const payload = event.payload || event;
  const trigger = String(event.triggerEvent || event.trigger || "").toUpperCase();
  const attendee = (payload.attendees || []).find((item) => item.email) || {};
  const email = String(attendee.email || payload.booker?.email || "").trim().toLowerCase();
  if (!email) return json(res, 422, { error: "No attendee email in webhook" });

  const uid = payload.uid || payload.bookingUid || payload.rescheduleUid || "";
  const status = trigger.includes("CANCEL") ? "Cancelled" : trigger.includes("RESCHEDUL") ? "Rescheduled" : "Booked";
  const lead = {
    doctype: "CRM Lead",
    first_name: String(attendee.name || payload.booker?.name || "Cal.com Prospect").split(/\s+/)[0],
    email,
    source: "Cal.com – Manufacturing VSL",
    custom_booking_status: status,
    custom_cal_booking_uid: uid,
    custom_cal_event_type: payload.type || payload.title || "manufacturing-strategy",
    custom_call_start_at: payload.startTime || "",
    custom_call_end_at: payload.endTime || "",
    custom_call_meeting_url: payload.videoCallUrl || payload.location || "",
  };

  try {
    const filters = encodeURIComponent(JSON.stringify([["email", "=", email]]));
    const found = await frappe(`/api/resource/CRM%20Lead?filters=${filters}&fields=${encodeURIComponent(JSON.stringify(["name"]))}&limit_page_length=2`);
    const rows = found.data || found;
    const match = Array.isArray(rows) ? rows[0] : null;
    if (match) await frappe(`/api/resource/CRM%20Lead/${encodeURIComponent(match.name)}`, { method: "PUT", body: JSON.stringify(lead) });
    else await frappe("/api/resource/CRM%20Lead", { method: "POST", body: JSON.stringify(lead) });
    return json(res, 200, { ok: true });
  } catch (error) {
    console.error("Cal.com webhook CRM update failed", error.message);
    return json(res, 502, { error: "CRM update failed" });
  }
};

module.exports.config = { api: { bodyParser: false } };
