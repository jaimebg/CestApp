import { BRAND, dataUri, fontFaces, LOGO } from './theme.js';

/**
 * Play Store listing icon, 512x512.
 *
 * `cestapp-logo.png` is already a full-bleed square with its own cream ground
 * and no alpha, so it is the icon — inset it on another cream field and the
 * basket just shrinks inside a halo of the same colour.
 */
export function iconHtml() {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html,
      body {
        width: 512px;
        height: 512px;
        overflow: hidden;
        background: ${BRAND.cream};
      }
      img {
        width: 512px;
        height: 512px;
        display: block;
      }
    </style>
  </head>
  <body>
    <img src="${dataUri(LOGO, 'image/png')}" />
  </body>
</html>`;
}

/**
 * Play Store feature graphic, 1024x500.
 *
 * Play crops this asset differently across placements, so the mark and wordmark
 * stay well inside the edges. The logo carries its own cream ground; rounding
 * and a shadow are all it needs to read as an app tile.
 */
export function featureGraphicHtml() {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      ${fontFaces()}
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html,
      body {
        width: 1024px;
        height: 500px;
        overflow: hidden;
        -webkit-font-smoothing: antialiased;
      }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 60px;
        padding: 0 84px;
        font-family: 'Inter', sans-serif;
        background:
          radial-gradient(58% 74% at 14% 8%, rgba(174, 209, 124, 0.5), rgba(174, 209, 124, 0) 66%),
          radial-gradient(56% 72% at 94% 100%, rgba(9, 24, 3, 0.42), rgba(9, 24, 3, 0) 70%),
          linear-gradient(118deg, #3f7024 0%, ${BRAND.deep} 34%, #2c5417 100%);
      }
      .mark {
        flex: 0 0 auto;
        width: 204px;
        height: 204px;
        border-radius: 46px;
        display: block;
        box-shadow:
          0 16px 40px rgba(9, 24, 3, 0.42),
          0 0 0 1px rgba(255, 255, 255, 0.14);
      }
      .copy {
        flex: 0 1 auto;
      }
      .wordmark {
        font-weight: 700;
        font-size: 102px;
        line-height: 1;
        letter-spacing: -0.036em;
        color: #ffffff;
      }
      .rule {
        width: 92px;
        height: 6px;
        border-radius: 6px;
        margin: 24px 0 22px;
        background: ${BRAND.golden};
      }
      .subline {
        font-weight: 500;
        font-size: 30px;
        line-height: 1.3;
        letter-spacing: -0.005em;
        color: rgba(255, 253, 225, 0.88);
      }
    </style>
  </head>
  <body>
    <img class="mark" src="${dataUri(LOGO, 'image/png')}" />
    <div class="copy">
      <div class="wordmark">CestApp</div>
      <div class="rule"></div>
      <div class="subline">
        Esc&aacute;ner de tickets &middot; Receipt scanner<br />Todo en tu m&oacute;vil &middot; All
        on your phone
      </div>
    </div>
  </body>
</html>`;
}
