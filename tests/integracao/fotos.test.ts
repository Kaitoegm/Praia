import { expect, test } from "vitest";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { processar, limite } from "../../server/imagens.mjs";

test("processa formatos de celular, corrige orientação e retira EXIF", async () => {
  const jpeg = await sharp({
    create: { width: 300, height: 600, channels: 3, background: "blue" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  for (const bytes of [
    jpeg,
    await sharp(jpeg).png().toBuffer(),
    await sharp(jpeg).webp().toBuffer(),
    await readFile("tests/fixtures/fotos/exemplo.heic"),
  ]) {
    const { imagem, miniatura } = await processar(bytes);
    const m = await sharp(imagem).metadata(),
      mini = await sharp(miniatura).metadata();
    expect(m.format).toBe("jpeg");
    expect(m.exif).toBeUndefined();
    expect(Math.max(mini.width!, mini.height!)).toBeLessThanOrEqual(360);
    if (bytes === jpeg) expect([m.width, m.height]).toEqual([600, 300]);
  }
  await expect(processar(Buffer.from("arquivo inválido"))).rejects.toThrow();
  await expect(processar(Buffer.alloc(limite + 1))).rejects.toThrow();
}, 60000);
