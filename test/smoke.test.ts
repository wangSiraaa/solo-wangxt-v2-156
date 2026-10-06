/* 运行时冒烟测试：用 jsdom 提供浏览器全局，Vite SSR 挂载真实 App.vue，
 * Plotly 以桩模块替换（canvas 在 Node 中不可用）。
 * 目的：捕获模板绑定、store 管线、计算属性在真实组件树中的运行时错误。 */
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { renderToString } from '@vue/server-renderer'

const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
  url: 'http://localhost/'
})
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.navigator = dom.window.navigator
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.customElements = dom.window.customElements

// IndexedDB 桩（store 不主动调用；组件 onMounted 中 refreshSchemes 需要）
const idbStub = () => {
  const store = new Map()
  return {
    open: () => ({
      onsuccess: null as any,
      onerror: null as any,
      onupgradeneeded: null as any,
      result: {
        objectStoreNames: { contains: () => true },
        createObjectStore: () => {},
        close: () => {},
        transaction: () => ({
          objectStore: () => ({
            getAll: () => addReq([]),
            put: () => addReq(true),
            delete: () => addReq(true)
          }),
          oncomplete: null as any
        })
      }
    })
  }
  function addReq(result: unknown) {
    const r: any = { onsuccess: null, onerror: null, result }
    queueMicrotask(() => r.onsuccess?.({ target: r }))
    return r
  }
}
// @ts-ignore
globalThis.indexedDB = idbStub()

const server = await createServer({
  server: { middlewareMode: true },
  logLevel: 'error',
  resolve: {
    alias: { 'plotly.js-dist-min': '/test/plotly-stub.ts' }
  }
})

try {
  const stubMod = await server.ssrLoadModule('/test/plotly-stub.ts')
  void stubMod
  const { createApp } = await import('vue')
  const App = (await server.ssrLoadModule('/src/App.vue')).default

  const app = createApp(App)
  const html = await renderToString(app)
  const checks = [
    ['标题渲染', html.includes('多层薄膜')],
    ['膜层编辑器', html.includes('膜层结构')],
    ['默认 MgF₂ 膜层', html.includes('MgF')],
    ['模型边界声明', html.includes('模型能力边界')],
    ['不冒充实测声明', html.includes('真实镀膜')],
    ['单位标注', html.includes('nm')],
    ['角度单位', html.includes('度')]
  ]
  let fails = 0
  for (const [name, ok] of checks) {
    if (!ok) fails++
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  }
  console.log(`渲染 HTML 长度 ${html.length}`)
  console.log(fails === 0 ? '\n组件冒烟测试通过 ✔' : `\n${fails} 项失败 ✘`)
  process.exit(fails ? 1 : 0)
} finally {
  await server.close()
}
