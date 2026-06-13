// Use native global fetch


async function run() {
  console.log("Fetching auth token...");
  const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin123@gmail.com', password: 'Admin@123' })
  });
  
  if (!loginRes.ok) {
    console.error("Login failed:", await loginRes.text());
    return;
  }
  
  const { token } = await loginRes.json();
  console.log("Token retrieved.");

  console.log("Calling live /api/network/topology...");
  const topologyRes = await fetch('http://127.0.0.1:5000/api/network/topology', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  console.log("Status:", topologyRes.status);
  const data = await topologyRes.json();
  console.log("Topology Response keys:", Object.keys(data));
  if (data.success) {
    console.log("Nodes count returned by API:", data.nodes.length);
    console.log("Routes count returned by API:", data.routes?.length);
    console.log("Corridors count returned by API:", data.corridors?.length);
    console.log("Stats returned by API:", data.statistics);
  } else {
    console.error("Error:", data);
  }
}

run().catch(console.error);
