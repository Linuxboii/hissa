# Hissa

Split shared expenses, settle in the fewest payments.

**Live:** https://hissa.avlokai.com

**For:** Friends on a trip, flatmates and teams sharing a bill.

## What it does

- Add people and expenses, split among everyone or a subset
- Integer-cent maths, remainders spread fairly
- Settle-up in at most n-1 payments
- Copy a summary for a group chat
- The whole group is encoded in a share link, no account or server

State lives in localStorage and in the URL fragment, which browsers never send to the server.

## Demand

Splitwise reported tens of millions of registered users, and its Android app lists about 31 million installs.

- [Yespress: Splitwise company profile](https://yespress.io/splitwise-inc)
- [AppGoblin: Splitwise Android](https://appgoblin.info/apps/com.Splitwise.SplitwiseMobile)

These figures measure demand for the task, from existing tools. They are third-party estimates or company claims, not usage of this tool.

## Privacy

Everything runs in your browser. There is no backend, no analytics and no account. Nothing you enter is uploaded.

## Run locally

No build step and no runtime dependencies. Serve the folder with any static server:

```
npx serve .
```

## Tests

The logic lives in `lib.js` as pure functions, tested with the Node test runner (Node 20+):

```
npm test
```

## Files

- `index.html` page and styles
- `app.js` wiring between the page and the logic
- `lib.js` pure logic, no DOM
- `lib.test.js` tests
- `base.css`, `ui.js` shared look and small DOM helpers

## Licence

MIT. Made by [Sushanth Kasturi](https://sushanth.avlokai.com).
