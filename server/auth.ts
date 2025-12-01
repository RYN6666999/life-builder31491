import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "./db";
import { googleUsers } from "@shared/schema";
import { eq } from "drizzle-orm";

// Basic Google scopes for authentication (start simple, add more later)
// Note: Sensitive scopes (blood glucose, blood pressure, reproductive health) 
// require Google verification. Starting with basic profile only.
const GOOGLE_FIT_SCOPES = [
  // User identity - these are non-sensitive and always work
  "profile",
  "email",
];

// Check if Google OAuth is configured
export function isGoogleAuthConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function setupAuth() {
  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const [user] = await db
        .select()
        .from(googleUsers)
        .where(eq(googleUsers.id, id))
        .limit(1);
      done(null, user || null);
    } catch (error) {
      done(error, null);
    }
  });

  // Only set up Google Strategy if credentials are available
  if (!isGoogleAuthConfigured()) {
    console.log("Google OAuth not configured - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required");
    return;
  }

  // Build the full callback URL from environment
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(",")[0];
  const callbackURL = domain 
    ? `https://${domain}/auth/google/callback`
    : "/auth/google/callback";
  
  console.log("Google OAuth callback URL:", callbackURL);

  // Google OAuth2 Strategy with Fitness scopes
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: callbackURL,
        scope: GOOGLE_FIT_SCOPES,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists
          const [existingUser] = await db
            .select()
            .from(googleUsers)
            .where(eq(googleUsers.googleId, profile.id))
            .limit(1);

          if (existingUser) {
            // Update tokens
            const [updatedUser] = await db
              .update(googleUsers)
              .set({
                accessToken,
                refreshToken: refreshToken || existingUser.refreshToken,
                displayName: profile.displayName,
                avatarUrl: profile.photos?.[0]?.value,
                updatedAt: new Date(),
              })
              .where(eq(googleUsers.id, existingUser.id))
              .returning();
            return done(null, updatedUser);
          }

          // Create new user
          const [newUser] = await db
            .insert(googleUsers)
            .values({
              googleId: profile.id,
              email: profile.emails?.[0]?.value || "",
              displayName: profile.displayName,
              avatarUrl: profile.photos?.[0]?.value,
              accessToken,
              refreshToken,
              fitnessScopes: GOOGLE_FIT_SCOPES,
            })
            .returning();

          return done(null, newUser);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );
}

export { GOOGLE_FIT_SCOPES };
