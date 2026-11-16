// Settings of the guided activity. This is the only file to edit after the Google Sheet is connected.
window.GUIDED_CONFIG = {
  // The web-app address of the Google Apps Script (it ends with /exec). See guided/README.md.
  // While it is empty, every student's work stays on their own device and is sent the first time the
  // page is opened after the address is filled in. Nothing is lost.
  endpoint: 'https://script.google.com/macros/s/AKfycbwlz5cA61SBwao0iexUyqjBgp60cYd8C3FzpTNCc_NmY9eCEJX7JnHgb-_TOiYoqBu_/exec',

  // Points taken off for every wrong answer on a step (a hint's price is written on its button).
  wrongCost: 1,

  // A solved step is always worth at least this many points; "show solution" is worth 0.
  minSolved: 1,

  // Wrong answers after which "show solution" is offered.
  revealAfterWrong: 3
};
