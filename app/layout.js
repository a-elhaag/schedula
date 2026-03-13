import "./globals.css";

export const metadata = {
  title: "Schedula - Component Library",
  description: "Component showcase and library for Schedula",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
