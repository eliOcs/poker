const singleLayer = (source) => ({ source, layers: { details: undefined } });

export const AVATAR_SPRITE_SIZE = 128;

export const AVATAR_SPRITE_PARTS = {
  torso: {
    category: "Torso",
    styles: {
      torso: directLayer("Torso", { skin: "Skin", contour: "Contour" }),
    },
  },
  clothes: {
    category: "Clothes",
    styles: {
      shirt: directLayer("Clothes", { color: "Color", contour: "Contour" }),
    },
  },
  face: {
    category: "Heads",
    styles: {
      round: layeredHead("Round"),
      oval: layeredHead("Oval"),
      diamond: layeredHead("Diamond"),
      square: layeredHead("Square"),
      pear: layeredHead("Pear"),
      wide: layeredHead("Wide"),
      angular: layeredHead("Angular"),
      triangle: layeredHead("Triangle"),
      gaunt: layeredHead("Gaunt", "Gaunt"),
    },
  },
  eyes: {
    category: "Eyes",
    splitHorizontally: true,
    styles: {
      beady: singleLayer("Beans"),
      lines: singleLayer("Lines"),
      happy: singleLayer("Happy"),
      squint: singleLayer("Squint"),
      hypnotic: singleLayer("Hipnotic"),
      sleepy: layeredEyes("Sleepy"),
      sparkle: layeredEyes("Sparkle"),
      round: layeredEyes("Round"),
      lashes: layeredEyes("Lashes", "Irish color"),
    },
  },
  eyebrows: {
    category: "Eye brows",
    splitHorizontally: true,
    styles: {
      none: undefined,
      soft: singleLayer("Soft"),
      straight: singleLayer("Straight"),
      hairy: singleLayer("Hairy"),
      thick: singleLayer("Thick"),
      slanted: singleLayer("Slanted"),
    },
  },
  nose: {
    category: "Noses",
    styles: {
      none: undefined,
      l: singleLayer("L"),
      c: singleLayer("C"),
      d: singleLayer("d"),
      v: singleLayer("v"),
      holes: singleLayer("Holes"),
      big: singleLayer("Big"),
      u: singleLayer("U"),
      thick: singleLayer("Thick"),
      pig: singleLayer("Pig"),
    },
  },
  mouth: {
    category: "Mouths",
    styles: {
      happy: singleLayer("Happy"),
      smile: layeredMouth("Smile", { tongue: "Tongue" }),
      straight: singleLayer("Straight"),
      kiss: singleLayer("Kiss"),
      kawai: singleLayer("Kawai"),
      skull: singleLayer("Skull"),
      frontTooth: layeredMouth("Front Tooth", { teeth: "Teeth" }),
      teeth: layeredMouth("Teeth", { teeth: "Teeth" }),
      sad: singleLayer("Sad"),
      openMouth: singleLayer("Open mouth"),
      lips: layeredMouth("Lips", { color: "Color" }),
      angry: {
        source: "Angry",
        layers: { teeth: "Teeth", details: "Angry" },
      },
    },
  },
  ears: {
    category: "Ears",
    styles: {
      none: undefined,
      small: layeredSkin("small"),
      big: layeredSkin("Big"),
      pointy: layeredSkin("Pointy"),
      wide: layeredSkin("Wide"),
    },
  },
  hair: {
    category: "Hair",
    styles: {
      none: undefined,
      shortCurly: layeredHair("Short Curly"),
      old: singleLayer("Old"),
      shortHigh: singleLayer("Short high"),
      shortClassic: layeredHair("Short Classic", "Foreground"),
      nerd: singleLayer("Nerd"),
      long1: layeredHair("Long 1"),
      long2: layeredHair("Long 2"),
      medi: layeredHair("Medi"),
      buzz: singleLayer("Buzz"),
    },
  },
  facialHair: {
    category: "Facial Hair",
    styles: {
      none: undefined,
      pencil: singleLayer("Pencil"),
      neckbeard: singleLayer("Neckbeard"),
      sideburns: singleLayer("Sideburns"),
      beard: layeredHair("Beard"),
      beardCurly: layeredHair("Beard Curly"),
      moustache: singleLayer("Moutache"),
      dali: singleLayer("Dali"),
      goatee: layeredHair("Goatee"),
      kungFu: singleLayer("Kung fu"),
    },
  },
};

export const COLORABLE_EYE_TYPES = ["round", "lashes", "sparkle", "sleepy"];

export const PART_ADJUSTMENTS = {
  torso: { positionStep: 0, rotationStep: 0, sizeStep: 0 },
  clothes: { positionStep: 0, rotationStep: 0, sizeStep: 0 },
  face: {
    positionStep: 3,
    horizontalPositionStep: 3,
    rotationStep: Math.PI / 36,
    sizeStep: 0.055,
  },
  eyes: {
    paired: true,
    positionStep: 3,
    spacingStep: 4,
    rotationStep: Math.PI / 36,
    sizeStep: 0.12,
  },
  eyebrows: {
    paired: true,
    positionStep: 3,
    spacingStep: 4,
    rotationStep: 0,
    sizeStep: 0.1,
  },
  nose: {
    positionStep: 3,
    horizontalPositionStep: 3,
    rotationStep: 0,
    sizeStep: 0.12,
  },
  mouth: {
    positionStep: 3,
    horizontalPositionStep: 3,
    rotationStep: 0,
    sizeStep: 0.12,
  },
  ears: {
    paired: true,
    positionStep: 3,
    spacingStep: 4,
    rotationStep: 0,
    sizeStep: 0.1,
  },
  hair: { positionStep: 3, rotationStep: 0, sizeStep: 0.08 },
  facialHair: {
    preserveSourcePosition: true,
    positionStep: 3,
    horizontalPositionStep: 3,
    rotationStep: 0,
    sizeStep: 0.1,
  },
};

export function getAvatarSpriteTypes(partId) {
  const part = AVATAR_SPRITE_PARTS[partId];
  if (!part) throw new Error(`Unknown avatar sprite part: ${partId}`);
  return Object.keys(part.styles);
}

function layeredHead(source, contour = "Contour") {
  return { source, layers: { skin: "Skin", contour } };
}

function layeredEyes(source, iris = "Iris") {
  return {
    source,
    layers: { sclera: "Sclera", iris, contour: "Contour" },
  };
}

function layeredMouth(source, fill) {
  return { source, layers: { ...fill, contour: "Contour" } };
}

function layeredSkin(source) {
  return { source, layers: { skin: "Skin", contour: "Contour" } };
}

function layeredHair(source, foreground = "Foregound") {
  return {
    source,
    layers: { background: "Background", foreground },
  };
}

function directLayer(source, layers) {
  return { source, direct: true, layers };
}
