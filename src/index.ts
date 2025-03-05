import { ExecutableListener } from './executable-listener';
import { kill } from './kill';

console.log("Antijeux");

const listener = new ExecutableListener(["RocketLeague.exe", "VALORANT-Win64-Shipping.exe"] as const);

listener.on("RocketLeague.exe", handleGame("RocketLeague.exe"));
listener.on("VALORANT-Win64-Shipping.exe", handleGame("VALORANT-Win64-Shipping.exe"));

function handleGame(executable: string) {
    return () => {
        console.log("Executable ", executable, " is trying to launch");
        if (!canPlay()) {
            console.log("Executable ", executable, " is trying to launch but can't play");
            kill(executable);
        } else {
            console.log("Executable ", executable, " is trying to launch and can play");
        }
    }
}

function canPlay() {
    return false;
}
