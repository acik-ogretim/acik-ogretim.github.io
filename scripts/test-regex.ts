
const text = 'Aşağıdakilerden hangisi ya da hangileri sanat ontolojisinin temel sorularındandır?<br/><ol type="I"><br/><li>Sanat eserleri ne tür varlıklardır? </li><br/><li>Sanatçıların veya izleyicilerin zihinsel durumlarıyla, fiziksel nesnelerle veya soyut görsel, işitsel ve dilsel yapılarla ilgili çeşitli türlerdeki sanat eserleri nasıldır?</li><br/><li>Eserler hangi koşullar altında var olur, varlığını sürdürür veya yok olur?</li><br/></ol>';

let result = text;
// Same logic as in the script
result = result
    .replace(/(<br\s*\/?>\s*)+(<\/?(ul|ol|li)[^>]*>)/gi, "$2") // Remove <br> before list tags
    .replace(/(<\/?(ul|ol|li)[^>]*>)\s*(<br\s*\/?>\s*)+/gi, "$1"); // Remove <br> after list tags

console.log("Original:", text);
console.log("Cleaned: ", result);

if (text === result) {
    console.log("No change!");
} else {
    console.log("Changed!");
}
