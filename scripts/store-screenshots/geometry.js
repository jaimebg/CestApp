/**
 * Layout maths for a framed device on a store tile.
 *
 * The whole point of this module is that the frame is derived from the capture,
 * never the other way round. The previous template gave the frame fixed
 * percentages of the canvas and then `object-fit: cover`-ed the capture into it,
 * which sliced ~13% off the top and bottom of every phone shot. Here the screen
 * is built at the capture's exact aspect ratio, so nothing is ever cropped.
 *
 * Pure functions: no DOM, no filesystem, no CSS.
 */

/**
 * Largest device that fits `stage` while keeping `screenAspect` exactly.
 *
 * The bezel is a fraction of the device's own width, so a tile of any size gets
 * proportionally the same frame. That makes the height a linear function of the
 * width and the fit a closed form rather than a search:
 *
 *   screenW = W · (1 - 2r)
 *   screenH = screenW / a
 *   H       = screenH + 2rW = W · [ (1 - 2r)/a + 2r ]
 *
 * @param {object} input
 * @param {number} input.stageWidth   Available width in output pixels.
 * @param {number} input.stageHeight  Available height in output pixels.
 * @param {number} input.screenAspect Capture width / capture height.
 * @param {number} input.bezelRatio   Bezel thickness as a fraction of device width.
 * @returns {{deviceWidth:number, deviceHeight:number, bezel:number,
 *            screenWidth:number, screenHeight:number}}
 */
export function fitDevice({ stageWidth, stageHeight, screenAspect, bezelRatio }) {
  if (!(stageWidth > 0) || !(stageHeight > 0)) {
    throw new Error(`fitDevice: stage must be positive, got ${stageWidth}x${stageHeight}`);
  }
  if (!(screenAspect > 0)) {
    throw new Error(`fitDevice: screenAspect must be positive, got ${screenAspect}`);
  }
  if (!(bezelRatio >= 0) || bezelRatio >= 0.5) {
    throw new Error(`fitDevice: bezelRatio must be within [0, 0.5), got ${bezelRatio}`);
  }

  const inner = 1 - 2 * bezelRatio;
  const heightPerWidth = inner / screenAspect + 2 * bezelRatio;
  const deviceWidth = Math.min(stageWidth, stageHeight / heightPerWidth);

  return {
    deviceWidth,
    deviceHeight: deviceWidth * heightPerWidth,
    bezel: deviceWidth * bezelRatio,
    screenWidth: deviceWidth * inner,
    screenHeight: (deviceWidth * inner) / screenAspect,
  };
}

/**
 * Where the device stands on the tile, given fractional insets.
 *
 * Insets are fractions of the canvas so a slot's proportions survive any output
 * size. The device is centred horizontally and vertically within what is left.
 */
export function stageBox({ width, height, insets }) {
  const stageWidth = width * (1 - insets.left - insets.right);
  const stageHeight = height * (1 - insets.top - insets.bottom);
  return {
    stageWidth,
    stageHeight,
    stageLeft: width * insets.left,
    stageTop: height * insets.top,
  };
}

/**
 * Vertical split of the screen into the synthetic status bar and the capture
 * below it. The capture's own status bar occupies `statusStrip` of its
 * `rawHeight` pixels and is cropped away; the synthetic bar takes exactly that
 * much of the rendered screen, so the device's aspect ratio is unchanged.
 */
export function screenBands({ screenWidth, screenHeight, rawHeight, statusStrip }) {
  if (statusStrip < 0 || statusStrip >= rawHeight) {
    throw new Error(`screenBands: statusStrip ${statusStrip} outside raw height ${rawHeight}`);
  }
  const statusBarHeight = screenHeight * (statusStrip / rawHeight);
  return {
    statusBarHeight,
    shotWindowHeight: screenHeight - statusBarHeight,
    /** The capture is drawn at full size and pulled up so its own bar is hidden. */
    shotRenderedHeight: screenHeight,
    shotRenderedWidth: screenWidth,
    shotOffsetY: -statusBarHeight,
  };
}
