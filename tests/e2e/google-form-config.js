const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "..", "_config.yml");
const FIELDS = ["name", "email", "subject", "message"];

function readGoogleFormBlock(config) {
  const start = config.search(/^google_form:/m);
  if (start === -1) throw new Error("_config.yml has no google_form block");
  const rest = config.slice(start + "google_form:".length);
  const nextTopLevelKey = rest.search(/^\S/m);
  return nextTopLevelKey === -1 ? rest : rest.slice(0, nextTopLevelKey);
}

function readValue(block, key) {
  const match = block.match(new RegExp(`^\\s+${key}:\\s*["']?([^"'\\s]+)["']?\\s*$`, "m"));
  if (!match) throw new Error(`google_form.${key} is missing from _config.yml`);
  return match[1];
}

function readGoogleFormConfig() {
  const block = readGoogleFormBlock(fs.readFileSync(CONFIG_PATH, "utf8"));
  const entries = Object.fromEntries(FIELDS.map((field) => [field, readValue(block, field)]));
  return { action: readValue(block, "action"), entries };
}

module.exports = { readGoogleFormConfig };
