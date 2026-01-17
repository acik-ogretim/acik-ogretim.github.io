
import { cleanHtml } from './utils/clean-html';

const testCases = [
    {
        name: "Manual Roman Numeral List with BR",
        input: "IV- Ağaç yüksekliği 4’dir<br/>Aşağıdaki ağaç için...",
        expected: "IV- Ağaç yüksekliği 4’dir<br/>Aşağıdaki ağaç için..."
    },
    {
        name: "Standard Text with BR",
        input: "Line 1<br>Line 2",
        expected: "Line 1<br/>Line 2"
    },
    {
        name: "List with internal BR (should be kept if not padding)",
        input: "<ul><li>Item 1<br>Detail</li></ul>",
        expected: "<ul><li>Item 1<br/>Detail</li></ul>"
    },
    {
        name: "User provided example with question text",
        input: "Modern bilgisayarların tarihçesi beş ana dönemde incelenir:<br/><ul><li>Birinci nesil...</li></ul>",
        expected: "Modern bilgisayarların tarihçesi beş ana dönemde incelenir:<br/><ul><li>Birinci nesil...</li></ul>"
    },
    {
        name: "User Data: Strong tags",
        input: "Veri yapılarının kullanılmasındaki temel amaç, <strong>farklı görevlerin uzay (bellek) ve zaman (işlem süresi) karmaşıklığını azaltmak için</strong> vardır.",
        expected: "Veri yapılarının kullanılmasındaki temel amaç, <strong>farklı görevlerin uzay (bellek) ve zaman (işlem süresi) karmaşıklığını azaltmak için</strong> vardır."
    },
    {
        name: "User Data: Pre tags",
        input: "Aşağıdaki işlemler sonrasında yığın görüntüsü ne olacaktır?<br/><pre> mystack.push(1);<br /> mystack.push(2);</pre>",
        expected: "Aşağıdaki işlemler sonrasında yığın görüntüsü ne olacaktır?<br/><pre> mystack.push(1);<br/> mystack.push(2);</pre>"
    }
];

let failed = 0;

console.log("Running cleanHtml specific tests...\n");

testCases.forEach(tc => {
    const actual = cleanHtml(tc.input, { isTechnical: true });

    // Normalize newlines for comparison
    const normalizedActual = actual.replace(/\r\n/g, '\n').trim();
    const normalizedExpected = tc.expected.replace(/\r\n/g, '\n').trim();

    if (normalizedActual !== normalizedExpected) {
        console.error(`[FAIL] ${tc.name}`);
        console.error(`Expected:\n${JSON.stringify(normalizedExpected)}`);
        console.error(`Actual:\n${JSON.stringify(normalizedActual)}`);
        failed++;
    } else {
        console.log(`[PASS] ${tc.name}`);
    }
});

if (failed > 0) {
    console.error(`\n${failed} tests failed.`);
    process.exit(1);
} else {
    console.log("\nAll specific tests passed.");
}
