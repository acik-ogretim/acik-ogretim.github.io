// Short, human-readable labels for department degrees, so programs that share a name
// (e.g. "Çocuk Gelişimi" lisans and önlisans) stay distinguishable on cards and titles.
const DERECE_ADI: Record<string, string> = {
  lisans: "Lisans",
  onlisans: "Ön Lisans",
  "lisans-tamamlama": "Lisans Tamamlama",
  "uzem-lisans-tamamlama": "UZEM Lisans Tamamlama",
  "tezsiz-yuksek-lisans": "Tezsiz Yüksek Lisans",
};

export function dereceAdi(degree: string | undefined): string {
  return DERECE_ADI[degree ?? "lisans"] ?? "Lisans";
}
