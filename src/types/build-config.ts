export type BuildConfig = {
  projectName: string;
  homepageName: string;
  rootFolder: string;
  distFolder: string;
  dslCli: 'structurizr-cli' | 'docker';
  workspaceDsl: string;
  embedMermaidDiagrams: boolean;
  pdfCss: string;
  serve: boolean;
  servePort: number;
  repoName: string;
  webTheme: string;
  generateWebsite: boolean;

  docsifyTemplate?: string; // not used yet
};
