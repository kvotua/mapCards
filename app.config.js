import 'dotenv/config';

export default {
  expo: {
    name: "MapMarkers",
    slug: "MapMarkers",
    version: "1.0.0",
    newArchEnabled: false,
    android: {
      config: {
        googleMaps: {
          apiKey: process.env.API_KEY,
        },
      },
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: process.env.PACKAGE,
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    extra: {
      eas: {
        projectId: process.env.EAS_PROJECT_ID,
      },
    },
    owner: process.env.OWNER,
  },
};
