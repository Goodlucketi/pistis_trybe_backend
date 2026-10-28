const DEFAULT_API_URL = "https://api.zeptomail.com/v1.1/email";

interface IMailPayload {
  to: string;
  toName?: string | undefined;
  subject: string;
  html: string;
  text?: string;
}

const isProduction = () => process.env.NODE_ENV === "production";

export const sendMail = async ({ to, toName, subject, html, text }: IMailPayload): Promise<void> => {
  const token = process.env.ZEPTOMAIL_TOKEN;
  const fromAddress = process.env.ZEPTOMAIL_FROM_ADDRESS;

  if (!token || !fromAddress) {
    if (isProduction()) {
      throw new Error("ZeptoMail is not configured (ZEPTOMAIL_TOKEN / ZEPTOMAIL_FROM_ADDRESS)");
    }
    console.log(
      `\n[mailer:dev] ZeptoMail not configured, printing email instead\n` +
        `  To:      ${to}\n  Subject: ${subject}\n  Body:    ${text ?? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}\n`,
    );
    return;
  }

  const response = await fetch(process.env.ZEPTOMAIL_API_URL || DEFAULT_API_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: token.startsWith("Zoho-enczapikey") ? token : `Zoho-enczapikey ${token}`,
    },
    body: JSON.stringify({
      from: { address: fromAddress, name: process.env.ZEPTOMAIL_FROM_NAME || "Pistis Trybe" },
      to: [{ email_address: { address: to, name: toName || to } }],
      subject,
      htmlbody: html,
      ...(text && { textbody: text }),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ZeptoMail request failed (${response.status}): ${detail}`);
  }
};
