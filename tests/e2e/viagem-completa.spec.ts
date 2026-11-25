import {test,expect,devices,webkit} from '@playwright/test'
import {randomBytes,createHash} from 'node:crypto'
import {prepararJogos} from '../fixtures/jogos'

test('dois viajantes acompanham a mesma foto e o aviso da viagem',async({browser})=>{
  test.setTimeout(150000)
  const iphone=await webkit.launch({channel:''}),f=await prepararJogos()
  const base=process.env.PRAIA_TEST_ORIGIN||'http://127.0.0.1:4174'
  try{
    for(let i=3;i<=9;i++)await f.completarPerfil(i)
    const entrar=async(admin:boolean)=>{
      const token=randomBytes(32).toString('hex')
      expect((await f.admin.from('convites_viajante').insert({hash:createHash('sha256').update(token).digest('hex'),viagem_id:f.viagem,organizador:admin})).error).toBeNull()
      const p=await (admin?iphone:browser).newPage(devices[admin?'iPhone 13':'Pixel 7'])
      await p.goto(base+'/entrar#convite='+token)
      await p.getByLabel('Seu nome').selectOption(admin?'1':'2')
      await p.getByLabel('Escolher da galeria').setInputFiles('public/praia.jpg')
      await p.getByRole('button',{name:'Entrar na viagem'}).click()
      await p.getByRole('link',{name:'Álbum',exact:true}).click()
      return p
    }
    const org=await entrar(true),familiar=await entrar(false)
    await familiar.getByRole('button',{name:'Da família'}).click()
    await org.getByRole('button',{name:'Abrir foto 1 de 9',exact:true}).click()
    await org.getByLabel('Escolher da galeria').setInputFiles('public/praia.jpg')
    await org.getByLabel('Legenda (opcional)').fill('Primeiro dia de praia')
    await org.getByRole('button',{name:'Enviar foto'}).click()
    await expect(org.getByText('1 de 9 fotos enviadas')).toBeVisible()
    await expect(familiar.getByText('Primeiro dia de praia')).toBeVisible({timeout:15000})
    await familiar.locator('.quadro').first().click()
    const imagem=familiar.getByRole('dialog').getByRole('img')
    await expect.poll(()=>imagem.evaluate((e:HTMLImageElement)=>e.naturalWidth)).toBeGreaterThan(0)
    await familiar.getByRole('button',{name:'Fechar foto'}).click()
    await familiar.getByRole('button',{name:'Notificações',exact:true}).click()
    await expect(familiar.locator('.caixa-avisos>a')).toHaveCount(1)
    await familiar.close()
  }finally{
    await iphone.close()
    const itens=await f.admin.from('tentativas_foto').select('id').eq('viagem_id',f.viagem)
    if(itens.data?.length)await f.admin.storage.from('album-privado').remove(itens.data.flatMap(t=>[t.id+'/foto.jpg',t.id+'/mini.jpg']))
    await f.limpar()
  }
})
