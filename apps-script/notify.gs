// Emails each Google Form response to the address in the NOTIFY_EMAIL Script Property,
// skipping likely spam. Every response still lands in the Sheet. Setup is in AGENTS.md.

const HONEYPOT_TITLE = "Leave this blank";
const LINK_LIMIT = 2;

function formatResponse(response) {
  return String(response || "");
}

function findAnswer(answers, title) {
  const answer = answers.find((candidate) => candidate.title.toLowerCase() === title.toLowerCase());
  return answer ? formatResponse(answer.response) : "";
}

function countLinks(text) {
  return (text.match(/https?:\/\/|www\./gi) || []).length;
}

function spamReason(answers) {
  if (findAnswer(answers, HONEYPOT_TITLE)) return "honeypot question was filled";
  if (!findAnswer(answers, "Name").trim()) return "name is missing";

  const message = findAnswer(answers, "Message");
  if (!message.trim()) return "message is missing";

  const linkCount = countLinks(message);
  if (linkCount >= LINK_LIMIT) return `message has ${linkCount} links`;

  return null;
}

function buildNotification(answers) {
  const subject = findAnswer(answers, "Subject") || "(no subject)";
  const replyTo = findAnswer(answers, "Email") || undefined;
  const body = answers
    .filter(({ title }) => title.toLowerCase() !== HONEYPOT_TITLE.toLowerCase())
    .map(({ title, response }) => `${title}:\n${formatResponse(response) || "(blank)"}`)
    .join("\n\n");
  return { subject: `Website contact: ${subject}`, body, replyTo };
}

function onFormSubmit(event) {
  const answers = event.response.getItemResponses().map((itemResponse) => ({
    title: itemResponse.getItem().getTitle(),
    response: itemResponse.getResponse(),
  }));

  const reason = spamReason(answers);
  if (reason) {
    console.log(`Not emailing likely spam: ${reason}`);
    return;
  }

  const recipient = PropertiesService.getScriptProperties().getProperty("NOTIFY_EMAIL");
  if (!recipient) throw new Error("Set the NOTIFY_EMAIL Script Property to the address that should receive form responses.");

  const { subject, body, replyTo } = buildNotification(answers);
  MailApp.sendEmail(recipient, subject, body, replyTo ? { replyTo } : {});
}

// Lets Node's test runner load this file; Apps Script has no `module` and skips it.
if (typeof module !== "undefined") module.exports = { buildNotification, spamReason, onFormSubmit };
