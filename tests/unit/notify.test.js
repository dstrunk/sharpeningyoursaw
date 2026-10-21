const { describe, test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const { buildNotification, spamReason, onFormSubmit } = require(path.join(__dirname, "..", "..", "apps-script", "notify.gs"));

const answers = [
  { title: "Name", response: "Ada Lovelace" },
  { title: "Email", response: "ada@example.com" },
  { title: "Subject", response: "Coaching for my team" },
  { title: "Message", response: "We'd like to talk.\nThanks!" },
];

test("subject names the visitor's subject", () => {
  assert.equal(buildNotification(answers).subject, "Website contact: Coaching for my team");
});

test("subject falls back when the visitor left it blank", () => {
  const withoutSubject = answers.map((answer) => (answer.title === "Subject" ? { ...answer, response: "" } : answer));
  assert.equal(buildNotification(withoutSubject).subject, "Website contact: (no subject)");
});

test("replies go to the visitor", () => {
  assert.equal(buildNotification(answers).replyTo, "ada@example.com");
});

test("reply-to is left unset when there is no email answer", () => {
  const withoutEmail = answers.filter((answer) => answer.title !== "Email");
  assert.equal(buildNotification(withoutEmail).replyTo, undefined);
});

test("body lists every answer in form order and marks blanks", () => {
  const withBlankSubject = answers.map((answer) => (answer.title === "Subject" ? { ...answer, response: "" } : answer));
  assert.equal(
    buildNotification(withBlankSubject).body,
    "Name:\nAda Lovelace\n\nEmail:\nada@example.com\n\nSubject:\n(blank)\n\nMessage:\nWe'd like to talk.\nThanks!"
  );
});

function replaceAnswer(title, response) {
  return answers.map((answer) => (answer.title === title ? { ...answer, response } : answer));
}

test("body leaves out the honeypot question", () => {
  const withHoneypot = [...answers, { title: "Leave this blank", response: "" }];
  assert.doesNotMatch(buildNotification(withHoneypot).body, /Leave this blank/);
});

describe("spamReason", () => {
  test("lets a normal message through", () => {
    assert.equal(spamReason(answers), null);
  });

  test("lets a message with one link through", () => {
    assert.equal(spamReason(replaceAnswer("Message", "Our site is https://example.com, talk soon.")), null);
  });

  test("flags a filled honeypot", () => {
    assert.equal(spamReason([...answers, { title: "Leave this blank", response: "https://spam.example" }]), "honeypot question was filled");
  });

  test("ignores an empty honeypot", () => {
    assert.equal(spamReason([...answers, { title: "Leave this blank", response: "" }]), null);
  });

  test("flags a missing name", () => {
    assert.equal(spamReason(answers.filter((answer) => answer.title !== "Name")), "name is missing");
  });

  test("flags a missing message", () => {
    assert.equal(spamReason(replaceAnswer("Message", "")), "message is missing");
  });

  test("flags a message with two or more links", () => {
    assert.equal(spamReason(replaceAnswer("Message", "Buy at http://a.example and www.b.example")), "message has 2 links");
  });
});

describe("onFormSubmit", () => {
  let sentEmails;
  beforeEach(() => {
    sentEmails = [];
    global.MailApp = { sendEmail: (...args) => sentEmails.push(args) };
    global.PropertiesService = {
      getScriptProperties: () => ({ getProperty: (key) => (key === "NOTIFY_EMAIL" ? "owner@example.com" : null) }),
    };
  });

  function formSubmitEvent(formAnswers) {
    const itemResponses = formAnswers.map(({ title, response }) => ({
      getItem: () => ({ getTitle: () => title }),
      getResponse: () => response,
    }));
    return { response: { getItemResponses: () => itemResponses } };
  }

  test("onFormSubmit emails the owner with the visitor as reply-to", () => {
    onFormSubmit(formSubmitEvent(answers));
    assert.equal(sentEmails.length, 1);
    const [recipient, subject, body, options] = sentEmails[0];
    assert.equal(recipient, "owner@example.com");
    assert.equal(subject, "Website contact: Coaching for my team");
    assert.match(body, /^Name:\nAda Lovelace/);
    assert.deepEqual(options, { replyTo: "ada@example.com" });
  });

  test("onFormSubmit sends nothing for spam", () => {
    onFormSubmit(formSubmitEvent([...answers, { title: "Leave this blank", response: "spam" }]));
    assert.equal(sentEmails.length, 0);
  });

  test("onFormSubmit fails loudly when NOTIFY_EMAIL is not set", () => {
    global.PropertiesService = { getScriptProperties: () => ({ getProperty: () => null }) };
    assert.throws(() => onFormSubmit(formSubmitEvent(answers)), /NOTIFY_EMAIL/);
    assert.equal(sentEmails.length, 0);
  });
});
