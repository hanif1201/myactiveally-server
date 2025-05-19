// utils/geocode.js - Google Maps API utilities
const axios = require("axios");
const config = require("../config/config");

// Convert address to coordinates (geocoding)
exports.geocodeAddress = async (address) => {
  try {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${config.googleMapsApiKey}`;

    const response = await axios.get(geocodeUrl);

    if (response.data.status !== "OK") {
      throw new Error(`Geocoding error: ${response.data.status}`);
    }

    const location = response.data.results[0].geometry.location;
    const formattedAddress = response.data.results[0].formatted_address;

    return {
      coordinates: [location.lng, location.lat], // GeoJSON format [longitude, latitude]
      formattedAddress,
    };
  } catch (err) {
    console.error("Error in geocodeAddress:", err.message);
    throw err;
  }
};

// Convert coordinates to address (reverse geocoding)
exports.reverseGeocode = async (coordinates) => {
  try {
    const [longitude, latitude] = coordinates;
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${config.googleMapsApiKey}`;

    const response = await axios.get(geocodeUrl);

    if (response.data.status !== "OK") {
      throw new Error(`Reverse geocoding error: ${response.data.status}`);
    }

    const formattedAddress = response.data.results[0].formatted_address;

    return {
      formattedAddress,
    };
  } catch (err) {
    console.error("Error in reverseGeocode:", err.message);
    throw err;
  }
};

// Calculate distance between two coordinates (in kilometers)
exports.calculateDistance = (coords1, coords2) => {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;

  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

// Find nearby places by type
exports.findNearbyPlaces = async (coordinates, type, radius = 5000) => {
  try {
    const [longitude, latitude] = coordinates;
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${type}&key=${config.googleMapsApiKey}`;

    const response = await axios.get(placesUrl);

    if (
      response.data.status !== "OK" &&
      response.data.status !== "ZERO_RESULTS"
    ) {
      throw new Error(`Places search error: ${response.data.status}`);
    }

    return response.data.results;
  } catch (err) {
    console.error("Error in findNearbyPlaces:", err.message);
    throw err;
  }
};

// Get place details
exports.getPlaceDetails = async (placeId) => {
  try {
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,geometry,photos&key=${config.googleMapsApiKey}`;

    const response = await axios.get(detailsUrl);

    if (response.data.status !== "OK") {
      throw new Error(`Place details error: ${response.data.status}`);
    }

    return response.data.result;
  } catch (err) {
    console.error("Error in getPlaceDetails:", err.message);
    throw err;
  }
};
