import { describe, expect, it } from "vitest";
import { mergeVideo, videoId } from "../medya-bagla.mjs";
describe("published media connections", () => {
  it("recognizes existing ids and rejects invalid sources", () => {
    expect(videoId("https://youtu.be/wjR5nBMs6Jo")).toBe("wjR5nBMs6Jo");
    expect(videoId("https://youtu.be/invalid")).toBeNull();
    expect(() => mergeVideo([], { url: "bad", baslik: "Özet" })).toThrow();
  });
  it("keeps an existing video and its transcript when reconnecting", () => {
    const media = [
      {
        tur: "youtube",
        kaynak: "wjR5nBMs6Jo",
        satirlar: [{ m: "Mevcut döküm" }],
      },
    ];
    expect(
      mergeVideo(media, {
        url: "https://youtu.be/wjR5nBMs6Jo",
        baslik: "Özet",
      }),
    ).toBe(media);
    expect(
      mergeVideo([], { url: "https://youtu.be/wjR5nBMs6Jo", baslik: "Özet" }),
    ).toHaveLength(1);
  });
});
