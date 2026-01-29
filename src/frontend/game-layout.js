import { css } from "lit";

/**
 * CSS for seat and bet indicator positioning around the poker table.
 * Layout: 3 top, 2 right, 2 bottom, 2 left (matching standard 9-max poker table)
 */
export const seatPositions = css`
  phg-seat {
    position: absolute;
    z-index: 1;
  }

  /* === DESKTOP LAYOUT (9 seats evenly distributed around oval) === */
  @media (width >= 800px) {
    phg-seat[data-seat="0"] {
      top: 14%;
      left: 11%;
    }
    phg-seat[data-seat="1"] {
      top: 12%;
      left: 50%;
      transform: translateX(-50%);
    }
    phg-seat[data-seat="2"] {
      top: 14%;
      right: 11%;
    }

    /* Right side - 2 seats */
    phg-seat[data-seat="3"] {
      top: 45%;
      right: 0;
    }
    phg-seat[data-seat="4"] {
      bottom: 15%;
      right: 1%;
    }

    phg-seat[data-seat="5"] {
      bottom: 3%;
      right: 26%;
    }
    phg-seat[data-seat="6"] {
      bottom: 3%;
      left: 26%;
    }

    /* Left side - 2 seats */
    phg-seat[data-seat="7"] {
      bottom: 15%;
      left: 1%;
    }
    phg-seat[data-seat="8"] {
      top: 45%;
      left: 0;
    }

    /* === HEADS UP (2 seats) === */
    #seats[data-table-size="2"] phg-seat[data-seat="0"] {
      top: auto;
      bottom: 3%;
      left: 50%;
      transform: translateX(-50%);
    }
    #seats[data-table-size="2"] phg-seat[data-seat="1"] {
      top: 12%;
      left: 50%;
      transform: translateX(-50%);
    }

    /* === 6-MAX (6 seats) === */
    #seats[data-table-size="6"] phg-seat[data-seat="0"] {
      top: 22%;
      left: 3%;
    }
    #seats[data-table-size="6"] phg-seat[data-seat="1"] {
      top: 12%;
      left: 50%;
      transform: translateX(-50%);
    }
    #seats[data-table-size="6"] phg-seat[data-seat="2"] {
      top: 22%;
      right: 3%;
    }
    #seats[data-table-size="6"] phg-seat[data-seat="3"] {
      top: auto;
      bottom: 18%;
      right: 3%;
    }
    #seats[data-table-size="6"] phg-seat[data-seat="4"] {
      top: auto;
      bottom: 3%;
      left: 50%;
      transform: translateX(-50%);
    }
    #seats[data-table-size="6"] phg-seat[data-seat="5"] {
      top: auto;
      bottom: 18%;
      left: 3%;
    }
  }

  /* === MOBILE LAYOUT === */
  @media (width < 800px) {
    phg-seat[data-seat="0"] {
      top: 22%;
      left: 0;
    }
    phg-seat[data-seat="1"] {
      top: 10%;
      left: 50%;
      transform: translateX(-50%);
    }
    phg-seat[data-seat="2"] {
      top: 22%;
      right: 0;
    }

    /* Right side */
    phg-seat[data-seat="3"] {
      top: 38%;
      right: 0;
    }
    phg-seat[data-seat="4"] {
      bottom: 28%;
      right: 0;
    }

    phg-seat[data-seat="5"] {
      bottom: 5%;
      right: 8%;
    }
    phg-seat[data-seat="6"] {
      bottom: 5%;
      left: 8%;
    }

    /* Left side */
    phg-seat[data-seat="7"] {
      bottom: 28%;
      left: 0;
    }
    phg-seat[data-seat="8"] {
      top: 38%;
      left: 0;
    }

    /* === HEADS UP (2 seats) === */
    #seats[data-table-size="2"] phg-seat[data-seat="0"] {
      top: auto;
      bottom: 5%;
      left: 50%;
      transform: translateX(-50%);
    }
    #seats[data-table-size="2"] phg-seat[data-seat="1"] {
      top: 10%;
      left: 50%;
      transform: translateX(-50%);
    }

    /* === 6-MAX (6 seats) === */
    #seats[data-table-size="6"] phg-seat[data-seat="0"] {
      top: 30%;
      left: 0;
    }
    #seats[data-table-size="6"] phg-seat[data-seat="1"] {
      top: 10%;
      left: 50%;
      transform: translateX(-50%);
    }
    #seats[data-table-size="6"] phg-seat[data-seat="2"] {
      top: 30%;
      right: 0;
    }
    #seats[data-table-size="6"] phg-seat[data-seat="3"] {
      top: auto;
      bottom: 30%;
      right: 0;
    }
    #seats[data-table-size="6"] phg-seat[data-seat="4"] {
      top: auto;
      bottom: 3%;
      left: 50%;
      transform: translateX(-50%);
    }
    #seats[data-table-size="6"] phg-seat[data-seat="5"] {
      top: auto;
      bottom: 30%;
      left: 0;
    }
  }
`;
