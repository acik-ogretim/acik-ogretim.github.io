import { test, expect } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";

for (const width of [390, 1280])
  test(`İçerik durumu ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/durum/?uni=ataturk-aof&q=psikoloji");
    const course = page.getByRole("button", { name: /^Psikoloji/ });
    await expect(course).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole("status").last()).toContainText(
      "ders · Güncelleme",
    );
    await course.click();
    await expect(
      page.getByText("Çıkmış sorular:", { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await expect(
      page.getByText("1. ünite PSİKOLOJİYE GİRİŞ", { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await page.getByText("Alanları aç / kapat", { exact: true }).click();
    await page
      .getByRole("checkbox", { name: "Uzun anlatım dökümü", exact: true })
      .check();
    await page.reload();
    await expect(page.getByRole("button", { name: /^Psikoloji/ })).toBeVisible({
      timeout: 30000,
    });
    await page.getByText("Alanları aç / kapat", { exact: true }).click();
    await expect(
      page.getByRole("checkbox", { name: "Uzun anlatım dökümü", exact: true }),
    ).toBeChecked();
    await page.getByText("İçerik süzgeçleri (0)", { exact: true }).click();
    await page
      .getByRole("combobox", { name: "Çıkmış sorular", exact: true })
      .selectOption("yok");
    await expect(page).toHaveURL(/questions=yok/);
    await expect(course).toHaveCount(0);
    await page
      .getByRole("combobox", { name: "Çıkmış sorular", exact: true })
      .selectOption("var");
    await expect(page.getByRole("button", { name: /^Psikoloji/ })).toBeVisible({
      timeout: 30000,
    });
    await page
      .getByRole("combobox", { name: "Sırala", exact: true })
      .selectOption("updated");
    await expect(page).toHaveURL(/sirala=updated/);
    await page.getByRole("button", { name: "Artan ↑", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/azalan=1/);
    if (width === 1280)
      await expect(
        page.getByRole("columnheader", { name: /Son güncelleme/ }),
      ).toHaveAttribute("aria-sort", "descending");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "CSV indir" }).click();
    const csv = await download;
    expect(csv.suggestedFilename()).toBe("ders-durumu.csv");
    expect(readFileSync((await csv.path())!, "utf8")).toContain("Psikoloji");
    await page.getByRole("button", { name: /^ATA-AÖF · / }).click();
    await expect(page.getByRole("button", { name: /^Psikoloji/ })).toHaveCount(
      0,
    );
    await page.getByRole("button", { name: /^ATA-AÖF · / }).click();
    await page.getByRole("button", { name: /^Psikoloji/ }).click();
    await page.getByText("Alanları aç / kapat", { exact: true }).click();
    await page.getByText("İçerik süzgeçleri (1)", { exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const out = process.env.E2E_EKRAN ?? "/tmp/durum-ekran";
    mkdirSync(out, { recursive: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${out}/durum-${width}.png` });
    await page.goto("/auzef/cocuk-gelisimi/anne-baba-egitimi/");
    const media = page
      .locator("summary")
      .filter({ hasText: /^Ders sesleri ve videoları/ });
    await media.click();
    await expect(
      page.locator('a[href*="medya.zeki.website/auzef/anne-baba-egitimi/"]'),
    ).toHaveCount(17);
    await media.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/auzef-medya-${width}.png` });
    const menu = page.getByRole("dialog", { name: "Tüm menü" });
    await expect(async () => {
      if (!(await menu.isVisible())) {
        if (await page.locator("#btn-mobil-menu").isVisible())
          await page.locator("#btn-mobil-menu").click();
        else await page.keyboard.press("m");
      }
      await expect(menu).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15000 });
    await expect(
      menu.getByRole("link", { name: "Durum", exact: true }),
    ).toHaveAttribute("href", "/durum/");
    expect(errors).toEqual([]);
  });
