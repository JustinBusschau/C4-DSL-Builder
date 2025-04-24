export interface TreeItem {
  dir: string;
  name: string;
  level: number;
  parent: string | null;
  mdFiles: { name: string; content: string }[];
  mmdFiles: { name: string; content: string }[];
  descendants: string[];
}
