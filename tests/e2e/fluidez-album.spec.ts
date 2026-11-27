import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { prepararJogos } from "../fixtures/jogos";
import { readFileSync } from "node:fs";
const cores = Object.keys(JSON.parse(readFileSync("src/features/album/paginas.json", "utf8")));

test("dez viradas no livro completo", async ({ browser }) => {
  const base = process.env.OHANA_BENCH_ORIGIN;
  test.skip(!base, "Requer a prévia local de produção.");
  test.setTimeout(100000);
  const f = await prepararJogos();
  const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  try {
    await page.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:f.storageKey,session:f.org.session});
    const fotos = cores.flatMap((cor, i) => Array.from({length:9}, (_,j)=>({
      cor,vaga:i+1,posicao:j+1,versao:1,legenda:cor+" "+(j+1),
      mini:"/amostra/"+(i*9+j),foto:"/ampliada/"+(i*9+j),
    })));
    const miniaturas: Buffer[] = [];
    for (let i=0;i<fotos.length;i++) miniaturas.push(await sharp("public/praia.jpg").resize(360,240)
      .modulate({hue:i*3}).jpeg({quality:78}).toBuffer());
    const atraso = Number(process.env.OHANA_BENCH_LATENCIA ?? 0);
    let pedidas = 0, ampliadas = 0;
    await page.route("**/amostra/*", async route=>{
      pedidas++;
      if (atraso) await new Promise(resolve => setTimeout(resolve, atraso));
      await route.fulfill({contentType:"image/jpeg",body:miniaturas[Number(route.request().url().split("/").pop())]});
    });
    await page.route("**/ampliada/*",route=>{ampliadas++;return route.abort();});
    await page.route("**/api/fotos?colecao=familia",route=>route.fulfill({json:fotos}));
    await page.goto(base + "/album?familia=1");
    await page.getByText("Página 1 de 26").waitFor();
    await page.locator('[data-ativa=true] img').evaluateAll(async imgs=>Promise.all(imgs.map(img=>(img as HTMLImageElement).decode())));
    const abertura = await page.evaluate(()=>performance.now());
    const iniciais = pedidas;
    const livro = page.locator(".marinho-livro");
    const caixa = (await livro.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const toque = (type:"touchStart"|"touchMove"|"touchEnd",x?:number)=>cdp.send("Input.dispatchTouchEvent",{
      type,touchPoints:x===undefined?[]:[{x:caixa.x+x*caixa.width,y:caixa.y+.55*caixa.height}]
    });
    const medicao = await page.evaluateHandle(()=>{
      const intervalos:number[]=[], longas:number[]=[];
      let anterior=0, quadro=0;
      function contar(t:number){if(anterior)intervalos.push(t-anterior);anterior=t;quadro=requestAnimationFrame(contar);}
      const obs=new PerformanceObserver(lista=>longas.push(...lista.getEntries().map(e=>e.duration)));
      obs.observe({entryTypes:["longtask"]});
      quadro=requestAnimationFrame(contar);
      const viradas: {pagina:number; pior:number}[] = [];
      let inicio = 0;
      return { marcar(pagina:number) {
        viradas.push({pagina,pior:Math.max(...intervalos.slice(inicio))});
        inicio=intervalos.length;
      }, terminar(){cancelAnimationFrame(quadro);obs.disconnect();return {intervalos,longas,viradas};}};
    });
    for(let n=1;n<=10;n++){
      const assentou = page.waitForFunction(numero => document.querySelector(".marinho-controles span")?.textContent === "Página "+numero+" de 26",n+1,{polling:"raf"});
      await toque("touchStart",.83);
      for(const x of (n===5?[.71,.54,.62,.43,.28]:[.71,.61,.5,.39,.28])) await toque("touchMove",x);
      await toque("touchEnd");
      await assentou;
      await medicao.evaluate((m,n)=>m.marcar(n),n+1);
    }
    const {intervalos,longas,viradas}=await medicao.evaluate(m=>m.terminar());
    const ordenados=[...intervalos].sort((a,b)=>a-b);
    console.log(JSON.stringify({atraso,viradas,navegador:browser.version(),aberturaMs:Math.round(abertura),miniaturasIniciais:iniciais,
      amostras:intervalos.length,dentroDe16_7:intervalos.filter(ms=>ms<=16.70001).length,
      p95:ordenados[Math.floor(.95*ordenados.length)],pior:Math.max(...intervalos),longas,
      miniaturasSolicitadas:pedidas,ampliadas}));
    expect(ampliadas).toBe(0);
    await expect(livro.locator(".marinho-folha")).toHaveCount(3);
  } finally {await page.close();await f.limpar();}
});
