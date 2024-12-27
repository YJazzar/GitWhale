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
	export class AppConfig {
	    filePath: string;
	    openGitRepos: {[key: string]: RepoContext};
	    orderedOpenGitRepos: string[];
	    recentGitRepos: string[];
	
	    static createFrom(source: any = {}) {
	        return new AppConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filePath = source["filePath"];
	        this.openGitRepos = this.convertValues(source["openGitRepos"], RepoContext, true);
	        this.orderedOpenGitRepos = source["orderedOpenGitRepos"];
	        this.recentGitRepos = source["recentGitRepos"];
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
	
	    static createFrom(source: any = {}) {
	        return new StartupDirectoryDiffArgs(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.leftFolderPath = source["leftFolderPath"];
	        this.rightFolderPath = source["rightFolderPath"];
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
	    parentCommitHash: string;
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
	        this.parentCommitHash = source["parentCommitHash"];
	        this.refs = source["refs"];
	        this.commitMessage = source["commitMessage"];
	        this.shortStat = source["shortStat"];
	    }
	}
	
	

}

