import { expect, test } from '@playwright/test'

for (const width of [320, 390, 430]) {
  test('Navegação e álbum em ' + width + ' px', async ({ page }) => {
    await page.setViewportSize({ width, height: 640 })
    await page.goto('/entrar')
    await page.getByRole('link', {name:'Abrir agenda'}).click()
    await page.getByRole('button', {name:'Dom 17'}).click()
    await expect(page.getByText('Dia livre na praia.')).toBeVisible()
    for (const [label, path] of [['Jogos','/ranking'], ['Álbum','/album'], ['Agenda','/agenda']]) {
      const link = page.getByRole('link', {name:label,exact:true})
      await link.focus()
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(new RegExp(path+'$'))
      await page.reload()
      await expect(link).toHaveAttribute('aria-current','page')
    }
    await page.goto('/album')
    const slot = page.getByText('Foto 9 de 9')
    await slot.waitFor({state: "visible"})
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight))
    const photo = await slot.boundingBox()
    const nav = await page.getByRole('navigation').boundingBox()
    expect(photo!.y + photo!.height).toBeLessThan(nav!.y)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width)
  })
}
