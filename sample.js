//Linvail invoke trap revise with Laurent
(function () {
    debugger;
    var pass = "temp1234";
    function foo(i) {
        this.i = i
    };
    foo.prototype.getI = function () {
        return this.i;
    };
    var obj = new foo(pass.length);
    console.log(new foo(pass.length).getI());
})()