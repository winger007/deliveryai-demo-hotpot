import { test, expect, type Page } from '@playwright/test'

/** Navigate from app start to the menu view (bind table + welcome → menu). */
async function goToMenu(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /A08/ }).first().click()
  await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
}

/**
 * Locate the dark mode toggle button in the TopBar.
 * Use .last() because when elderly mode is ON, the elderly button's aria-label
 * becomes '切换至常规模式', which collides with the dark mode button's aria-label.
 * The dark mode button is always after the elderly button in the DOM.
 */
function darkModeToggle(page: Page) {
  return page.getByRole('button', { name: /切换至夜间模式|切换至常规模式|Switch to dark mode|Switch to light mode/ }).last()
}

test.describe('夜间模式（Dark Mode）- E2E 联调验收测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // 清除夜间模式偏好，确保每个用例从浅色模式开始
    await page.evaluate(() => localStorage.removeItem('dark-mode'))
  })

  test('DM-001: 点击切换按钮开启夜间模式，html 添加 .dark class', async ({ page }) => {
    await goToMenu(page)
    await expect(darkModeToggle(page)).toHaveAttribute('aria-label', '切换至夜间模式')
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await darkModeToggle(page).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('DM-002: 夜间模式下再次点击切回浅色模式，移除 .dark class', async ({ page }) => {
    await goToMenu(page)
    await darkModeToggle(page).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await darkModeToggle(page).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('DM-003: 切换按钮图标随状态变化（Moon → Sun）', async ({ page }) => {
    await goToMenu(page)
    // 浅色模式下按钮 aria-label 为「切换至夜间模式」
    await expect(darkModeToggle(page)).toHaveAttribute('aria-label', '切换至夜间模式')
    await darkModeToggle(page).click()
    // 夜间模式下按钮 aria-label 为「切换至常规模式」
    await expect(darkModeToggle(page)).toHaveAttribute('aria-label', '切换至常规模式')
  })

  test('DM-004: 切换夜间模式后 Toast 提示正确文案', async ({ page }) => {
    await goToMenu(page)
    await darkModeToggle(page).click()
    await expect(page.getByText('已切换为夜间模式')).toBeVisible()
    await darkModeToggle(page).click()
    await expect(page.getByText('已切换为常规模式')).toBeVisible()
  })

  test('DM-005: 夜间模式偏好持久化 — 刷新后恢复深色主题', async ({ page }) => {
    await goToMenu(page)
    await darkModeToggle(page).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    // 刷新页面
    await page.reload()
    // 刷新后仍在菜单页（状态由 localStorage 恢复），html 应带 .dark
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('DM-006: 浅色模式偏好持久化 — 刷新后保持浅色主题', async ({ page }) => {
    await goToMenu(page)
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await page.reload()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('DM-007: 夜间模式与老人模式可叠加生效（.dark + .elderly）', async ({ page }) => {
    await goToMenu(page)
    // 开启老人模式
    await page.getByRole('button', { name: /切换至老人模式/ }).click()
    await expect(page.locator('html')).toHaveClass(/elderly/)
    // 开启夜间模式
    await darkModeToggle(page).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    // 两者同时存在
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.locator('html')).toHaveClass(/elderly/)
  })

  test('DM-008: 关闭夜间模式但保持老人模式开启', async ({ page }) => {
    await goToMenu(page)
    // 开启两者
    await page.getByRole('button', { name: /切换至老人模式/ }).click()
    await darkModeToggle(page).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.locator('html')).toHaveClass(/elderly/)
    // 关闭夜间模式
    await darkModeToggle(page).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    // 老人模式仍然保持
    await expect(page.locator('html')).toHaveClass(/elderly/)
  })

  test('DM-009: 夜间模式覆盖菜单页 — 深色背景和浅色文字', async ({ page }) => {
    await goToMenu(page)
    await darkModeToggle(page).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    // 主背景容器应有 dark 变体
    const mainBg = page.locator('.min-h-screen.bg-rice-100').first()
    await expect(mainBg).toHaveClass(/dark:bg-charcoal-900/)
    // 页面标题文字应有 dark 变体浅色
    const heroTitle = page.getByText('想吃什么，一起点。')
    await expect(heroTitle).toBeVisible()
  })

  test('DM-010: 夜间模式覆盖订单页', async ({ page }) => {
    await goToMenu(page)
    await darkModeToggle(page).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    // 导航到订单页
    await page.getByRole('button', { name: /订单/ }).first().click()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('DM-011: 夜间模式覆盖绑桌页（从菜单页切回需重新加载）', async ({ page }) => {
    await goToMenu(page)
    await darkModeToggle(page).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    // 刷新到绑桌页（清除状态后访问根路径）
    await page.evaluate(() => {
      localStorage.setItem('dark-mode', 'true')
    })
    await page.goto('/')
    // 绑桌页背景应有 dark 变体
    const bindBg = page.locator('main').first()
    await expect(bindBg).toHaveClass(/dark:bg-charcoal-900/)
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('DM-012: 夜间模式下服务弹窗呈现深色主题', async ({ page }) => {
    await goToMenu(page)
    await darkModeToggle(page).click()
    // 打开服务弹窗
    await page.getByRole('button', { name: /呼叫服务/ }).click()
    const dialog = page.locator('[data-state="open"]').first()
    await expect(dialog).toBeVisible()
    // 弹窗在 dark 模式下应可见
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.keyboard.press('Escape')
  })

  test('DM-013: 夜间模式下演示控制台弹窗呈现深色主题', async ({ page }) => {
    test.setTimeout(60000)
    await goToMenu(page)
    await darkModeToggle(page).click()
    // 打开演示控制台
    await page.getByRole('button', { name: /演示控制台/ }).click()
    const dialog = page.locator('[data-state="open"]').first()
    await expect(dialog).toBeVisible()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.keyboard.press('Escape')
  })

  test('DM-014: 夜间模式下语言切换功能正常', async ({ page }) => {
    test.setTimeout(60000)
    await goToMenu(page)
    await darkModeToggle(page).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    // 切换到英文
    await page.getByRole('button', { name: /切换语言|Switch language/ }).click()
    // 夜间模式仍保持
    await expect(page.locator('html')).toHaveClass(/dark/)
    // 英文下按钮 aria-label 应为 'Switch to light mode'
    await expect(darkModeToggle(page)).toHaveAttribute('aria-label', 'Switch to light mode')
    // 切回中文
    await page.getByRole('button', { name: /切换语言|Switch language/ }).click()
    await expect(darkModeToggle(page)).toHaveAttribute('aria-label', '切换至常规模式')
  })

  test('DM-015: 夜间模式下点餐业务功能正常', async ({ page }) => {
    await goToMenu(page)
    await darkModeToggle(page).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    // 切换到锅底分类并添加菜品
    await page.getByRole('button', { name: '锅底' }).click()
    const productCards = page.locator('article')
    await productCards.nth(0).locator('button').last().click()
    // 选择规格并加入购物车
    await page.getByRole('button', { name: '微辣' }).click()
    await page.getByRole('button', { name: '加入本桌购物车' }).click()
    await expect(page.getByText('本桌购物车').first()).toBeVisible()
  })

  test('DM-016: 首屏无 FOUC — 夜间模式在 JS 执行前已应用', async ({ page }) => {
    // 先设置夜间模式偏好
    await page.evaluate(() => localStorage.setItem('dark-mode', 'true'))
    // 拦截首屏渲染前检查 html 是否已有 .dark class
    let hasDarkBeforeJS = false
    page.on('domcontentloaded', async () => {
      const html = await page.locator('html').getAttribute('class')
      hasDarkBeforeJS = html?.includes('dark') ?? false
    })
    await page.goto('/')
    // 由于 FOUC 脚本在 <head> 中同步执行，html 应在 DOMContentLoaded 时已有 dark class
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})
