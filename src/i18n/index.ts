import { useGameStore } from "@/store/useGameStore";
import { translations, type Language, type TranslationKey } from "./translations";

export type { Language, TranslationKey };

const SUPPORTED_LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: "zh", label: "简体中文", native: "简体中文" },
  { code: "en", label: "English", native: "English" },
  { code: "ja", label: "日本語", native: "日本語" },
  { code: "ko", label: "한국어", native: "한국어" },
];

export { SUPPORTED_LANGUAGES };

/** 翻译函数：支持插值 {name} */
export function translate(lang: Language, key: TranslationKey, vars?: Record<string, string | number>): string {
  let text = translations[lang][key] ?? translations.zh[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return text;
}

/** hook：返回当前语言与 t() 函数，语言切换时组件自动重渲染 */
export function useTranslation() {
  const language = useGameStore((s) => s.settings.language);
  const t = (key: TranslationKey, vars?: Record<string, string | number>) =>
    translate(language, key, vars);
  return { t, language };
}
