var f = function foo (check) {
    check && foo()
};
f(true);