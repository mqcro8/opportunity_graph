export class EmptyProfileError extends Error {
  constructor(profileId: string) {
    super(
      `Profile ${profileId} has no graph nodes. ` +
        "Complete your profile to see recommendations."
    );
    this.name = "EmptyProfileError";
  }
}
