/// <reference types="vite/client" />

declare module 'plotly.js-dist-min' {
  import type { Data, Layout, Config, PlotlyHTMLElement } from 'plotly.js'
  const Plotly: {
    newPlot: (root: HTMLElement, data: Data[], layout?: Partial<Layout>, config?: Partial<Config>) => Promise<PlotlyHTMLElement>
    react: (root: HTMLElement, data: Data[], layout?: Partial<Layout>, config?: Partial<Config>) => Promise<PlotlyHTMLElement>
    Plots: { resize: (root: HTMLElement) => void }
    purge: (root: HTMLElement) => void
  }
  export default Plotly
}
