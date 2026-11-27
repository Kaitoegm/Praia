import type { Corte } from "./corte";

export type Rascunho = {
  corte?: Corte;
  arquivo: File;
  legenda: string;
  tentativa: string;
  versao: number;
  criado: number;
  preview?: string;
  preparadoEm?: number;
};

let conexao: Promise<IDBDatabase> | undefined;
async function banco() {
  if (!conexao) {
    conexao = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("ohana-fotos", 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore("rascunhos");
        req.result.createObjectStore("arquivos");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }).catch((e) => { conexao = undefined; throw e; });
  }
  return conexao;
}

export async function lerRascunho(chave: string): Promise<Rascunho | undefined> {
  const db = await banco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["rascunhos", "arquivos"]);
    const dados = tx.objectStore("rascunhos").get(chave);
    const foto = tx.objectStore("arquivos").get(chave);
    tx.oncomplete = () => resolve(dados.result && foto.result
      ? { ...dados.result, arquivo: foto.result } : undefined);
    tx.onabort = () => reject(tx.error);
  });
}

export async function salvarRascunho(chave: string, valor?: Rascunho, novaFoto = false) {
  const db = await banco();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["rascunhos", "arquivos"], "readwrite");
    const tabela = tx.objectStore("rascunhos");
    const arquivos = tx.objectStore("arquivos");
    if (valor) {
      const { arquivo, ...dados } = valor;
      if (novaFoto) arquivos.put(arquivo, chave);
      tabela.put(dados, chave);
    } else {
      tabela.delete(chave);
      arquivos.delete(chave);
    }
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });
}

export async function chavesDosRascunhos(usuario: string): Promise<IDBValidKey[]> {
  const db = await banco();
  return new Promise((resolve, reject) => {
    const faixa = IDBKeyRange.bound(usuario + ":", usuario + ":\uffff");
    const req = db.transaction("rascunhos").objectStore("rascunhos").getAllKeys(faixa);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
