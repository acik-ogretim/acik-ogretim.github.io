import Fuse from "fuse.js";

const STOP_WORDS = [
    "ve", "ile", "bir", "the", "and", "of",
    "de", "da", "mi", "mu", "mı", "ama", "çünkü", // Generic Turkish conjunctions
    "in", "on", "at", "for", "to" // Common English prepositions
];

/**
 * Enhanced Turkish text normalization
 * Updated to use NFD and toLocaleLowerCase('tr') for accurate handling
 * Also strips common stop words.
 */
export function normalizeTurkish(text: string): string {
    let normalized = text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove generic diacritics
        .toLocaleLowerCase("tr")
        .replace(/ı/g, "i") // Normalize dotless i to i for search compatibility
        .replace(/[\s\-_.,:;?!()*&]+/g, " ") // Normalize spaces/punctuation to single space
        .trim();

    // Remove stopwords safely
    // Using u flag for unicode-aware matching if supported environment
    STOP_WORDS.forEach((word) => {
        // Regex matches word surrounded by whitespace or string start/end
        // We use a capture group for the prefix to preserve it if needed, or just replace with space
        const regex = new RegExp(`(^|\\s)${word}(?=\\s|$)`, "giu");
        normalized = normalized.replace(regex, " ");
    });

    return normalized
        .replace(/\s+/g, " ") // Ensure single spaces
        .replace(/(.)\1+/g, "$1") // Double letter reduction
        .trim();
}

/**
 * Pre-configured Fuse.js instance creator
 * optimized for Turkish content search
 * Note: Fuse.js instantiation can be expensive. Create once and reuse.
 */
export function createFuse<T>(
    data: T[],
    keys: string[],
    threshold = 0.5,
): Fuse<T> {
    return new Fuse(data, {
        keys,
        includeScore: true,
        threshold,
        ignoreLocation: true, // Search everywhere in the string, not just start
        useExtendedSearch: true,
    });
}

/**
 * Fuzzy search match for single items using Fuse.js.
 * Useful for checking individual strings with typo tolerance.
 */
export function searchMatch(target: string, query: string, threshold = 0.5): boolean {
    if (!query) return true;
    const fuse = createFuse([{ t: target }], ["t"], threshold);
    // Normalize query to handle stopwords and characters
    return fuse.search(normalizeTurkish(query)).length > 0;
}
