import { html, LitElement } from "lit";

class About extends LitElement {
  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <main class="main">
        <article class="static-article">
          <h1>About</h1>

          <p>
            Pluton Poker is a free, open-source place to play Texas Hold'em with
            friends. It is a hobby project that I build in my spare time because
            I enjoy building software and playing poker.
          </p>

          <p>
            When I was younger, I enjoyed regular home games with friends.
            Eventually, our home game became a weekly league. We started with 6
            to 10 players and grew to more than 20. We even created a points
            system, played seasons of tournaments, and awarded a prize to the
            overall winner at the end of the year. The friendly rivalries and
            the excuse to spend time together were the best parts.
          </p>

          <p>
            As we grew older, friends moved to different countries. We tried to
            keep playing online, but it was surprisingly difficult to find an
            easy way to play together. Online poker was often tied to casino
            accounts, real-money systems, and location-based regulations. I
            started Pluton Poker to bring that home-game table back, wherever
            life has taken us.
          </p>

          <p>
            Pluton Poker uses play money only. It does not accept deposits,
            process withdrawals, award cash prizes, or take a rake. The goal is
            to let friends share a table without moving money through the
            service, opening casino accounts, using a VPN, or working around
            local restrictions.
          </p>

          <p>
            The project is
            <a
              href="https://github.com/eliOcs/poker"
              target="_blank"
              rel="noreferrer"
              >open source on GitHub</a
            >
            for transparency and trust. Bug reports and ideas are welcome. If
            you want to know more about the person building it, visit
            <a href="https://eliocapella.com/" target="_blank" rel="noreferrer"
              >my website</a
            >.
          </p>
        </article>
      </main>
    `;
  }
}

customElements.define("phg-about", About);
