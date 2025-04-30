export type BuildConfig = {
  // Settable via `config` command
  projectName: string;
  homepageName: string;
  rootFolder: string;
  distFolder: string;
  embedMermaidDiagrams: boolean;
  dslCli: 'structurizr-cli' | 'docker';
  workspaceDsl: string;
  pdfCss: string;
  servePort: number;
  repoName: string;
  webTheme: string;
  webSearch: boolean;
  docsifyTemplate: string;

  // Not settable via `config` command - internally managed
  serve: boolean;
  generateWebsite: boolean;
};
