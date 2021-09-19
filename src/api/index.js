import * as server from "./server.js";
const s = server.create();
s.listen(process.env.PORT);
