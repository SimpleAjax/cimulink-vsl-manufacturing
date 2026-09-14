const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function clean(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}

async function frappeRequest(path, options = {}) {
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
  if (!response.ok) {
    throw new Error(payload.exception || payload.message || `Frappe request failed (${response.status})`);
  }
  return payload.message ?? payload;
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  if (!process.env.FRAPPE_BASE_URL || !process.env.FRAPPE_API_KEY || !process.env.FRAPPE_API_SECRET) {
    return json(res, 500, { error: "Lead service is not configured" });
  }

  const body = req.body || {};
  // Honeypot: bots should never reach Frappe.
  if (clean(body.website_url, 200)) return json(res, 400, { error: "Unable to process this request" });

  const email = clean(body.email, 254).toLowerCase();
  const phone = clean(body.phone, 40);
  if (!email || !EMAIL_PATTERN.test(email)) return json(res, 422, { field: "email", error: "Enter a valid email address." });
  if (!phone) return json(res, 422, { field: "phone", error: "Enter your phone number." });

  const fullName = clean(body.full_name, 120);
  const nameParts = fullName ? fullName.split(/\s+/) : ["Website Prospect"];
  const firstName = nameParts.shift() || "Website Prospect";
  const lastName = nameParts.join(" ");
  const lead = {
    doctype: "CRM Lead",
    first_name: firstName,
    last_name: lastName,
    email,
    mobile_no: phone,
    organization: clean(body.company, 140),
    job_title: clean(body.designation, 120),
    source: "Website – Manufacturing VSL",
    custom_website_funnel: "manufacturing_vsl",
    custom_first_cta_location: clean(body.cta_location, 100),
    custom_landing_page_url: clean(body.landing_page_url, 500),
    custom_utm_source: clean(body.utm_source, 100),
    custom_utm_medium: clean(body.utm_medium, 100),
    custom_utm_campaign: clean(body.utm_campaign, 150),
    custom_utm_content: clean(body.utm_content, 150),
    custom_booking_status: "Not booked",
  };

  try {
    const filters = encodeURIComponent(JSON.stringify([["email", "=", email]]));
    const existingResponse = await frappeRequest(`/api/resource/CRM%20Lead?filters=${filters}&fields=${encodeURIComponent(JSON.stringify(["name"]))}&limit_page_length=2`);
    const existing = existingResponse.data || existingResponse;
    const match = Array.isArray(existing) ? existing[0] : null;
    const response = match
      ? await frappeRequest(`/api/resource/CRM%20Lead/${encodeURIComponent(match.name)}`, {
          method: "PUT",
          body: JSON.stringify(lead),
        })
      : await frappeRequest("/api/resource/CRM%20Lead", {
          method: "POST",
          body: JSON.stringify(lead),
        });
    const saved = response.data || response;
    return json(res, 200, { ok: true, lead_name: saved.name || match?.name });
  } catch (error) {
    console.error("Frappe lead request failed", error.message);
    return json(res, 502, {
      error: "Our CRM could not save your details right now. Please wait a minute and try again.",
    });
  }
}
