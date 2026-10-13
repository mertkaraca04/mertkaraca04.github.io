# Mert Karaca portfolio site

Static GitHub Pages site. No build step, no frameworks: plain HTML, CSS and JavaScript.

## Layout
- `index.html`, `style.css`: the portfolio (About, Projects, Experience, Education, Skills, Contact). Dark mode toggle, scroll-reveal animation.
- `Mert_Karaca_CV.pdf`: the CV linked from the "Download CV" button.
- `convertlab/`: ConvertLab unit converter (`index.html`, `style.css`, `app.js`), published at `/convertlab/`.

## Rules
- Keep it plain HTML/CSS/JS. Pages must work at 320px width with no sideways scrolling.
- Keep light and dark themes both readable.
- ConvertLab maths lives in `convertlab/app.js` and runs in Node as well as the browser (`node -e 'require("./app.js")'`), so test conversions there before committing.
- Never put confidential employer data (Akbank internal figures, screenshots) on this public site. Public CBRT EVDS data and own model outputs only.
- Commit small and often, with a clear message.
