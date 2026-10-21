const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "..", "_config.yml");

function readGoogleFormConfig() {
  const config = fs.readFileSync(CONFIG_PATH, "utf8");
  const googleFormBlock = config.slice(config.indexOf("google_form:"));
  const action = googleFormBlock.match(/^\s+action:\s*(\S+)/m)[1];
  const entries = {};
  for (const [, field, entryName] of googleFormBlock.matchAll(/^\s+(name|email|subject|message|subscribe):\s*(entry\.\d+)/gm)) {
    entries[field] = entryName;
  }
  return { action, entries };
}

module.exports = { readGoogleFormConfig };
