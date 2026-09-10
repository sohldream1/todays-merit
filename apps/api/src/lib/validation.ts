import { z } from "zod";

// A literal `true` requirement — sent unchecked or omitted fails
// validation, so this can't be satisfied by a client that doesn't render
// the checkbox. Shared by every endpoint that creates a User account
// (signup/*, team invite acceptance).
export const agreedToTermsSchema = z.literal(true, {
  errorMap: () => ({ message: "You must agree to the Terms of Service and Privacy Policy" }),
});
