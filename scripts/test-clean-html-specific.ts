
import { cleanHtml } from './utils/clean-html.ts';

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
    },
    {
        name: "C/C++ Include Directives",
        input: "#include <stdio.h><br/>#include <math.h><br/>int main()",
        expected: "#include &lt;stdio.h&gt;<br/>#include &lt;math.h&gt;<br/>int main()"
    },
    {
        name: "OCR Artifacts: Control Characters to Letters",
        // \x1d -> i, \x1e -> i, \x1f -> i
        input: "B\u001dlgisayar İşlemc\u001ds\u001d",
        expected: "Bilgisayar İşlemcisi"
    },
    {
        name: "OCR Artifacts: Ligatures",
        // \x18 -> fl, \x19 -> fi
        input: "hede\u0018enir ve sını\u0018andırılır",
        expected: "hedeflenir ve sınıflandırılır"
    },
    {
        name: "OCR Artifacts: Turkish Characters",
        // \x16 -> ü, \x12 -> ş, \x14 -> ğ
        input: "\u0016retim ve da\u0014ıtım a\u0014ı",
        expected: "üretim ve dağıtım ağı"
    },
    {
        name: "Technical <del> tags",
        input: "<del>metin</del>",
        expected: "&lt;del&gt;metin&lt;/del&gt;"
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
