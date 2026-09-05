export const gameModalActions = {
  openAccount() {
    if (!this.user?.id) return;
    this.dispatchEvent(
      new CustomEvent("navigate", {
        detail: { path: `/players/${this.user.id}` },
        bubbles: true,
      }),
    );
  },

  openSettings() {
    this.dispatchEvent(new CustomEvent("open-settings", { bubbles: true }));
  },

  openSignIn() {
    this.dispatchEvent(new CustomEvent("open-sign-in", { bubbles: true }));
  },

  openSignUp() {
    this.dispatchEvent(new CustomEvent("open-sign-up", { bubbles: true }));
  },

  openRanking() {
    if (!this.hasRecordedHands()) return;
    this.showRanking = true;
  },

  closeRanking() {
    this.showRanking = false;
  },

  openTournamentLevels() {
    if (!this.game?.tournament) return;
    this.showTournamentLevels = true;
  },

  closeTournamentLevels() {
    this.showTournamentLevels = false;
  },
};
