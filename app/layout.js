import "./globals.css";

export const metadata = {
  title: "Schedula - Schedule Management",
  description: "Schedule management system for institutions",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
