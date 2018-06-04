const Fs = require("fs");
process.stdout.write(Fs.readFileSync(process.argv[2], "utf8").replace(/(release\(membrane\.leave\(|membrane\.enter\(capture\(|capture|release)/g, (match) => {
  switch (match) {
    case "release(membrane.leave(": return "membrane.enter(capture(";
    case "membrane.enter(capture(": return "release(membrane.leave(";
    case "release": return "capture";
    case "capture": return "release";
  }
  throw new Error("Illegal match: "+match);
}));