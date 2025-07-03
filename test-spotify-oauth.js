// Test the OAuth2 template configuration for Spotify
import {
  applyOAuth2Template,
  OAUTH2_TEMPLATES,
} from "../src/shared/oauth2Templates";

console.log("Testing Spotify OAuth2 Template Configuration...\n");

// Test the Spotify template directly
const spotifyTemplate = OAUTH2_TEMPLATES.spotify;
console.log("Spotify Template:", {
  name: spotifyTemplate.name,
  redirectUriNote: spotifyTemplate.redirectUriNote,
  flow: spotifyTemplate.flow,
  scopes: spotifyTemplate.scopes,
});

// Test the applyOAuth2Template function
const spotifyConfig = applyOAuth2Template("spotify", "test-client-id");
console.log("\nSpotify Applied Config:", {
  redirectUri: spotifyConfig.redirectUri,
  authUrl: spotifyConfig.authUrl,
  flow: spotifyConfig.flow,
  usePKCE: spotifyConfig.usePKCE,
});

// Test a regular template for comparison
const googleConfig = applyOAuth2Template("google", "test-client-id");
console.log("\nGoogle Applied Config (for comparison):", {
  redirectUri: googleConfig.redirectUri,
  authUrl: googleConfig.authUrl,
  flow: googleConfig.flow,
  usePKCE: googleConfig.usePKCE,
});

console.log(
  "\n✅ Test completed! Check that Spotify uses the correct redirect URI format."
);
