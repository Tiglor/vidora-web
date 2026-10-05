/**
 * 可选主题包清单。顺序即 UI 上的展示顺序。
 *
 * 加一个主题要同步改三处（详见 src/styles/themes.css 顶部注释）：
 * 这里的 THEME_OPTIONS、themes.css 的 [data-theme] 块、index.html 内联脚本的 VALID 数组。
 * 第三处是内联的，因为防首屏闪色的脚本必须在绘制前同步执行，import 不到这个模块。
 */
export const DEFAULT_THEME = 'light-blue'

export const THEME_OPTIONS = [
  { key: 'light-blue', label: '浅蓝', color: '#00aeec' },
  { key: 'pink', label: '粉色', color: '#fb7299' },
  { key: 'green', label: '青绿', color: '#42b883' },
  { key: 'purple', label: '紫罗兰', color: '#7c4dff' },
  { key: 'orange', label: '暖橙', color: '#ff7043' }
]

/**
 * 认不出的 key 一律落回默认。
 *
 * 触发场景：localStorage 里留着已下线主题的旧值，或者后端存了一个前端还没发布的 key
 * （后端刻意不校验枚举，就是为了加主题不用发版）。不兜这一层的话 data-theme 会挂上
 * 一个没有对应 CSS 块的值，虽然 :root 兜底不会白屏，但界面上会显示不出「当前选中哪个」。
 */
export function normalizeThemeKey(key) {
  return THEME_OPTIONS.some((t) => t.key === key) ? key : DEFAULT_THEME
}
