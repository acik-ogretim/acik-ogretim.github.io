import { cleanHtml } from './scripts/utils/clean-html.ts';

interface TestCase {
    name: string;
    input: string;
    expectedContains?: string[];
    expectedNotContains?: string[];
    exactOutput?: string;
}

const testCases: TestCase[] = [
    {
        name: "Standard Self-closing BR",
        input: "<p>Line 1<br>Line 2<br />Line 3</p>",
        expectedContains: ["Line 1<br/>Line 2<br/>Line 3"]
    },
    {
        name: "Preserve BR before Uppercase (No Space around)",
        input: "<p>the equality. <br/> In the basic accounting</p>",
        expectedContains: ["the equality.<br/>In the basic accounting"]
    },
    {
        name: "Preserve BR after Number (No Space around)",
        input: "<p>Allowances 5.000<br/> Accounts</p>",
        expectedContains: ["Allowances 5.000<br/>Accounts"]
    },
    {
        name: "Collapse Multiple BRs to Single",
        input: "<p>TL<br/><br/>Double<br/><br/><br/>Triple</p>",
        expectedContains: ["TL<br/>Double<br/>Triple"]
    },
    {
        name: "Preserve BR in List Items exactly",
        input: "<li>Line 1<br/>Line 2</li>",
        exactOutput: "<li>Line 1<br/>Line 2</li>"
    },
    {
        name: "Preserve BR before Bullet Points (No Space)",
        input: "<p>services rendered. <br/>• Expenses.</p>",
        expectedContains: ["rendered.<br/>• Expenses."]
    },
    {
        name: "Preserve BR before Numbered List (No Space)",
        input: "<p>of the column.<br/> 3. The</p>",
        expectedContains: ["column.<br/>3. The"]
    },
    {
        name: "Preserve BR before Roman Numerals",
        input: "<p>Liste:<br/>XI. Madde</p>",
        expectedContains: ["Liste:<br/>XI. Madde"]
    },
    {
        name: "Mid-word BR to Space: teknoloji sinin",
        input: "<p>destekli tasarım teknoloji<br/>sinin gelişiminde</p>",
        expectedContains: ["teknoloji sinin gelişiminde"],
        expectedNotContains: ["teknoloji<br/>sinin"]
    },
    {
        name: "Mid-sentence BR to Space: comma case",
        input: "<p>Genellikle ampul, mum,<br/>fener gibi küçük</p>",
        expectedContains: ["ampul, mum, fener gibi"],
        expectedNotContains: ["mum,<br/>fener"]
    },
    {
        name: "Mid-sentence BR to Space: parenthesis case",
        input: "<p>arttıkça (yüzeye daha eğik bir açıyla vurdukça)<br/>yansımanın daha belirgin</p>",
        expectedContains: ["vurdukça) yansımanın"],
        expectedNotContains: ["vurdukça)<br/>yansımanın"]
    },
    {
        name: "Image Preservation (Self-closing and No attributes)",
        input: "<p><img src=\"https://test.png\" alt=\"\" width=\"36\" height=\"31\" /></p><p>Yukarıdaki resim</p>",
        expectedContains: ["<img src=\"https://test.png\" alt/>", "Yukarıdaki resim"],
        expectedNotContains: ["width=", "height="]
    },
    {
        name: "Remove Empty Formatting with Space",
        input: "<p>gerekmektedir.<strong>  </strong>Mesajların</p>",
        expectedContains: ["gerekmektedir. Mesajların"],
        expectedNotContains: ["<strong>"]
    },
    {
        name: "Space Preservation after Dots",
        input: "<p>....... bilgisayar grafikleri</p>",
        expectedContains: ["....... bilgisayar grafikleri"]
    },
    {
        name: "Space Preservation between Strong tags",
        input: "<p><strong>NOT</strong> <strong>TRUE</strong> about <em>journal</em></p>",
        expectedContains: ["<strong>NOT</strong> <strong>TRUE</strong>"]
    },
    {
        name: "Roman Numeral List Conversion",
        input: "<ol style=\"list-style-type: lower-roman;\"><li>Item</li></ol>",
        exactOutput: "<ol type=\"i\"><li>Item</li></ol>"
    },
    {
        name: "Unwrap Headings",
        input: "<h3><strong>.أفْرادُ</strong></h3><br/><h3>Yukarıdaki</h3>",
        expectedContains: ["<strong>.أفْرادُ</strong><br/>Yukarıdaki"],
        expectedNotContains: ["<h3>", "</h3>"]
    },
    {
        name: "Accounting Case (IMG in Strong + Nested Divs)",
        input: "<p><strong><img src=\"test.png\" alt=\"\" width=\"395\" /></strong></p> <p><strong>Question?</strong></p>",
        expectedContains: ["<strong><img src=\"test.png\" alt/></strong><br/><strong>Question?</strong>"],
        expectedNotContains: ["<p>", "width="]
    },
    {
        name: "Nested Div Options Cleanup",
        input: "<div class=\"page\"><div class=\"section\"><p>Havale tutarı</p></div></div>",
        exactOutput: "Havale tutarı"
    }
];

let failed = 0;

console.log(`🚀 Starting Final HTML Cleaning Tests (${testCases.length} cases)\n`);

testCases.forEach((tc, index) => {
    const output = cleanHtml(tc.input, { isTechnical: false });
    let passed = true;
    const errors: string[] = [];

    if (tc.exactOutput && output !== tc.exactOutput) {
        passed = false;
        errors.push(`Exact match failed.\nExpected: '${tc.exactOutput}'\nActual:   '${output}'`);
    }

    if (tc.expectedContains) {
        tc.expectedContains.forEach(s => {
            if (!output.includes(s)) {
                passed = false;
                errors.push(`Missing expected string: "${s}"`);
            }
        });
    }

    if (tc.expectedNotContains) {
        tc.expectedNotContains.forEach(s => {
            if (output.includes(s)) {
                passed = false;
                errors.push(`Found forbidden string: "${s}"`);
            }
        });
    }

    if (passed) {
        console.log(`✅ [${index + 1}/${testCases.length}] ${tc.name}`);
    } else {
        failed++;
        console.log(`❌ [${index + 1}/${testCases.length}] ${tc.name}`);
        console.log(`   Input:    ${tc.input}`);
        console.log(`   Output:   '${output}'`);
        errors.forEach(e => console.log(`   Error:    ${e}`));
    }
});

console.log(`\n📊 Test Summary: ${testCases.length - failed} passed, ${failed} failed.`);

if (failed > 0) {
    process.exit(1);
}
