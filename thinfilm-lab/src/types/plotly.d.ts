declare module 'plotly.js-dist-min' {
  export interface PlotlyHTMLElement extends HTMLElement {
    on(
      event: 'plotly_click',
      cb: (ev: { points: { x: number; y: number }[] }) => void,
    ): void
  }
  const Plotly: {
    react(
      el: HTMLElement,
      data: Record<string, unknown>[],
      layout?: Record<string, unknown>,
      config?: Record<string, unknown>,
    ): Promise<PlotlyHTMLElement>
    purge(el: HTMLElement): void
  }
  export default Plotly
}
