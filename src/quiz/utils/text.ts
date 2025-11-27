const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const containsWord = (text: string, keywords: string[]): boolean => {
  return keywords.some((keyword) => {
    const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
    return pattern.test(text);
  });
};
