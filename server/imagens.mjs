import sharp from "sharp";
import convert from "heic-convert";

export const limite = 15 * 1024 * 1024;
export async function processar(bytes, moldura, corte = {zoom:1, x:.5, y:.5}) {
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
  if (moldura) {
    const { data, info } = await origem.autoOrient().toBuffer({ resolveWithObject: true });
    const largura = Math.max(1, Math.round(Math.min(info.width, info.height * moldura.w / moldura.h) / corte.zoom));
    const altura = Math.min(info.height, Math.max(1, Math.round(largura * moldura.h / moldura.w)));
    origem = sharp(data).extract({ left: Math.round((info.width-largura)*corte.x), top: Math.round((info.height-altura)*corte.y),
      width: Math.max(1, largura), height: altura });
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
