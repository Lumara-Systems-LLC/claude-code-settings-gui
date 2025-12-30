export type DirectorySize = {
  name: string;
  path: string;
  sizeBytes: number;
  sizeHuman: string;
  itemCount: number;
};

export type StorageStats = {
  totalSize: string;
  totalBytes: number;
  directories: DirectorySize[];
  ephemeralDirectories: DirectorySize[];
  lastCleanup?: string;
};

export type GitStatus = {
  branch: string;
  isClean: boolean;
  modified: string[];
  staged: string[];
  untracked: string[];
};

export type GitDiff = {
  file: string;
  diff: string;
};
