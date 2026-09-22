/**
 * Checks the SSE reader in src/lib/gemini.ts against a real HTTP server.
 *
 * The risk this covers: the server flushes one frame per Gemini chunk, but TCP
 * gives the client arbitrary byte boundaries. A naive reader that parses each
 * `read()` in isolation silently drops text whenever a frame is split — which
 * shows up as missing words mid-answer, not as an error.
 *
 *   node --experimental-strip-types test/stream.test.mjs
 */
import assert from "node:assert/strict";
import http from "node:http";

const { getArchitectStream } = await import("../src/lib/gemini.ts");

const CHUNKS = ["Recessed ", "tray ceiling ", "with warm ", "LED coves."];
const EXPECTED = CHUNKS.join("");

/** Serve the chunks, deliberately slicing frames at awkward byte offsets. */
function makeServer(splitMidFrame, mode = "ok") {
  return http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/event-stream" });

    if (mode === "error") {
      res.write(`data: ${JSON.stringify({ error: "upstream exploded" })}\n\n`);
      return res.end();
    }

    let wire = CHUNKS.map((t) => `data: ${JSON.stringify({ text: t })}\n\n`).join("") + "data: [DONE]\n\n";

    if (splitMidFrame) {
      // Emit in 7-byte slices so nearly every frame straddles a read().
      for (let i = 0; i < wire.length; i += 7) res.write(wire.slice(i, i + 7));
    } else {
      res.write(wire);
    }
    res.end();
  });
}

async function collect(port) {
  const original = globalThis.fetch;
  // The client posts to a relative path; point it at the test server.
  globalThis.fetch = (url, init) => original(`http://127.0.0.1:${port}${url}`, init);
  try {
    let out = "";
    for await (const chunk of getArchitectStream([{ role: "user", parts: [{ text: "hi" }] }])) {
      out += chunk.text;
    }
    return out;
  } finally {
    globalThis.fetch = original;
  }
}

async function listen(server) {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return server.address().port;
}

let failures = 0;
const check = async (name, fn) => {
  try {
    await fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures++;
    console.error(`  FAIL ${name}\n       ${err.message}`);
  }
};

console.log("SSE stream reader");

await check("reassembles text when frames arrive whole", async () => {
  const server = makeServer(false);
  const port = await listen(server);
  try {
    assert.equal(await collect(port), EXPECTED);
  } finally {
    server.close();
  }
});

await check("reassembles text when frames are split across reads", async () => {
  const server = makeServer(true);
  const port = await listen(server);
  try {
    assert.equal(await collect(port), EXPECTED);
  } finally {
    server.close();
  }
});

await check("surfaces an error frame as a thrown error", async () => {
  const server = makeServer(false, "error");
  const port = await listen(server);
  try {
    await assert.rejects(() => collect(port), /upstream exploded/);
  } finally {
    server.close();
  }
});

if (failures) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll stream checks passed.");
