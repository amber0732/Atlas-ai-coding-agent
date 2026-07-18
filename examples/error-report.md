# Example Error Report

Project type: Next.js + TypeScript

Problem:

After deploying, I see a hydration mismatch on the dashboard page.

Error:

```text
Error: Hydration failed because the initial UI does not match what was rendered on the server.
```

What I changed recently:

- Added a timestamp to the `UserProfile` component.
- Added code that reads `localStorage` during render.

Expected:

The page should render without hydration warnings and remain interactive.

