// ============================================================
// QUIZORA V2 CODE QUESTION - CENTRALIZED LANGUAGE MAPPING
// ============================================================

export interface LanguageDefinition {
  id: string;
  name: string;
  monacoLang: string;
  aliases: string[];
}

export const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
  {
    id: 'javascript',
    name: 'JavaScript',
    monacoLang: 'javascript',
    aliases: ['js', 'node', 'ecmascript'],
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    monacoLang: 'typescript',
    aliases: ['ts'],
  },
  {
    id: 'python',
    name: 'Python',
    monacoLang: 'python',
    aliases: ['py', 'python3'],
  },
  {
    id: 'java',
    name: 'Java',
    monacoLang: 'java',
    aliases: [],
  },
  {
    id: 'c',
    name: 'C',
    monacoLang: 'c',
    aliases: [],
  },
  {
    id: 'cpp',
    name: 'C++',
    monacoLang: 'cpp',
    aliases: ['c++', 'cplusplus'],
  },
  {
    id: 'csharp',
    name: 'C#',
    monacoLang: 'csharp',
    aliases: ['c#', 'cs', 'dotnet'],
  },
  {
    id: 'php',
    name: 'PHP',
    monacoLang: 'php',
    aliases: [],
  },
  {
    id: 'sql',
    name: 'SQL',
    monacoLang: 'sql',
    aliases: ['mysql', 'postgres', 'postgresql', 'sqlite', 'tsql'],
  },
  {
    id: 'html',
    name: 'HTML',
    monacoLang: 'html',
    aliases: ['htm', 'xhtml'],
  },
  {
    id: 'css',
    name: 'CSS',
    monacoLang: 'css',
    aliases: ['scss', 'sass', 'less'],
  },
  {
    id: 'xml',
    name: 'XML',
    monacoLang: 'xml',
    aliases: ['svg', 'xsl', 'xslt'],
  },
  {
    id: 'json',
    name: 'JSON',
    monacoLang: 'json',
    aliases: ['jsonc'],
  },
  {
    id: 'bash',
    name: 'Bash',
    monacoLang: 'shell',
    aliases: ['sh', 'shell', 'zsh', 'terminal'],
  },
  {
    id: 'go',
    name: 'Go',
    monacoLang: 'go',
    aliases: ['golang'],
  },
  {
    id: 'rust',
    name: 'Rust',
    monacoLang: 'rust',
    aliases: ['rs'],
  },
  {
    id: 'plaintext',
    name: 'Plain Text',
    monacoLang: 'plaintext',
    aliases: ['text', 'txt', 'none'],
  },
];

const ALIAS_LOOKUP = new Map<string, LanguageDefinition>();

SUPPORTED_LANGUAGES.forEach((def) => {
  ALIAS_LOOKUP.set(def.id.toLowerCase(), def);
  ALIAS_LOOKUP.set(def.name.toLowerCase(), def);
  def.aliases.forEach((alias) => {
    ALIAS_LOOKUP.set(alias.toLowerCase(), def);
  });
});

/**
 * Normalizes any input language string (including aliases like 'c++', 'js', 'py')
 * to standard lowercase language identifier.
 */
export function normalizeLanguage(rawLang?: string | null): string {
  if (!rawLang) return 'plaintext';
  const clean = rawLang.trim().toLowerCase();
  const match = ALIAS_LOOKUP.get(clean);
  return match ? match.id : clean;
}

/**
 * Returns the Monaco Editor language identifier for a given language.
 */
export function getMonacoLanguage(rawLang?: string | null): string {
  if (!rawLang) return 'plaintext';
  const clean = rawLang.trim().toLowerCase();
  const match = ALIAS_LOOKUP.get(clean);
  return match ? match.monacoLang : clean;
}

/**
 * Returns the human-readable display name for a language (e.g. 'C++', 'JavaScript').
 */
export function getLanguageDisplayName(rawLang?: string | null): string {
  if (!rawLang) return 'Plain Text';
  const clean = rawLang.trim().toLowerCase();
  const match = ALIAS_LOOKUP.get(clean);
  return match ? match.name : rawLang.trim();
}

/**
 * Checks if a language is recognized in the supported registry.
 */
export function isSupportedLanguage(rawLang?: string | null): boolean {
  if (!rawLang) return false;
  return ALIAS_LOOKUP.has(rawLang.trim().toLowerCase());
}
