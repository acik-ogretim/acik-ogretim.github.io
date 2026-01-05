# 🏗️ Açık Öğretim Veri Yönetimi ve MCP Server Planı

## 📋 Genel Bakış

Bu plan, açık öğretim portalı için veri yönetimi ve MCP (Model Context Protocol) server altyapısını tanımlar.

### Proje Mimarisi

```
Projeler:
├── acik-ogretim.github.io     # ✅ Tamamlandı - Astro Portal (Frontend)
├── acik-ogretim-mcp           # 🆕 Yeni - Next.js MCP Server
└── ataaof-denemeler           # 📦 Mevcut - Python Data Pipeline (Private)
```

---

## 🎯 Hedefler

1. **MCP Server**: AI agentlarının kullanabileceği araçlar sunmak
2. **Data API**: Portal ve diğer uygulamalar için veri sunmak
3. **Migration**: Mevcut verileri yeni yapıya taşımak
4. **Automation**: Veri güncelleme süreçlerini otomatikleştirmek

---

## 📁 acik-ogretim-mcp Projesi Yapısı

```
acik-ogretim-mcp/
├── app/
│   ├── api/
│   │   ├── [transport]/
│   │   │   └── route.ts          # MCP handler endpoint
│   │   ├── questions/
│   │   │   └── route.ts          # REST API for questions
│   │   ├── courses/
│   │   │   └── route.ts          # REST API for courses
│   │   └── migrate/
│   │       └── route.ts          # Migration API
│   └── page.tsx                   # Dashboard/docs page
├── lib/
│   ├── mcp/
│   │   ├── tools/
│   │   │   ├── searchQuestions.ts
│   │   │   ├── getCourse.ts
│   │   │   ├── generateQuiz.ts
│   │   │   ├── listCourses.ts
│   │   │   └── getStats.ts
│   │   └── resources/
│   │       ├── universities.ts
│   │       └── departments.ts
│   ├── db/
│   │   ├── schema.ts             # Drizzle/Prisma schema
│   │   └── client.ts             # Database client
│   └── migrate/
│       ├── importQuestions.ts
│       ├── importCourses.ts
│       └── transformers.ts
├── data/                          # Static JSON data (git LFS)
│   ├── universities.json
│   ├── departments.json
│   └── courses/
│       ├── anadolu-aof/
│       ├── ataturk-aof/
│       └── auzef/
├── package.json
├── next.config.js
└── vercel.json
```

---

## 🔧 MCP Araçları (Tools)

### 1. search_questions
```typescript
{
  name: "search_questions",
  description: "Soru bankasında arama yapar",
  parameters: {
    university?: string,    // "anadolu-aof" | "ataturk-aof" | "auzef"
    department?: string,    // "gorsel-iletisim" | "grafik-sanatlar" | "cocuk-gelisimi"
    course?: string,        // Ders slug'ı
    unit?: number,          // Ünite numarası
    keyword?: string,       // Arama kelimesi
    source?: string,        // "soru-bankasi" | "cikmis-soru" | "deneme"
    limit?: number          // Maksimum sonuç (default: 10)
  }
}
```

### 2. get_course
```typescript
{
  name: "get_course",
  description: "Ders detaylarını getirir",
  parameters: {
    university: string,
    department: string,
    courseId: string
  }
}
```

### 3. generate_quiz
```typescript
{
  name: "generate_quiz",
  description: "Belirtilen kriterlere göre quiz oluşturur",
  parameters: {
    university: string,
    department: string,
    course: string,
    units?: number[],       // Ünite numaraları
    questionCount: number,  // Soru sayısı
    difficulty?: string,    // "kolay" | "orta" | "zor"
    shuffle?: boolean       // Soruları karıştır
  }
}
```

### 4. list_courses
```typescript
{
  name: "list_courses",
  description: "Dersleri listeler",
  parameters: {
    university?: string,
    department?: string,
    semester?: number
  }
}
```

### 5. get_stats
```typescript
{
  name: "get_stats",
  description: "Portal istatistiklerini getirir",
  parameters: {
    university?: string,
    department?: string
  }
}
```

### 6. sync_data
```typescript
{
  name: "sync_data",
  description: "Veri kaynağından güncelleme yapar (admin only)",
  parameters: {
    university: string,
    department?: string,
    course?: string,
    forceRefresh?: boolean
  }
}
```

---

## 📊 Veri Şemaları

### Question Schema
```typescript
interface Question {
  id: string;                    // Unique ID
  universityId: string;          // "anadolu-aof" | "ataturk-aof" | "auzef"
  departmentId: string;          // Bölüm slug'ı
  courseId: string;              // Ders slug'ı
  courseName: string;            // Ders adı (orijinal)
  semester: number;              // Dönem (1-8)
  unitNumber: number;            // Ünite numarası

  text: string;                  // Soru metni
  options: QuestionOption[];     // Seçenekler
  correctAnswer: string;         // "A" | "B" | "C" | "D" | "E"

  source: QuestionSource;        // Kaynak türü
  year?: number;                 // Sınav yılı
  examType?: ExamType;           // Sınav türü

  explanation?: string;          // AI açıklama
  topics?: string[];             // Konu etiketleri
  difficulty?: Difficulty;       // Zorluk seviyesi

  createdAt: Date;
  updatedAt: Date;
}

type QuestionSource = "soru-bankasi" | "cikmis-soru" | "deneme" | "sorularla-ogrenelim";
type ExamType = "vize" | "final" | "butunleme" | "tek-ders";
type Difficulty = "kolay" | "orta" | "zor";
```

### Course Schema
```typescript
interface Course {
  id: string;                    // Slug: "temel-fotografcilik"
  name: string;                  // "Temel Fotoğrafçılık"
  universityId: string;
  departmentId: string;
  semester: number;
  code?: string;
  credits?: number;
  unitCount: number;
  questionCount: number;
  lastUpdated: Date;
}
```

---

## 🔄 Migrasyon Stratejisi

### Faz 1: Veri Analizi
```bash
# ataaof-denemeler'deki verileri analiz et
- JSON dosya sayısı ve boyutu
- Mevcut şema yapısı
- Eksik/hatalı veriler
```

### Faz 2: Transformer Oluşturma
```typescript
// lib/migrate/transformers.ts
export function transformAnadoluQuestion(raw: any): Question
export function transformAtaturkQuestion(raw: any): Question
export function transformAuzefQuestion(raw: any): Question
```

### Faz 3: Import İşlemi
```bash
# Migrasyon adımları
1. Raw JSON'ları oku
2. Transformer ile dönüştür
3. Validate et
4. Yeni yapıya kaydet
```

### Faz 4: Doğrulama
```bash
# Kontrol listesi
- [ ] Tüm sorular import edildi mi?
- [ ] Veri tutarlılığı sağlandı mı?
- [ ] Linkler çalışıyor mu?
```

---

## 🚀 Deployment Stratejisi

### Option A: Vercel (Önerilen)
- Next.js native support
- Serverless functions
- Edge runtime
- Free tier yeterli

### Option B: Cloudflare Workers
- Daha hızlı cold start
- Global edge network
- D1 database entegrasyonu

### Option C: Self-hosted
- VPS üzerinde Node.js
- Database: PostgreSQL/SQLite
- Daha fazla kontrol

---

## 📅 Uygulama Zaman Çizelgesi

### Hafta 1: Temel Kurulum
- [ ] Next.js projesi oluştur
- [ ] mcp-handler entegrasyonu
- [ ] Temel MCP araçları
- [ ] Vercel deploy

### Hafta 2: Veri Migrasyonu
- [ ] Transformer fonksiyonları
- [ ] Import scriptleri
- [ ] Veri doğrulama
- [ ] Test

### Hafta 3: Portal Entegrasyonu
- [ ] Astro portal'a API bağlantısı
- [ ] Dinamik sayfalar
- [ ] Quiz bileşeni
- [ ] Arama fonksiyonu

### Hafta 4: Polish & Launch
- [ ] Performance optimizasyonu
- [ ] Error handling
- [ ] Monitoring
- [ ] Documentation

---

## 🔗 Entegrasyon Noktaları

### 1. Portal (Astro) ↔ MCP Server
```typescript
// Portal'dan API çağrısı
const response = await fetch('https://mcp.acik-ogretim.dev/api/questions', {
  method: 'POST',
  body: JSON.stringify({ university: 'anadolu-aof', limit: 10 })
});
```

### 2. AI Agent ↔ MCP Server
```json
// Claude/Gemini MCP config
{
  "mcpServers": {
    "acik-ogretim": {
      "url": "https://mcp.acik-ogretim.dev/api/mcp",
      "transport": "sse"
    }
  }
}
```

### 3. GitHub Actions ↔ Data Sync
```yaml
# Veri güncelleme workflow
on:
  schedule:
    - cron: '0 2 * * *'  # Her gece 02:00
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger sync
        run: curl -X POST https://mcp.acik-ogretim.dev/api/sync
```

---

## ✅ Onay Kontrol Listesi

- [ ] Mimari onayı
- [ ] MCP araçları listesi onayı
- [ ] Veri şemaları onayı
- [ ] Deployment stratejisi onayı
- [ ] Zaman çizelgesi onayı

---

## 🎬 Sonraki Adım

Bu planı onaylarsanız, `acik-ogretim-mcp` projesini oluşturmaya başlayabiliriz.

```bash
npx create-next-app@latest acik-ogretim-mcp --typescript --tailwind --app --src-dir
```
