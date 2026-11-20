// Picks a Lucide icon for a course from words in its name; falls back to a book.
import type { SimgeAdi } from "./simge";

const KURALLAR: Array<[RegExp, SimgeAdi]> = [
  [/yabancı dil|ingilizce|almanca|arapça|fransızca|english/i, "Languages"],
  [/türk dili|edebiyat|dil bilgisi|yazılı anlatım|sözlü anlatım|metin/i, "BookOpenText"],
  [/atatürk|inkılap|tarih|osmanlı|uygarlık|medeniyet/i, "Landmark"],
  [/bilgi teknoloji|bilgisayar|programla|yazılım|algoritma|veri taban|web|internet|kodlama|bilişim|ağ /i, "Laptop"],
  [/matematik|istatistik|sayısal|olasılık|ekonometri|finans matemati/i, "Sigma"],
  [/muhasebe|maliyet|vergi|maliye|bütçe|finans|bankacılık|sigorta|borsa|sermaye/i, "Calculator"],
  [/iktisat|ekonomi|işletme|pazarlama|yönetim|ticaret|lojistik|girişim|satış|perakende/i, "BriefcaseBusiness"],
  [/hukuk|anayasa|mevzuat|kanun|adalet|ceza|borçlar/i, "Scale"],
  [/sağlık|hemşire|tıbbi|hastalık|anatomi|fizyoloji|ilk ?yardım|ebelik|beslenme|farmakoloji/i, "Stethoscope"],
  [/çocuk|aile|ergen|bebek|okul öncesi|yaşlı/i, "Baby"],
  [/psikoloji|davranış|ruh sağlığı|danışman/i, "Brain"],
  [/sosyoloji|toplum|sosyal hizmet|sosyal politika|kültür/i, "Users"],
  [/felsefe|mantık|etik|ahlak/i, "Lightbulb"],
  [/ilahiyat|kuran|kur'an|hadis|fıkıh|tefsir|din|siyer|kelam|tasavvuf/i, "BookOpen"],
  [/coğrafya|harita|cbs|afet|deprem|iklim|çevre|ekoloji/i, "Earth"],
  [/fotoğraf|kamera|sinema|televizyon|radyo|video|görüntü/i, "Camera"],
  [/tasarım|grafik|sanat|resim|illüstrasyon|tipografi|moda|tekstil/i, "Palette"],
  [/iletişim|gazetecilik|medya|halkla ilişkiler|reklam|tanıtım/i, "Megaphone"],
  [/turizm|otel|seyahat|mutfak|aşçılık|gastronomi|yiyecek/i, "Plane"],
  [/güvenlik|koruma|savunma|iş sağlığı/i, "ShieldCheck"],
  [/spor|egzersiz|rekreasyon/i, "Dumbbell"],
  [/eğitim|öğretim|pedagoji/i, "GraduationCap"],
  [/kimya|biyoloji|fizik|laboratuvar|veteriner|tarım/i, "FlaskConical"],
  [/uygulama|staj|proje|bitirme/i, "Wrench"],
];

export function dersSimgesi(ad: string): SimgeAdi {
  for (const [re, simge] of KURALLAR) if (re.test(ad)) return simge;
  return "Library";
}

export const KATEGORI_ADI: Record<string, string> = {
  zorunlu: "Zorunlu dersler",
  "yabanci-dil": "Yabancı dil seçenekleri",
  secmeli: "Seçmeli dersler",
  "alan-disi-secmeli": "Alan dışı seçmeli dersler",
};
