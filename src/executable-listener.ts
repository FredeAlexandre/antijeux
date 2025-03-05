import { Glob, type Subprocess } from "bun";

type ExecutableListenerCallback = (args: string[]) => void;

type ExecutableListenerCallbackOnMatch = (executable: string, args: string[]) => void;

class ExecutableListener<T extends string[] | undefined = undefined> {
    private process: Subprocess<"ignore", "pipe", "inherit">;
    private callbacks: Map<T extends string[] ? T[number] : string, ExecutableListenerCallback>;
    private callbacksGlobs: Map<Glob, ExecutableListenerCallbackOnMatch>;

    constructor(watch_list?: T) {
        const watch_list_query = watch_list ? `AND (${watch_list.map(name => `TargetInstance.Name = '${name}'`).join(' OR ')})` : '';

        this.callbacks = new Map();
        this.callbacksGlobs = new Map();
        this.process = Bun.spawn([
            'powershell.exe',
            '-NoProfile',
            '-Command',
            `
            $Query = "SELECT * FROM __InstanceCreationEvent WITHIN 1 WHERE TargetInstance ISA 'Win32_Process' ${watch_list_query}"
            Register-WmiEvent -Query $Query -SourceIdentifier "ProcessCreation" | Out-Null
            while ($true) {
                $event = Wait-Event -SourceIdentifier "ProcessCreation"
                $proc = $event.SourceEventArgs.NewEvent.TargetInstance
                $args = $proc.CommandLine -split ' ' | Select-Object -Skip 1
                Write-Output "$($proc.Name)|$($args -join '|')"
                Remove-Event -SourceIdentifier "ProcessCreation"
            }
            `
        ], {
            onExit(proc, exitCode, signalCode, error) {
                throw new Error(`The "onProcessDetected" function exited with code ${exitCode} and signal ${signalCode} and error ${error}`);
            }
        });

        this.runner();
    }

    private async runner() {
        const decoder = new TextDecoder();

        const reader = this.process.stdout.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const [executable, ...args] = decoder.decode(value).trim().split('|');
                const cb = this.callbacks.get(executable as T extends string[] ? T[number] : string);
                if (cb) cb(args);
                for (const [pattern, callback] of this.callbacksGlobs.entries()) {
                    if (pattern.match(executable)) {
                        callback(executable, args);
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    onMatch(pattern: string, callback: ExecutableListenerCallbackOnMatch) {
        this.callbacksGlobs.set(new Glob(pattern), callback);
    }

    on(executable: T extends string[] ? T[number] : string, callback: ExecutableListenerCallback) {
        this.callbacks.set(executable, callback);
    }

    off(executable: T extends string[] ? T[number] : string) {
        this.callbacks.delete(executable);
    }
}

export { ExecutableListener }
