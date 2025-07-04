export type MermaidConfig = {
  querySelector: string;
};

export type DocsifyOptions = {
  name: string;
  repo: string;
  loadSidebar: boolean;
  auto2top: boolean;
  homepage: string;
  stylesheet: string;
  supportSearch: boolean;
  mermaidConfig: MermaidConfig;
};
