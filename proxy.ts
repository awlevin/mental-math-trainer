import { clerkMiddleware } from "@clerk/nextjs/server";

// Every route requires a signed-in user; unauthenticated visitors are
// redirected to Clerk's hosted sign-in.
export default clerkMiddleware(async (auth) => {
  await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
