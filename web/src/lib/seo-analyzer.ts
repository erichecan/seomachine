export type SeoAnalysisResult = {
  score: number; // 0-100
  wordCount: number;
  keywordDensity: number;
  readabilityScore: number; // Flesch Reading Ease
  readabilityGrade: string;
  headingsStructure: {
    h1Count: number;
    h2Count: number;
    h3Count: number;
    hasProperStructure: boolean;
  };
  keywordAnalysis: {
    inTitle: boolean;
    inFirstParagraph: boolean;
    inHeadings: boolean;
    density: number;
    count: number;
  };
  metaAnalysis: {
    titleLength: number;
    titleOk: boolean;
    descriptionLength: number;
    descriptionOk: boolean;
  };
  suggestions: string[];
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function fleschReadingEase(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter(Boolean);
  if (sentences.length === 0 || words.length === 0) return 50;

  const syllableCount = words.reduce(
    (sum, word) => sum + countSyllables(word),
    0
  );
  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = syllableCount / words.length;

  const score =
    206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function readabilityGradeFromScore(score: number): string {
  if (score >= 90) return "5th grade";
  if (score >= 80) return "6th grade";
  if (score >= 70) return "7th grade";
  if (score >= 60) return "8th-9th grade";
  if (score >= 50) return "10th-12th grade";
  if (score >= 30) return "College";
  return "College graduate";
}

function extractPlainText(markdown: string): string {
  return markdown
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`[^`]+`/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .trim();
}

function extractHeadings(
  markdown: string,
  level: number
): string[] {
  const pattern = new RegExp(`^#{${level}}\\s+(.+)$`, "gm");
  const matches = [...markdown.matchAll(pattern)];
  return matches.map((m) => m[1].toLowerCase());
}

export function analyzeSeo(
  content: string,
  keyword: string,
  metaTitle?: string,
  metaDescription?: string
): SeoAnalysisResult {
  const kw = keyword.toLowerCase().trim();
  const plainText = extractPlainText(content);
  const words = plainText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Keyword occurrence
  const kwRegex = new RegExp(kw.replace(/\s+/g, "\\s+"), "gi");
  const kwMatches = plainText.match(kwRegex) ?? [];
  const kwCount = kwMatches.length;
  const kwDensity = wordCount > 0 ? (kwCount / wordCount) * 100 : 0;

  // Headings
  const h1s = extractHeadings(content, 1);
  const h2s = extractHeadings(content, 2);
  const h3s = extractHeadings(content, 3);
  const allHeadings = [...h1s, ...h2s, ...h3s].join(" ");

  // First paragraph
  const paragraphs = plainText.split(/\n\n+/).filter(Boolean);
  const firstParagraph = (paragraphs[0] ?? "").toLowerCase();

  const inTitle = metaTitle ? metaTitle.toLowerCase().includes(kw) : h1s.some((h) => h.includes(kw));
  const inFirstParagraph = firstParagraph.includes(kw);
  const inHeadings = allHeadings.includes(kw);

  // Readability
  const readabilityScore = fleschReadingEase(plainText);
  const readabilityGrade = readabilityGradeFromScore(readabilityScore);

  // Meta
  const titleLength = metaTitle?.length ?? 0;
  const descLength = metaDescription?.length ?? 0;
  const titleOk = titleLength >= 50 && titleLength <= 60;
  const descriptionOk = descLength >= 150 && descLength <= 160;

  // Scoring (0-100)
  let score = 0;
  const suggestions: string[] = [];

  // Word count (20 pts)
  if (wordCount >= 1500) score += 20;
  else if (wordCount >= 800) score += 12;
  else if (wordCount >= 400) score += 6;
  else suggestions.push(`内容过短（当前 ${wordCount} 字），建议至少 800 字`);

  // Keyword in title (15 pts)
  if (inTitle) score += 15;
  else suggestions.push("标题中未包含目标关键词");

  // Keyword in first paragraph (15 pts)
  if (inFirstParagraph) score += 15;
  else suggestions.push("开头段落未包含目标关键词");

  // Keyword in headings (10 pts)
  if (inHeadings) score += 10;
  else suggestions.push("二级标题中未包含目标关键词");

  // Keyword density (15 pts)
  if (kwDensity >= 0.5 && kwDensity <= 2.5) score += 15;
  else if (kwDensity > 2.5) suggestions.push(`关键词密度过高（${kwDensity.toFixed(1)}%），建议 0.5%–2.5%`);
  else suggestions.push(`关键词密度过低（${kwDensity.toFixed(1)}%），建议 0.5%–2.5%`);

  // Headings structure (10 pts)
  const hasProperStructure = h1s.length === 1 && h2s.length >= 2;
  if (hasProperStructure) score += 10;
  else {
    if (h1s.length !== 1) suggestions.push("文章应包含且仅包含一个 H1 标题");
    if (h2s.length < 2) suggestions.push("建议至少 2 个 H2 章节标题");
  }

  // Meta title (10 pts)
  if (titleOk) score += 10;
  else if (metaTitle) {
    suggestions.push(`Meta 标题长度 ${titleLength} 字符，建议 50–60 字符`);
  } else {
    suggestions.push("缺少 Meta 标题");
  }

  // Meta description (5 pts)
  if (descriptionOk) score += 5;
  else if (metaDescription) {
    suggestions.push(`Meta 描述长度 ${descLength} 字符，建议 150–160 字符`);
  } else {
    suggestions.push("缺少 Meta 描述");
  }

  return {
    score,
    wordCount,
    keywordDensity: Math.round(kwDensity * 100) / 100,
    readabilityScore,
    readabilityGrade,
    headingsStructure: {
      h1Count: h1s.length,
      h2Count: h2s.length,
      h3Count: h3s.length,
      hasProperStructure,
    },
    keywordAnalysis: {
      inTitle,
      inFirstParagraph,
      inHeadings,
      density: Math.round(kwDensity * 100) / 100,
      count: kwCount,
    },
    metaAnalysis: {
      titleLength,
      titleOk,
      descriptionLength: descLength,
      descriptionOk,
    },
    suggestions,
  };
}
