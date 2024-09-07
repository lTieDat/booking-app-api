module.exports.haversineDistance = (lat1, lon1, lat2, lon2) => {
  // Earth's radius in kilometers
  const R = 6371;

  // Helper function to convert degrees to radians
  const toRadians = (degrees) => degrees * (Math.PI / 180);

  // Calculate the differences between the coordinates
  const Δlat = toRadians(lat2 - lat1);
  const Δlon = toRadians(lon2 - lon1);

  // Convert the starting coordinates to radians
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);

  // Haversine formula
  const a =
    Math.sin(Δlat / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δlon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Calculate the final distance in kilometers
  return R * c;
};
