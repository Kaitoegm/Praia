import * as webpush from "web-push";
import { readFileSync, writeFileSync } from "node:fs";
let chaves;
export function vapid() {
  if (chaves) return chaves;
  if (process.env.VAPID_PRIVATE_KEY && process.env.VAPID_PUBLIC_KEY)
    chaves = {
      privateKey: process.env.VAPID_PRIVATE_KEY,
      publicKey: process.env.VAPID_PUBLIC_KEY,
    };
  else if (process.env.NODE_ENV !== "production") {
    const file = ".env.push.local";
    try {
      chaves = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      try {
        writeFileSync(file, JSON.stringify(webpush.generateVAPIDKeys()), {
          flag: "wx",
          mode: 0o600,
        });
      } catch (e) {
        if (e.code !== "EEXIST") throw e;
      }
      chaves = JSON.parse(readFileSync(file, "utf8"));
    }
  }
  if (!chaves) throw Error("Configure VAPID para notificações.");
  return chaves;
}
export async function entregar(db) {
  const { data, error } = await db.rpc("proximos_push");
  if (error) throw error;
  await Promise.all(
    (data ?? []).map(async (e) => {
      try {
        await webpush.sendNotification(
          e.assinatura,
          JSON.stringify({
            id: e.aviso,
            texto: e.autor + " adicionou uma foto ao álbum.",
          }),
          {
            TTL: 86400,
            timeout: 10000,
            vapidDetails: {
              subject:
                process.env.VAPID_SUBJECT || "mailto:organizador@example.org",
              ...vapid(),
            },
          },
        );
        await db
          .from("entregas_push")
          .delete()
          .match({ aviso: e.aviso, endpoint: e.endpoint });
      } catch (err) {
        if ([404, 410].includes(err.statusCode))
          await db.from("aparelhos_push").delete().eq("endpoint", e.endpoint);
      }
    }),
  );
}
export function assinaturaValida(s) {
  try {
    const u = new URL(s.endpoint);
    return (
      u.protocol === "https:" &&
      !u.port &&
      !u.username &&
      !u.password &&
      /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)*notify\.windows\.com)$/.test(
        u.hostname,
      ) &&
      typeof s.keys?.auth === "string" &&
      typeof s.keys?.p256dh === "string"
    );
  } catch {
    return false;
  }
}
