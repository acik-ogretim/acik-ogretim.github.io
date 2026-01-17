
import { cleanHtml } from './scripts/utils/clean-html';

const testCases = [
    {
        name: "Turkish Correct Answer Phrase",
        html: "Bu sorunun doğru cevabı C şıkkıdır.",
        isExplanation: true,
        expected: ""
    },
    {
        name: "Turkish Correct Answer with Suffix",
        html: "Doğru yanıt B'dir.",
        isExplanation: true,
        expected: ""
    },
    {
        name: "Legitimate word 'Durum'",
        html: "Bu durum kritiktir.",
        isExplanation: true,
        expected: "Bu durum kritiktir."
    },
    {
        name: "Legitimate word 'aramaktadır'",
        html: "Şirket yeni personel aramaktadır.",
        isExplanation: true,
        expected: "Şirket yeni personel aramaktadır."
    },
    {
        name: "English Correct Answer",
        html: "The correct answer is A.",
        isExplanation: true,
        expected: ""
    },
    {
        name: "English Instruction with choice",
        html: "The correct answer is A. If your answer is incorrect, review the 'Market structures' section.",
        isExplanation: true,
        expected: ""
    },
    {
        name: "List with artifact attributes",
        html: "<ul data-start=\"1\"><li lang=\"tr\">Madde 1</li><li lang=\"tr\">Madde 2</li></ul>",
        isExplanation: true,
        expected: "<ul><li>Madde 1</li><li>Madde 2</li></ul>"
    },
    {
        name: "Multiple spaces and punctuation",
        html: "Bu bir   cümledir.   ",
        isExplanation: true,
        expected: "Bu bir cümledir."
    },
    {
        name: "Lone suffix artifact (Kept if no choice)",
        html: "Bu bir açıklamadır. dir.",
        isExplanation: true,
        expected: "Bu bir açıklamadır. dir."
    },
    {
        name: "Span in Non-Technical Mode",
        html: "<span lang=\"tr\">Test content</span>",
        isExplanation: false,
        expected: "Test content"
    },
    {
        name: "False Positive: Match contained in word",
        html: "Cevap ancak bu şekilde verilebilir.",
        isExplanation: true,
        expected: "Cevap ancak bu şekilde verilebilir."
    },
    {
        name: "False Positive: Sentence ending in 'dir' without space",
        html: "Bu bir problemdir.",
        isExplanation: true,
        expected: "Bu bir problemdir."
    },
    {
        name: "False Positive: Greedy pattern without choice",
        html: "Soru metnindeki tüm ifadelerin doğru olduğu görülecektir.",
        isExplanation: true,
        expected: "Soru metnindeki tüm ifadelerin doğru olduğu görülecektir."
    },
    {
        name: "Legitimate word: Georeferencing",
        html: "Harita Koordinatını Gir penceresi aktif hale gelmişse yapılmak istenen işlem Georeferencing.",
        isExplanation: true,
        expected: "Harita Koordinatını Gir penceresi aktif hale gelmişse yapılmak istenen işlem Georeferencing."
    },
    {
        name: "Legitimate word: Georeferencing with space-dir",
        html: "Bu işlem Georeferencing dir.",
        isExplanation: true,
        expected: "Bu işlem Georeferencing dir."
    },
    {
        name: "Partial Match Failure: Leave tail",
        html: "QGIS, OsGeo'nun geliştirdiği açık kaynak kodlu ücretsiz bir yazılımdır. Doğru cevap A'dır.",
        isExplanation: true,
        expected: "QGIS, OsGeo'nun geliştirdiği açık kaynak kodlu ücretsiz bir yazılımdır."
    },
    {
        name: "Partial Match Failure: Leave suffix lead",
        html: "Doğru cevap D dir. Çığ düşmeleri insan kaynaklı değildir.",
        isExplanation: true,
        expected: "Çığ düşmeleri insan kaynaklı değildir."
    },
    {
        name: "Partial Match Failure: Leave intro",
        html: "Uluslararası Afet Bilgi Ağı. Bu kapsamda cevap C şıkkıdır.",
        isExplanation: true,
        expected: "Uluslararası Afet Bilgi Ağı."
    },
    {
        name: "Question text (should NOT be cleaned aggressively)",
        html: "Doğru cevabı A şıkkı olan soru hangisidir?",
        isExplanation: false,
        expected: "Doğru cevabı A şıkkı olan soru hangisidir?"
    },
    {
        name: "Respect disableChoiceCleanup option",
        html: "Bu bir açıklamadır. Dolayısıyla cevap A şıkkıdır.",
        isExplanation: true,
        disableChoiceCleanup: true,
        expected: "Bu bir açıklamadır. Dolayısıyla cevap A şıkkıdır."
    },
    {
        name: "Empty Strong Tag",
        html: "Planda düz giden kısımlar <strong></strong>olarak adlandırılırken",
        isExplanation: false,
        expected: "Planda düz giden kısımlar olarak adlandırılırken"
    }
];

console.log("Running CleanHtml Tests...\n");

let passed = 0;
testCases.forEach(tc => {
    // @ts-ignore
    const result = cleanHtml(tc.html, { isExplanation: tc.isExplanation, debug: true, disableChoiceCleanup: tc.disableChoiceCleanup });
    // Normalize result for comparison (though cleanHtml should already normalize)
    const normalizedResult = result.trim();
    if (normalizedResult === tc.expected) {
        console.log(`✅ PASSED: ${tc.name}`);
        passed++;
    } else {
        console.log(`❌ FAILED: ${tc.name}`);
        console.log(`   Input:    [${tc.html}]`);
        console.log(`   Expected: [${tc.expected}]`);
        console.log(`   Actual:   [${normalizedResult}]`);
    }
});

console.log(`\nTests finished. ${passed}/${testCases.length} passed.`);
