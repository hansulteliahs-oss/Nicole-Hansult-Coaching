/**
 * The branded shell every newsletter goes out in.
 *
 * Drafts carry bare body HTML (p, h2, ul, a, strong). Until 2026-09-28 that
 * went to Mailchimp as-is and rendered in each inbox's default font at full
 * width (campaign e6c511dfc8). This wraps it once, at the only door to
 * Mailchimp content (setCampaignContent), so the agent keeps writing plain
 * HTML and every send path gets the same look.
 *
 * Styles are inline because Gmail and Outlook drop or mangle <style> blocks.
 * Colours follow app/globals.css; Georgia stands in for Instrument Serif.
 */
const SITE = 'https://www.nicolehansultcoaching.com';
const MARKER = '<!-- nh-email-layout -->';

const C = {
  bg: '#EBE6DE',
  card: '#FBF8F2',
  ink: '#26232C',
  inkSoft: '#5F5C66',
  gray: '#8E8A94',
  rule: '#E0DBD2',
  orchid: '#B86BAE',
  orchidDeep: '#9B5292',
};
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

const TAG_STYLES: Record<string, string> = {
  p: `margin:0 0 18px;font-family:${SANS};font-size:17px;line-height:1.65;color:${C.ink};`,
  h2: `margin:30px 0 12px;font-family:${SERIF};font-size:25px;line-height:1.25;font-weight:normal;color:${C.ink};`,
  h3: `margin:24px 0 10px;font-family:${SERIF};font-size:20px;line-height:1.3;font-weight:normal;color:${C.ink};`,
  ul: `margin:0 0 18px;padding-left:22px;`,
  ol: `margin:0 0 18px;padding-left:22px;`,
  li: `margin:0 0 10px;font-family:${SANS};font-size:17px;line-height:1.6;color:${C.ink};`,
  a: `color:${C.orchidDeep};text-decoration:underline;font-weight:600;`,
  strong: `color:${C.ink};font-weight:700;`,
  blockquote: `margin:0 0 18px;padding:4px 0 4px 16px;border-left:3px solid ${C.orchid};font-style:italic;`,
};

const DISCLAIMER_STYLE = `margin:28px 0 0;padding-top:16px;border-top:1px solid ${C.rule};font-family:${SANS};font-size:13px;line-height:1.5;color:${C.gray};`;

/** Add an inline style to every opening <tag> that does not already carry one. */
function styleTags(html: string): string {
  let out = html;
  for (const [tag, style] of Object.entries(TAG_STYLES)) {
    out = out.replace(new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi'), (m, attrs = '') =>
      /\sstyle=/i.test(attrs) ? m : `<${tag}${attrs} style="${style}">`,
    );
  }
  // The medical disclaimer closes most drafts; set it as fine print.
  return out.replace(
    /<p style="[^"]*">(\s*(?:<em[^>]*>)?\s*This is general education)/gi,
    `<p style="${DISCLAIMER_STYLE}">$1`,
  );
}

export function wrapEmail(bodyHtml: string): string {
  if (bodyHtml.includes(MARKER)) return bodyHtml;

  return `${MARKER}
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Nicole Hansult Coaching</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
    <tr><td align="center" style="padding:0 0 20px;">
      <a href="${SITE}" style="text-decoration:none;"><img src="${SITE}/images/email/logo.png" width="120" alt="Nicole Hansult" style="display:block;width:120px;height:auto;border:0;"></a>
    </td></tr>
    <tr><td style="background:${C.card};border-top:4px solid ${C.orchid};border-radius:6px;padding:36px 36px 32px;">
${styleTags(bodyHtml)}
    </td></tr>
    <tr><td style="padding:24px 36px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle" style="padding-right:14px;"><img src="${SITE}/images/email/nicole-signature.jpg" width="64" height="64" alt="Nicole Hansult" style="display:block;width:64px;height:64px;border-radius:32px;border:0;"></td>
        <td valign="middle" style="font-family:${SANS};font-size:14px;line-height:1.45;color:${C.inkSoft};">
          <span style="font-family:${SERIF};font-size:18px;color:${C.ink};">Nicole Hansult</span><br>
          Functional longevity coach &middot; Carlsbad, CA<br>
          <a href="${SITE}" style="color:${C.orchidDeep};text-decoration:none;">nicolehansultcoaching.com</a>
        </td>
      </tr></table>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}
