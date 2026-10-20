/** 본문에서 `@닉네임`을 찾는다. 닉네임은 2~12자, 공백·@ 제외. */
export function extractMentionNicknames(text: string): string[] {
  const found = new Set<string>();
  const pattern = /(^|[\s([{'"])@([^\s@[\](){}"']{2,12})(?=$|[\s@[\](){}"'])/g;
  for (const match of text.matchAll(pattern)) {
    found.add(match[2]);
  }
  return [...found];
}
