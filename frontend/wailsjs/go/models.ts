export namespace backend {
	
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
	    directoryDiff: StartupDirectoryDiffArgs;
	
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

