import { ExecutableListener } from './executable-listener';

const listener = new ExecutableListener();

listener.onMatch("*", (executable, args) => {
    console.log(executable, args);
});
