// controllers/gymController.js - Gym facility controller
const Gym = require("../models/Gym");
const User = require("../models/User");
const axios = require("axios");
const config = require("../config/config");

// Get nearby gyms using Google Maps API
exports.getNearbyGyms = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Get user's location
    const userLocation = user.location.coordinates;
    if (!userLocation || (userLocation[0] === 0 && userLocation[1] === 0)) {
      return res.status(400).json({ msg: "User location not set" });
    }

    // Extract latitude and longitude
    const [longitude, latitude] = userLocation;

    // Maximum distance in kilometers (default: 10km)
    const radius = req.query.radius ? parseInt(req.query.radius) : 10;

    // First, check our database for existing gyms
    const existingGyms = await Gym.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: userLocation,
          },
          $maxDistance: radius * 1000, // Convert to meters
        },
      },
    }).limit(20);

    // If we have enough gyms in our database, return them
    if (existingGyms.length >= 10) {
      return res.json(existingGyms);
    }

    // Otherwise, fetch from Google Maps API
    const googleMapsUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${
      radius * 1000
    }&type=gym&key=${config.googleMapsApiKey}`;

    const response = await axios.get(googleMapsUrl);

    if (response.data.status !== "OK") {
      return res
        .status(400)
        .json({ msg: "Error fetching gym data from Google Maps" });
    }

    // Process the results
    const newGyms = [];
    const existingPlaceIds = existingGyms.map((gym) => gym.placeId);

    for (const place of response.data.results) {
      // Skip if gym already exists in our database
      if (existingPlaceIds.includes(place.place_id)) {
        continue;
      }

      // Create a new gym object
      const newGym = {
        name: place.name,
        address: {
          formattedAddress: place.vicinity,
        },
        location: {
          type: "Point",
          coordinates: [
            place.geometry.location.lng,
            place.geometry.location.lat,
          ],
        },
        placeId: place.place_id,
        photos: place.photos
          ? place.photos.map(
              (photo) =>
                `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${config.googleMapsApiKey}`
            )
          : [],
        isVerified: false,
        isActive: true,
      };

      // Save the new gym to the database
      try {
        const gym = new Gym(newGym);
        await gym.save();
        newGyms.push(gym);
      } catch (err) {
        console.error(`Error saving gym ${place.name}:`, err.message);
        // Continue with the next gym
      }
    }

    // Combine existing and new gyms
    const allGyms = [...existingGyms, ...newGyms];

    res.json(allGyms);
  } catch (err) {
    console.error("Error in getNearbyGyms:", err.message);
    res.status(500).send("Server error");
  }
};

// Get gym details
exports.getGymDetails = async (req, res) => {
  try {
    const gym = await Gym.findById(req.params.id);

    if (!gym) {
      return res.status(404).json({ msg: "Gym not found" });
    }

    // If gym details are incomplete, fetch more details from Google Maps
    if (!gym.phone || !gym.website || !gym.hours) {
      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${gym.placeId}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,review&key=${config.googleMapsApiKey}`;

        const response = await axios.get(detailsUrl);

        if (response.data.status === "OK") {
          const place = response.data.result;

          // Update gym details
          gym.phone = place.formatted_phone_number || gym.phone;
          gym.website = place.website || gym.website;

          // Update hours if available
          if (place.opening_hours && place.opening_hours.periods) {
            const weekdayHours = {};

            for (const period of place.opening_hours.periods) {
              const day = [
                "sunday",
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
              ][period.open.day];
              weekdayHours[day] = {
                open: `${period.open.time.substring(
                  0,
                  2
                )}:${period.open.time.substring(2)}`,
                close: period.close
                  ? `${period.close.time.substring(
                      0,
                      2
                    )}:${period.close.time.substring(2)}`
                  : "24:00",
              };
            }

            gym.hours = weekdayHours;
          }

          await gym.save();
        }
      } catch (err) {
        console.error("Error fetching additional gym details:", err.message);
        // Continue with existing gym data
      }
    }

    res.json(gym);
  } catch (err) {
    console.error("Error in getGymDetails:", err.message);

    // Check if error is due to invalid ObjectId
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Gym not found" });
    }

    res.status(500).send("Server error");
  }
};

// Add a gym to favorites
exports.addGymToFavorites = async (req, res) => {
  try {
    const { gymId } = req.params;

    // Check if the gym exists
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ msg: "Gym not found" });
    }

    // Add gym to favorites if not already added
    const user = await User.findById(req.user.id);

    if (user.favoriteGyms.includes(gymId)) {
      return res.status(400).json({ msg: "Gym already in favorites" });
    }

    user.favoriteGyms.push(gymId);
    await user.save();

    res.json({
      msg: "Gym added to favorites",
      favoriteGyms: user.favoriteGyms,
    });
  } catch (err) {
    console.error("Error in addGymToFavorites:", err.message);
    res.status(500).send("Server error");
  }
};

// Remove a gym from favorites
exports.removeGymFromFavorites = async (req, res) => {
  try {
    const { gymId } = req.params;

    // Remove gym from favorites
    const user = await User.findById(req.user.id);

    const index = user.favoriteGyms.indexOf(gymId);
    if (index === -1) {
      return res.status(400).json({ msg: "Gym not in favorites" });
    }

    user.favoriteGyms.splice(index, 1);
    await user.save();

    res.json({
      msg: "Gym removed from favorites",
      favoriteGyms: user.favoriteGyms,
    });
  } catch (err) {
    console.error("Error in removeGymFromFavorites:", err.message);
    res.status(500).send("Server error");
  }
};

// Get favorited gyms
exports.getFavoriteGyms = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("favoriteGyms");

    res.json(user.favoriteGyms);
  } catch (err) {
    console.error("Error in getFavoriteGyms:", err.message);
    res.status(500).send("Server error");
  }
};

// Add a review to a gym
exports.addGymReview = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { rating, comment } = req.body;

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ msg: "Rating must be between 1 and 5" });
    }

    // Check if the gym exists
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ msg: "Gym not found" });
    }

    // Check if user has already reviewed this gym
    const existingReviewIndex = gym.reviews.findIndex(
      (review) => review.user.toString() === req.user.id
    );

    if (existingReviewIndex !== -1) {
      // Update existing review
      gym.reviews[existingReviewIndex].rating = rating;
      gym.reviews[existingReviewIndex].comment = comment;
      gym.reviews[existingReviewIndex].date = Date.now();
    } else {
      // Add new review
      gym.reviews.push({
        user: req.user.id,
        rating,
        comment,
      });
      gym.totalReviews += 1;
    }

    // Update average rating
    gym.averageRating =
      gym.reviews.reduce((acc, review) => acc + review.rating, 0) /
      gym.reviews.length;

    await gym.save();

    res.json(gym);
  } catch (err) {
    console.error("Error in addGymReview:", err.message);
    res.status(500).send("Server error");
  }
};

// Search gyms by name or address
exports.searchGyms = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ msg: "Search query is required" });
    }

    const gyms = await Gym.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { "address.formattedAddress": { $regex: query, $options: "i" } },
      ],
    }).limit(20);

    res.json(gyms);
  } catch (err) {
    console.error("Error in searchGyms:", err.message);
    res.status(500).send("Server error");
  }
};

// Get instructors associated with a gym
exports.getGymInstructors = async (req, res) => {
  try {
    const { gymId } = req.params;

    // Check if the gym exists
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ msg: "Gym not found" });
    }

    const instructors = await Gym.findById(gymId).populate({
      path: "associatedInstructors",
      populate: {
        path: "user",
        select: "name profileImage",
      },
      select:
        "specializations experience hourlyRate averageRating totalReviews",
    });

    res.json(instructors.associatedInstructors);
  } catch (err) {
    console.error("Error in getGymInstructors:", err.message);
    res.status(500).send("Server error");
  }
};
