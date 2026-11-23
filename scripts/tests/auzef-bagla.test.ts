import { expect, it } from "vitest";
import { audioUnit, assetTitle } from "../auzef-bagla.mjs";
it("distinguishes a unit recording from a combined summary", () => {
  expect(audioUnit("Unite_07_Podcast_Gemini_Audio.mp3")).toBe(7);
  expect(audioUnit("Unite_01_Ozet_Podcast.mp3")).toBe(1);
  expect(audioUnit("Unite_01_05_Ozel_Ozet_Podcast.mp3")).toBeNull();
  expect(audioUnit("Vize_Ozel_Ozet_Podcast.mp3")).toBeNull();
  expect(assetTitle("Soru_Cozumu_Final_Unite_06_10.mp4")).toBe(
    "Final soru çözümü",
  );
  expect(assetTitle("Unite_07_Podcast_Gemini_Audio.mp3")).toBe(
    "Uzun anlatım · Ünite 7",
  );
});
