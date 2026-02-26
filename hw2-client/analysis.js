const axios = require("axios");

// Adjustable Values
const ip_a = "34.63.41.168"; // us-central1
const ip_b = "35.195.10.38"; // europe-west1

const url_a = `http://${ip_a}:8080`;
const url_b = `http://${ip_b}:8080`;

const john_list = Array.from({ length: 100 }, (_, i) => `john${i + 1}`);

//helper functions
function gettime() {
  const [s, ns] = process.hrtime();
  return s * 1000 + ns / 1e6;
}

async function postJson(url, body) {
  const response = await axios.post(url, body, {
    headers: { "Content-Type": "application/json" },
    validateStatus: () => true,
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(JSON.stringify(response.data));
  }
  return response;
}

async function getJson(url) {
  const response = await axios.get(url, {
    validateStatus: () => true,
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(JSON.stringify(response.data));
  }
  return response;
}

async function clearDatabase(baseUrl) {
  await postJson(`${baseUrl}/clear`, {});
}

function avg(vals) {
  let sum = 0;

  for (let i = 0; i < vals.length; i++) {
    sum += vals[i];
  }

  return sum / vals.length;
}

//Latency tests

async function measureRegisterLatency(url) {
  const times = [];
  for (let i = 0; i < 10; i++) {
    const username = `john_latency_${url.includes(ip_a) ? "A" : "B"}_${i + 1}`;
    const t0 = gettime();
    await postJson(`${url}/register`, {username});
    const t1 = gettime();
    times.push(t1 - t0);
  }
  return times;
}

async function measureListLatency(url) {
  const times = [];
  for (let i = 0; i <10; i++) {
    const t0 = gettime();
    await getJson(`${url}/list`);
    
    const t1 = gettime();
    times.push(t1 - t0);
  }
  return times;
}

// Eventual Consistency Tests
async function eventualConsistencyTest(urlB, urlA) {
  let misses = 0;

  for (let i = 0; i < 10; i++) {
    const username = john_list[i];

    const postPromise = postJson(`${urlA}/register`, { username });

    const r = await getJson(`${urlB}/list`);
    const users = r.data?.users || [];

    if (!users.includes(username)) {
      misses++;
    }

    await postPromise;
  }

  return misses ;
}

// Run script
async function main() {
  console.log("Instance A:", url_a);
  console.log("Instance B:", url_b);

  console.log("\nClearing databases on both instances");
  await clearDatabase(url_a);
  await clearDatabase(url_b);

  console.log("\nMeasuring /register latency");
  const regA = await measureRegisterLatency(url_a);
  const regB = await measureRegisterLatency(url_b);

  console.log("Measuring /list latency");
  const listA = await measureListLatency(url_a);
  const listB = await measureListLatency(url_b);

  console.log("\nResults (averages):");
  console.log(`A(us-central1) /register avg: ${avg(regA).toFixed(2)} ms`);
  console.log(`B(europe-west1) /register avg: ${avg(regB).toFixed(2)} ms`);
  console.log(`A(us-central1) /list avg:     ${avg(listA).toFixed(2)} ms`);
  console.log(`B(europe-west1) /list avg:     ${avg(listB).toFixed(2)} ms`);

  console.log("\nClearing");
  await clearDatabase(url_a);
  await clearDatabase(url_b);

  console.log(`\nEventual Consistency Test`);
  const ec = await eventualConsistencyTest(url_a, url_b);
  console.log(`Misses: ${ec} / 100`);

  console.log("\nSummary");
  console.log(`Latency
A(us-central1) /register avg: ${avg(regA).toFixed(2)} ms
B(europe-west1) /register avg: ${avg(regB).toFixed(2)} ms
A(us-central1) /list avg: ${avg(listA).toFixed(2)} ms
B(europe-west1) /list avg: ${avg(listB).toFixed(2)} ms

Eventual Consistency
Misses = ${ec} / 100`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});