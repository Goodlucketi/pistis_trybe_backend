const layout = (title: string, body: string) => `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f1f8;font-family:Inter,Segoe UI,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e6e0f0;">
            <tr>
              <td style="background:#2a0f48;padding:22px 28px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.01em;">Pistis Trybe</td>
            </tr>
            <tr>
              <td style="padding:28px;color:#14101c;">
                <h1 style="margin:0 0 12px;font-size:22px;">${title}</h1>
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:#faf8fd;color:#6e6785;font-size:12px;">
                If you did not request this, you can safely ignore this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export const otpEmail = (code: string, minutes: number) => ({
  subject: `${code} is your Pistis Trybe verification code`,
  html: layout(
    "Verify your email",
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a4458;">Use the code below to finish creating your account. It expires in ${minutes} minutes.</p>
     <div style="font-size:34px;font-weight:700;letter-spacing:10px;text-align:center;padding:18px;border-radius:14px;background:#f3f1f8;color:#401667;">${code}</div>`,
  ),
  text: `Your Pistis Trybe verification code is ${code}. It expires in ${minutes} minutes.`,
});

export const resetPasswordEmail = (link: string) => ({
  subject: "Reset your Pistis Trybe password",
  html: layout(
    "Reset your password",
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a4458;">We received a request to reset your password. This link expires in 1 hour.</p>
     <a href="${link}" style="display:inline-block;padding:13px 24px;border-radius:12px;background:#401667;color:#ffffff;text-decoration:none;font-weight:600;">Reset password</a>
     <p style="margin:20px 0 0;font-size:12px;color:#6e6785;word-break:break-all;">Or paste this link into your browser:<br>${link}</p>`,
  ),
  text: `Reset your Pistis Trybe password (valid for 1 hour): ${link}`,
});
