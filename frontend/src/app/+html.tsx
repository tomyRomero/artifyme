import { ScrollViewStyleReset } from 'expo-router/html';

// The page around the app on the web, rendered ahead of time without a browser
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* Pinch-zoom stays on, for anyone who needs things bigger */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* Lets the app's scroll views scroll, rather than the page */}
        <ScrollViewStyleReset />
        {/* The canvas color before the app loads, so dark mode doesn't flash white */}
        <style dangerouslySetInnerHTML={{ __html: background }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const background = `
body {
  background-color: #F5F3FF;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #0D0B1E;
  }
}`;
