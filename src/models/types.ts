export type Work = {
    name     : string;
    func     : (args ?: any) => Promise<any | void>;
    error   ?: Work;
    next    ?: Work;
    value   ?: any;
    tasks   ?: Work[]; // Runnables
    retry   ?: number;
    id      ?: string;
    initialDelay   ?: number;
    retryDelay     ?: (x : number) => number;
}

export type WorkInternal = Work & {
    retry : number;
    id    : string;
    attempted : number;
}

// export type WorkSignature = ({work, options}) => Work;

// export type MethodSignature<T, P> = (params : T) => Promise<P & T>;

// export type WorkSequence = Array<(work ?: {work ?: Work}) => Work>;
