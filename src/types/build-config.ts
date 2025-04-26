export type BuildConfig = {
  projectName: string;
  homepageName: string;
  rootFolder: string;
  distFolder: string;
  dslCli: 'structurizr-cli' | 'docker';
  workspaceDsl: string;
  embedMermaidDiagrams: boolean;
  pdfCss: string;

  generateWebsite?: boolean; // not used yet
  webTheme?: string; // not used yet
  docsifyTemplate?: string; // not used yet
  repoName?: string; // not used yet
};
