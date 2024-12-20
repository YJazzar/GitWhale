export namespace backend {
	
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

}

