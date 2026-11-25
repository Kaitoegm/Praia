import sharp from "sharp";
import convert from "heic-convert";

export const limite = 15 * 1024 * 1024;
export async function processar(bytes) {
  if (!bytes.length || bytes.length > limite)
    throw Error("Selecione uma imagem de até 15 MB.");
  const opcoes = { limitInputPixels: 64000000, failOn: "error" };
  let origem = sharp(bytes, opcoes);
  const meta = await origem.metadata();
  if (
    !["jpeg", "png", "webp", "heif"].includes(meta.format) ||
    meta.width * meta.height > opcoes.limitInputPixels
  )
    throw Error("Formato ou dimensões incompatíveis.");
  if (meta.format === "heif") {
    const png = await convert({ buffer: bytes, format: "PNG" });
    origem = sharp(Buffer.from(png), opcoes);
  }
  const imagem = await origem
    .autoOrient()
    .resize({
      width: 2048,
      height: 2048,
      fit: "inside",
      withoutEnlargement: true,
    })
    .flatten({ background: "#fff" })
    .jpeg({ quality: 86 })
    .toBuffer();
  const miniatura = await sharp(imagem)
    .resize({
      width: 360,
      height: 360,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 78 })
    .toBuffer();
  return { imagem, miniatura };
}
