const INDIA_POLYGON = [
  [37.1000, 74.6000], // North J&K
  [34.5000, 78.5000], // NE Kashmir
  [30.5000, 80.0000], // Tibet border
  [29.0000, 80.2000], // West Nepal
  [26.5000, 85.0000], // South Nepal
  [27.0000, 88.0000], // East Nepal / Sikkim
  [28.0000, 88.5000], // North Sikkim
  [27.0000, 89.0000], // Bhutan West
  [27.3000, 92.0000], // Bhutan East
  [28.0000, 91.5000], // Arunachal Pradesh North-West
  [29.4000, 96.0000], // North-East tip
  [28.0000, 97.0000], // North-East border
  [26.5000, 96.5000], // Myanmar border North
  [22.0000, 93.0000], // Myanmar border South
  [21.8000, 92.8000], // Bangladesh border East
  [23.0000, 92.0000], // Mizoram
  [24.0000, 92.0000], // Tripura
  [25.1000, 91.5000], // Meghalaya North
  [25.1000, 89.8000], // West Bengal North-East
  [22.0000, 89.0000], // Sundarbans
  [21.5000, 87.0000], // West Bengal / Odisha border
  [20.0000, 86.0000], // Odisha coast
  [17.5000, 83.5000], // Andhra coast North
  [16.0000, 81.5000], // Andhra coast Central
  [13.5000, 80.5000], // Chennai coast
  [10.0000, 80.2000], // Tamil Nadu South-East
  [9.0000, 80.0000], // Pamban
  [8.0800, 77.5400], // Kanyakumari (South tip)
  [8.5000, 77.0000], // Trivandrum
  [10.0000, 76.0000], // Kerala coast
  [13.0000, 74.5000], // Mangalore
  [16.0000, 73.5000], // Goa
  [19.0000, 72.8000], // Mumbai
  [21.0000, 72.5000], // Surat / Gulf of Khambhat
  [20.5000, 72.0000], // Daman
  [22.2000, 69.0000], // Dwarka
  [23.5000, 68.2000], // Lakhpat (West tip)
  [24.5000, 68.8000], // Rann of Kutch North
  [24.0000, 71.0000], // Gujarat border
  [25.0000, 70.0000], // Rajasthan border South
  [27.0000, 69.5000], // Rajasthan border West
  [28.5000, 72.5000], // Rajasthan border North
  [30.0000, 73.5000], // Punjab border South
  [32.5000, 74.5000], // Punjab border North
  [33.5000, 73.8000], // J&K border South-West
  [34.5000, 73.5000], // J&K border West
];

function isPointInPolygon(point, polygon) {
  const [lat, lng] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > lng) !== (yj > lng))
        && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

const waypoints = [
  [28.6613, 77.2299, 'Delhi Junction'],
  [28.4682, 77.0195, 'Gurugram'],
  [26.9196, 75.7878, 'Jaipur Junction'],
  [26.4561, 74.6295, 'Ajmer Junction'],
  [25.7335, 73.6146, 'Marwar Junction'],
  [24.1728, 72.4226, 'Palanpur Junction'],
  [23.6022, 72.3995, 'Mahesana Junction'],
  [23.0276, 72.6002, 'Ahmedabad Junction'],
  [22.3129, 73.1812, 'Vadodara Junction'],
  [21.7051, 72.9941, 'Bharuch Junction'],
  [21.2044, 72.8406, 'Surat'],
  [20.3752, 72.9132, 'Vapi'],
  [18.9712, 72.8194, 'Mumbai Central'],
  [27.1767, 78.0081, 'Agra Cantt'],
  [26.4499, 80.3319, 'Kanpur Central'],
  [25.4484, 81.8333, 'Prayagraj Junction'],
  [25.5941, 85.1376, 'Patna Junction'],
  [25.2425, 86.9842, 'Mokama Junction'],
  [22.5804, 88.3639, 'Howrah Junction'],
  [28.9845, 77.7064, 'Meerut City'],
  [27.8974, 78.0880, 'Aligarh Junction'],
  [26.8467, 80.9462, 'Lucknow NR'],
  [26.2183, 78.1828, 'Gwalior Junction'],
  [23.2599, 77.4126, 'Bhopal Junction'],
  [21.1458, 79.0882, 'Nagpur Junction'],
  [19.9975, 73.7898, 'Nasik Road'],
  [13.0827, 80.2707, 'Chennai Central'],
  [12.9716, 79.1580, 'Arakkonam Junction'],
  [12.5266, 78.2150, 'Jolarpettai Junction'],
  [12.9698, 77.7500, 'Bangalore City'],
  [17.3850, 78.4867, 'Secunderabad Junction'],
  [16.5062, 80.6480, 'Vijayawada Junction'],
  [15.8281, 78.0373, 'Guntakal Junction'],
  [14.6826, 77.6006, 'Dharmavaram Junction'],
  [20.2961, 85.8245, 'Bhubaneswar'],
  [17.6868, 83.2185, 'Visakhapatnam Junction'],
  [16.3067, 80.4365, 'Vijayawada Junction'],
  [13.6288, 79.4192, 'Renigunta Junction'],
  [29.3919, 76.9635, 'Panipat Junction'],
  [29.9695, 76.8783, 'Ambala Cantt Junction'],
  [30.9010, 75.8573, 'Ludhiana Junction'],
  [31.6340, 74.8723, 'Amritsar Junction'],
  [22.3039, 70.8022, 'Rajkot Junction'],
  [21.7645, 72.1519, 'Jamnagar'],
  [26.1445, 91.7362, 'Guwahati'],
  [26.7500, 94.2167, 'Dibrugarh'],
  [27.4728, 94.9110, 'Tinsukia Junction'],
  [22.3039, 87.3215, 'Kharagpur Junction'],
  [22.2492, 84.8060, 'Rourkela']
];

console.log("Checking waypoints against India polygon:");
let failedCount = 0;
for (const wp of waypoints) {
  const inside = isPointInPolygon([wp[0], wp[1]], INDIA_POLYGON);
  if (!inside) {
    console.log(`❌ OUTSIDE: ${wp[2]} at (${wp[0]}, ${wp[1]})`);
    failedCount++;
  }
}

if (failedCount === 0) {
  console.log("✅ All waypoints are INSIDE the polygon!");
} else {
  console.log(`❌ ${failedCount} waypoints are outside the polygon!`);
}
