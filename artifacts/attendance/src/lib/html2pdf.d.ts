declare module "html2pdf.js" {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: Record<string, unknown>;
    jsPDF?: { unit?: string; format?: string | number[]; orientation?: string };
    pagebreak?: { mode?: string | string[]; before?: string; after?: string; avoid?: string };
  }
  interface Html2PdfChain {
    set(options: Html2PdfOptions): Html2PdfChain;
    from(element: HTMLElement | string): Html2PdfChain;
    save(): Promise<void>;
    output(type: "blob"): Promise<Blob>;
    outputPdf(type: "blob"): Promise<Blob>;
  }
  function html2pdf(): Html2PdfChain;
  export = html2pdf;
}
