const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJ9ao3k6Q_7-UiEO2NIfWrsQ96vP1yuOttIDXJEnA5YAHaafTmKAAmnteQqmTOICg/exec";

function layout(title: string, body: string) {
  return `<div style="font-family:Arial,sans-serif;background:#f6f7f9;padding:32px 16px;"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;"><div style="background:#111827;padding:24px 32px;"><div style="color:#fff;font-size:24px;font-weight:800;">CHILVO<span style="color:#6366f1;">.</span></div></div><div style="padding:32px;"><h2 style="margin:0 0 12px;">${title}</h2>${body}</div><div style="padding:20px 32px;background:#f9fafb;color:#6b7280;font-size:12px;">© 2026 CHILVO • chilvodigital@gmail.com</div></div></div>`;
}

async function sendEmail(to_email: string, subject: string, message: string, htmlBody: string) {
  await fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to_email, subject, message, htmlBody }) });
}

export function emailAdminNewProduct(adminEmail: string, productName: string, price: string, merchantEmail: string) {
  return sendEmail(adminEmail, `New Product Awaiting Review — ${productName}`, `New product ${productName}`, layout("New Product Awaiting Review", `<p>A merchant submitted <b>${productName}</b> for review.</p><p>Price: ${price}</p><p>Merchant: ${merchantEmail}</p>`));
}

export function emailMerchantApproved(merchantEmail: string, productName: string) {
  return sendEmail(merchantEmail, `Your product is now live ✅ — ${productName}`, `Approved ${productName}`, layout("Your product is now live 🎉", `<p>Great news! Your product <b>${productName}</b> was approved and is now live in Shop.</p>`));
}

export function emailMerchantRejected(merchantEmail: string, productName: string, reason: string) {
  return sendEmail(merchantEmail, `Action Required — ${productName}`, `Rejected ${productName}`, layout("Your product needs changes", `<p>Your product <b>${productName}</b> was not approved.</p><div style="background:#fef2f2;padding:16px;border-radius:12px;"><b>Reason:</b> ${reason}</div><p>Fix it and resubmit.</p>`));
}
