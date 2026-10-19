export const gameModalActions = {
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

  openHandRankings() {
    this.showHandRankings = true;
  },

  closeHandRankings() {
    this.showHandRankings = false;
  },

  openTournamentLevels() {
    if (!this.game?.tournament) return;
    this.showTournamentLevels = true;
  },

  closeTournamentLevels() {
    this.showTournamentLevels = false;
  },
};
