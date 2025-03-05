function kill(executable: string) {
    const process = Bun.spawnSync(["taskkill", "/IM", executable, "/F"]);
    if (process.exitCode !== 0) {
        throw new Error(`Failed to kill ${executable}`);
    }
}

export { kill }


