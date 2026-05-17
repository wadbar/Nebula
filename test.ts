import fetch from "node-fetch";

async function test() {
  const res = await fetch("http://127.0.0.1:3000/api/discover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "metallica", type: "video" })
  });
  console.log(await res.text());
}
test();
