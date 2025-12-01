import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "./db";
import { googleUsers } from "@shared/schema";
import { eq } from "drizzle-orm";

// Comprehensive Google scopes for holistic bio-data and cloud access
const GOOGLE_FIT_SCOPES = [
  // User identity
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
  // Fitness - Activity & Sleep
  "https://www.googleapis.com/auth/fitness.activity.read",
  "https://www.googleapis.com/auth/fitness.sleep.read",
  // Fitness - Vital Signs
  "https://www.googleapis.com/auth/fitness.heart_rate.read",
  "https://www.googleapis.com/auth/fitness.body_temperature.read",
  "https://www.googleapis.com/auth/fitness.oxygen_saturation.read",
  // Fitness - Health Metrics
  "https://www.googleapis.com/auth/fitness.blood_glucose.read",
  "https://www.googleapis.com/auth/fitness.blood_pressure.read",
  "https://www.googleapis.com/auth/fitness.reproductive_health.read",
  // Cloud Platform (for Vertex AI access)
  "https://www.googleapis.com/auth/cloud-platform.read-only",
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

  // Google OAuth2 Strategy with Fitness scopes
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: "/auth/google/callback",
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
