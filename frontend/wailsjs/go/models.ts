export namespace backend {
	
	export class RepoContext {
	    currentBranchName: string;
	
	    static createFrom(source: any = {}) {
	        return new RepoContext(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.currentBranchName = source["currentBranchName"];
	    }
	}
	export class TerminalSettings {
	    defaultCommand: string;
	    fontSize: number;
	    colorScheme: string;
	    cursorStyle: string;
	
	    static createFrom(source: any = {}) {
	        return new TerminalSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.defaultCommand = source["defaultCommand"];
	        this.fontSize = source["fontSize"];
	        this.colorScheme = source["colorScheme"];
	        this.cursorStyle = source["cursorStyle"];
	    }
	}
	export class GitSettings {
	    commitsToLoad: number;
	
	    static createFrom(source: any = {}) {
	        return new GitSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.commitsToLoad = source["commitsToLoad"];
	    }
	}
	export class AppSettings {
	    git: GitSettings;
	    terminal: TerminalSettings;
	
	    static createFrom(source: any = {}) {
	        return new AppSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.git = this.convertValues(source["git"], GitSettings);
	        this.terminal = this.convertValues(source["terminal"], TerminalSettings);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class AppConfig {
	    filePath: string;
	    settings: AppSettings;
	    openGitRepos: Record<string, RepoContext>;
	    orderedOpenGitRepos: string[];
	    recentGitRepos: string[];
	    starredGitRepos: string[];
	
	    static createFrom(source: any = {}) {
	        return new AppConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filePath = source["filePath"];
	        this.settings = this.convertValues(source["settings"], AppSettings);
	        this.openGitRepos = this.convertValues(source["openGitRepos"], RepoContext, true);
	        this.orderedOpenGitRepos = source["orderedOpenGitRepos"];
	        this.recentGitRepos = source["recentGitRepos"];
	        this.starredGitRepos = source["starredGitRepos"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class StartupDirectoryDiffArgs {
	    leftFolderPath: string;
	    rightFolderPath: string;
	    IsFileDiff: boolean;
	    ShouldSendNotification: boolean;
	    ShouldStartFileWatcher: boolean;
	
	    static createFrom(source: any = {}) {
	        return new StartupDirectoryDiffArgs(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.leftFolderPath = source["leftFolderPath"];
	        this.rightFolderPath = source["rightFolderPath"];
	        this.IsFileDiff = source["IsFileDiff"];
	        this.ShouldSendNotification = source["ShouldSendNotification"];
	        this.ShouldStartFileWatcher = source["ShouldStartFileWatcher"];
	    }
	}
	export class StartupState {
	    directoryDiff?: StartupDirectoryDiffArgs;
	
	    static createFrom(source: any = {}) {
	        return new StartupState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.directoryDiff = this.convertValues(source["directoryDiff"], StartupDirectoryDiffArgs);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class App {
	    isLoading: boolean;
	    startupState?: StartupState;
	    appConfig?: AppConfig;
	
	    static createFrom(source: any = {}) {
	        return new App(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.isLoading = source["isLoading"];
	        this.startupState = this.convertValues(source["startupState"], StartupState);
	        this.appConfig = this.convertValues(source["appConfig"], AppConfig);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	export class DiffOptions {
	    repoPath: string;
	    fromRef: string;
	    toRef: string;
	    filePaths: string[];
	    contextLines: number;
	
	    static createFrom(source: any = {}) {
	        return new DiffOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.repoPath = source["repoPath"];
	        this.fromRef = source["fromRef"];
	        this.toRef = source["toRef"];
	        this.filePaths = source["filePaths"];
	        this.contextLines = source["contextLines"];
	    }
	}
	export class DiffSession {
	    sessionId: string;
	    repoPath: string;
	    fromRef: string;
	    toRef: string;
	    leftPath: string;
	    rightPath: string;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    lastAccessed: any;
	    title: string;
	
	    static createFrom(source: any = {}) {
	        return new DiffSession(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sessionId = source["sessionId"];
	        this.repoPath = source["repoPath"];
	        this.fromRef = source["fromRef"];
	        this.toRef = source["toRef"];
	        this.leftPath = source["leftPath"];
	        this.rightPath = source["rightPath"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.lastAccessed = this.convertValues(source["lastAccessed"], null);
	        this.title = source["title"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class FileInfo {
	    Path: string;
	    Name: string;
	    Extension: string;
	    LeftDirAbsPath: string;
	    RightDirAbsPath: string;
	
	    static createFrom(source: any = {}) {
	        return new FileInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Path = source["Path"];
	        this.Name = source["Name"];
	        this.Extension = source["Extension"];
	        this.LeftDirAbsPath = source["LeftDirAbsPath"];
	        this.RightDirAbsPath = source["RightDirAbsPath"];
	    }
	}
	export class Directory {
	    Path: string;
	    Name: string;
	    Files: FileInfo[];
	    SubDirs: Directory[];
	
	    static createFrom(source: any = {}) {
	        return new Directory(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Path = source["Path"];
	        this.Name = source["Name"];
	        this.Files = this.convertValues(source["Files"], FileInfo);
	        this.SubDirs = this.convertValues(source["SubDirs"], Directory);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class GitLogCommitInfo {
	    commitHash: string;
	    username: string;
	    userEmail: string;
	    commitTimeStamp: string;
	    authoredTimeStamp: string;
	    parentCommitHashes: string[];
	    refs: string;
	    commitMessage: string[];
	    shortStat: string;
	
	    static createFrom(source: any = {}) {
	        return new GitLogCommitInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.commitHash = source["commitHash"];
	        this.username = source["username"];
	        this.userEmail = source["userEmail"];
	        this.commitTimeStamp = source["commitTimeStamp"];
	        this.authoredTimeStamp = source["authoredTimeStamp"];
	        this.parentCommitHashes = source["parentCommitHashes"];
	        this.refs = source["refs"];
	        this.commitMessage = source["commitMessage"];
	        this.shortStat = source["shortStat"];
	    }
	}
	export class GitLogOptions {
	    commitsToLoad: number;
	    fromRef: string;
	    toRef: string;
	    includeMerges: boolean;
	    searchQuery: string;
	    author: string;
	
	    static createFrom(source: any = {}) {
	        return new GitLogOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.commitsToLoad = source["commitsToLoad"];
	        this.fromRef = source["fromRef"];
	        this.toRef = source["toRef"];
	        this.includeMerges = source["includeMerges"];
	        this.searchQuery = source["searchQuery"];
	        this.author = source["author"];
	    }
	}
	export class GitRef {
	    name: string;
	    type: string;
	    hash: string;
	    isHead: boolean;
	
	    static createFrom(source: any = {}) {
	        return new GitRef(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.type = source["type"];
	        this.hash = source["hash"];
	        this.isHead = source["isHead"];
	    }
	}
	
	
	
	
	export class TTYSize {
	    cols: number;
	    rows: number;
	
	    static createFrom(source: any = {}) {
	        return new TTYSize(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cols = source["cols"];
	        this.rows = source["rows"];
	    }
	}

}

