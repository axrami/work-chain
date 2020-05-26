export interface ILogger {
    debug(msg : string) : void;
    info (msg : string) : void;
    warn (msg : string) : void;
    error(msg : string) : void;
}

export const DefaultLogger : ILogger = {
    debug  : () => {},
    info   : () => {},
    warn   : () => {},
    error  : () => {}
};

export const DebugLogger : ILogger = console;
