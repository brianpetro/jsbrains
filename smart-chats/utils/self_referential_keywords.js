import ScTranslations from "./ScTranslations.json" assert { type: "json" };

// check if includes keywords referring to one's own notes
export function contains_self_referential_keywords(user_input, language) {
  const language_settings = ScTranslations[language];
  if (!language_settings) return false;
  let check_str = `${user_input}`;
  if (check_str.match(new RegExp(`\\b(${language_settings.pronouns.join("|")})\\b`, "gi"))) return true;
  return false;
}
