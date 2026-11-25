import { useEffect, useState } from "react";
import { Camera, Image as Galeria, UserRound } from "lucide-react";
export function FotoPerfil({
  foto,
  arquivo,
  escolher,
}: {
  foto?: string | null;
  arquivo: File | null;
  escolher: (f: File) => void;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!arquivo) {
      setUrl("");
      return;
    }
    const s = URL.createObjectURL(arquivo);
    setUrl(s);
    return () => URL.revokeObjectURL(s);
  }, [arquivo]);
  return (
    <div className="retrato">
      <div className="rosto">
        {url || foto ? (
          <img
            alt="Foto de perfil"
            src={url || foto!}
            onError={() => setUrl("")}
          />
        ) : (
          <UserRound size={42} />
        )}
      </div>
      {arquivo && <small>{arquivo.name}</small>}
      <div className="escolha-foto">
        {[true, false].map((camera) => (
          <label key={String(camera)}>
            {camera ? <Camera size={17} /> : <Galeria size={17} />}
            {camera ? "Tirar foto" : "Escolher da galeria"}
            <input
              aria-label={camera ? "Tirar foto" : "Escolher da galeria"}
              type="file"
              capture={camera ? "user" : undefined}
              accept="image/*,.heic,.heif"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) escolher(f);
                e.target.value = "";
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
