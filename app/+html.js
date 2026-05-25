import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering (expo export).
export default function HTML({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Disable body scrolling on web to match native ScrollView feel */}
        <ScrollViewStyleReset />

        {/* Set browser tab title tag dynamically */}
        <title>lamon.go</title>
        <meta name="description" content="lamon.go - brand new food tracker and buddy vault" />
      </head>
      <body>{children}</body>
    </html>
  );
}
