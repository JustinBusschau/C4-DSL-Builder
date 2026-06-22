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
  passwordProtected: boolean;
  passwordHash: string;
  logo: string;
  logoAlign: 'left' | 'center' | 'right';
  logoPosition: 'above' | 'below';

  // Not settable via `config` command - internally managed
  serve: boolean;
  generateWebsite: boolean;
};
