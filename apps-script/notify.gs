// Emails each Google Form response to the address in the NOTIFY_EMAIL Script Property.
// Setup steps are in README.md under "Email notifications".

// getResponse() returns a String for text questions and a String[] for checkbox questions.
function formatResponse(response) {
  return Array.isArray(response) ? response.join(", ") : String(response || "");
}

function findAnswer(answers, title) {
  const answer = answers.find((candidate) => candidate.title.toLowerCase() === title.toLowerCase());
  return answer ? formatResponse(answer.response) : "";
}

function buildNotification(answers) {
  const subject = findAnswer(answers, "Subject") || "(no subject)";
  const replyTo = findAnswer(answers, "Email") || undefined;
  const body = answers
    .map(({ title, response }) => `${title}:\n${formatResponse(response) || "(blank)"}`)
    .join("\n\n");
  return { subject: `Website contact: ${subject}`, body, replyTo };
}

function onFormSubmit(event) {
  const answers = event.response.getItemResponses().map((itemResponse) => ({
    title: itemResponse.getItem().getTitle(),
    response: itemResponse.getResponse(),
  }));

  const recipient = PropertiesService.getScriptProperties().getProperty("NOTIFY_EMAIL");
  if (!recipient) throw new Error("Set the NOTIFY_EMAIL Script Property to the address that should receive form responses.");

  const { subject, body, replyTo } = buildNotification(answers);
  MailApp.sendEmail(recipient, subject, body, replyTo ? { replyTo } : {});
}

// Lets Node's test runner load this file; Apps Script has no `module` and skips it.
if (typeof module !== "undefined") module.exports = { buildNotification, onFormSubmit };
